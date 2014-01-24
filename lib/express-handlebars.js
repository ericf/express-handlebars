var async  = require('async'),
    fs     = require('fs'),
    glob   = require('glob'),
    path   = require('path'),
    semver = require('semver');

// -- Utilites -----------------------------------------------------------------

function extend(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
        if (!source) { return; }

        for (var key in source) {
            obj[key] = source[key];
        }
    });

    return obj;
}

// -- Constructor --------------------------------------------------------------

function ExpressHandlebars(config) {
    config || (config = {});

    var handlebars = config.handlebars || require('handlebars');

    if ('extname'     in config) { this.extname     = config.extname;     }
    if ('layoutsDir'  in config) { this.layoutsDir  = config.layoutsDir;  }
    if ('partialsDir' in config) { this.partialsDir = config.partialsDir; }
    
    if(this.extname[0] !== '.') { this.extname = '.' + this.extname; }
    
    this.defaultLayout = config.defaultLayout;
    this.handlebars    = handlebars;
    this.helpers       = config.helpers;

    this.handlebarsVersion = ExpressHandlebars.getHandlebarsSemver(handlebars);

    this.compiled    = {};
    this.precompiled = {};

    this.engine = this.renderView.bind(this);
}

// -- Statics ------------------------------------------------------------------

ExpressHandlebars._dirCache     = {};
ExpressHandlebars._fileCache    = {};
ExpressHandlebars._pendingReads = {};

ExpressHandlebars.getHandlebarsSemver = function (handlebars) {
    var version = handlebars.VERSION || '';

    // Makes sure the Handlebars version is a valid semver.
    if (version && !semver.valid(version)) {
        version = version.replace(/(\d\.\d)\.(\D.*)/, '$1.0-$2');
    }

    return version;
};

// -- Prototype ----------------------------------------------------------------

extend(ExpressHandlebars.prototype, {
    // -- Public Properties ----------------------------------------------------

    extname    : '.handlebars',
    layoutsDir : 'views/layouts/',
    partialsDir: 'views/partials/',

    // -- Public Methods -------------------------------------------------------

    loadPartials: function (options, callback) {
        if (arguments.length < 2 && typeof options === 'function') {
            callback = options;
            options  = {};
        }

        options || (options = {});

        function load(dirs, options, callback) {
            Array.isArray(dirs) || (dirs = [dirs]);
            var loadTemplates = this.loadTemplates.bind(this);

            async.map(dirs, function (dir, callback) {
                loadTemplates(dir, options, callback);
            }, callback);
        }

        function mapPartials(dirs, callback) {
            var getPartialName = this._getPartialName.bind(this),
                partials;

            partials = dirs.reduce(function (partials, templates) {
                Object.keys(templates).forEach(function (filePath) {
                    partials[getPartialName(filePath)] = templates[filePath];
                });

                return partials;
            }, {});

            callback(null, partials);
        }

        async.waterfall([
            load.bind(this, this.partialsDir, options),
            mapPartials.bind(this)
        ], callback);
    },

    loadTemplate: function (filePath, options, callback) {
        filePath = path.resolve(filePath);

        if (arguments.length < 3 && typeof options === 'function') {
            callback = options;
            options  = {};
        }

        options || (options = {});

        var precompiled = options.precompiled,
            cache       = precompiled ? this.precompiled : this.compiled,
            template    = options.cache && cache[filePath],
            compile;

        if (template) {
            callback(null, template);
            return;
        }

        compile = this.handlebars[precompiled ? 'precompile' : 'compile'];

        this._loadFile(filePath, options, function (err, file) {
            if (err) { return callback(err); }

            try {
                template = cache[filePath] = compile(file);
                callback(null, template);
            } catch (ex) {
                callback(ex);
            }
        });
    },

    loadTemplates: function (dirPath, options, callback) {
        if (arguments.length < 3 && typeof options === 'function') {
            callback = options;
            options  = {};
        }

        options || (options = {});

        function load(filePath, callback) {
            this.loadTemplate(path.join(dirPath, filePath), options, callback);
        }

        function mapTemplates(filePaths, callback) {
            async.map(filePaths, load.bind(this), function (err, templates) {
                if (err) { return callback(err); }

                var map = filePaths.reduce(function (map, filePath, i) {
                    map[filePath] = templates[i];
                    return map;
                }, {});

                callback(null, map);
            });
        }

        async.waterfall([
            this._loadDir.bind(this, dirPath, options),
            mapTemplates.bind(this)
        ], callback);
    },

    render: function (filePath, options, callback) {
        if (arguments.length < 3 && typeof options === 'function') {
            callback = options;
            options  = {};
        }

        options || (options = {});

        var helpers = extend({},
                    this.handlebars.helpers, this.helpers, options.helpers);

        function loadTemplates(callback) {
            async.parallel({
                partials: this.loadPartials.bind(this, options),
                template: this.loadTemplate.bind(this, filePath, options)
            }, callback);
        }

        function renderTemplate(templates, callback) {
            this._renderTemplate(templates.template, options, {
                helpers : helpers,
                partials: templates.partials
            }, callback);
        }

        // Force `{precompiled: false}` option, before passing `options` along
        // to `getPartials()` and `getTemplate()` methods.
        if (options.precompiled) {
            options = extend({}, options, {precompiled: false});
        }

        async.waterfall([
            loadTemplates.bind(this),
            renderTemplate.bind(this)
        ], callback);
    },

    renderView: function (viewPath, options, callback) {
        if (arguments.length < 3 && typeof options === 'function') {
            callback = options;
            options  = {};
        }

        options || (options = {});

        var layoutPath = this._resolveLayoutPath(options);

        function renderLayout(body, callback) {
            var context = extend({}, options, {body: body});
            this.render(layoutPath, context, callback);
        }

        // Simple render when no layout is used.
        if (!layoutPath) {
            this.render.apply(this, arguments);
            return;
        }

        // Force `{precompiled: false}` option, before passing options along to
        // `getPartials()` and `getTemplate()` methods.
        if (options.precompiled) {
            options = extend({}, options, {precompiled: false});
        }

        async.waterfall([
            this.render.bind(this, viewPath, options),
            renderLayout.bind(this)
        ], callback);
    },

    // -- Private Methods ------------------------------------------------------

    _getPartialName: function (filePath) {
        var extRegex = new RegExp(this.extname + '$'),
            name     = filePath.replace(extRegex, ''),
            version  = this.handlebarsVersion;

        // Fixes a Handlebars bug in versions prior to 1.0.rc.2 which caused
        // partials with "/"s in their name to not be found.
        // https://github.com/wycats/handlebars.js/pull/389
        if (version && !semver.satisfies(version, '>=1.0.0-rc.2')) {
            name = name.replace('/', '.');
        }

        return name;
    },

    _loadDir: function (dirPath, options, callback) {
        dirPath = path.resolve(dirPath);

        var dirCache     = ExpressHandlebars._dirCache,
            pendingReads = ExpressHandlebars._pendingReads,
            dir          = options.cache && dirCache[dirPath],
            callbacks, pattern;

        if (dir) {
            callback(null, dir.concat());
            return;
        }

        callbacks = pendingReads[dirPath];

        if (callbacks) {
            callbacks.push(callback);
            return;
        }

        callbacks = pendingReads[dirPath] = [callback];
        pattern   = '**/*' + this.extname;

        glob(pattern, {cwd: dirPath}, function (err, dir) {
            if (!err) {
                dirCache[dirPath] = dir;
            }

            while (callbacks.length) {
                callbacks.shift().call(null, err, dir && dir.concat());
            }

            delete pendingReads[dirPath];
        });
    },

    _loadFile: function (filePath, options, callback) {
        filePath = path.resolve(filePath);

        var fileCache    = ExpressHandlebars._fileCache,
            pendingReads = ExpressHandlebars._pendingReads,
            file         = options.cache && fileCache[filePath],
            callbacks;

        if (file) {
            callback(null, file);
            return;
        }

        callbacks = pendingReads[filePath];

        if (callbacks) {
            callbacks.push(callback);
            return;
        }

        callbacks = pendingReads[filePath] = [callback];

        fs.readFile(filePath, 'utf8', function (err, file) {
            if (!err) {
                fileCache[filePath] = file;
            }

            while (callbacks.length) {
                callbacks.shift().call(null, err, file);
            }

            delete pendingReads[filePath];
        });
    },

    _renderTemplate: function (template, context, options, callback) {
        var output;

        try {
            output = template(context, options);
            callback(null, output);
        } catch (ex) {
            callback(ex);
        }
    },

    _resolveLayoutPath: function (options) {
        // Makes sure to interpret falsy `options.layout` values as no layout.
        var layoutPath = 'layout' in options ? options.layout :
                this.defaultLayout;

        if (!layoutPath) {
            return null;
        }

        if (!path.extname(layoutPath)) {
            layoutPath += this.extname;
        }

        if (layoutPath[0] !== '/') {
            layoutPath = path.join(this.layoutsDir, layoutPath);
        }

        return layoutPath;
    }
});

// -- Exports ------------------------------------------------------------------

module.exports = ExpressHandlebars;
