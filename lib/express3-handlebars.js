var async = require('async'),
    fs    = require('fs'),
    glob  = require('glob'),
    path  = require('path');

function extend(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
        if (!source) { return; }

        for (var key in source) {
            obj[key] = source[key];
        }
    });

    return obj;
}

function ExpressHandlebars(config) {
    config || (config = {});

    this.handlebars = config.handlebars || require('handlebars');

    this.defaultLayout = config.defaultLayout;
    this.extname       = config.extname || this.extname;
    this.helpers       = extend({}, this.handlebars.helpers, config.helpers);
    this.layoutsDir    = config.layoutsDir || this.layoutsDir;
    this.partialsDir   = config.partialsDir || this.partialsDir;

    this.compiled    = {};
    this.precompiled = {};

    this.engine = this.renderView.bind(this);
}

ExpressHandlebars._dirCache     = {};
ExpressHandlebars._fileCache    = {};
ExpressHandlebars._pendingReads = {};

extend(ExpressHandlebars.prototype, {
    // -- Public Properties ----------------------------------------------------

    extname    : '.handlebars',
    layoutsDir : 'views/layouts/',
    partialsDir: 'views/partials/',

    // -- Public Methods -------------------------------------------------------

    getPartials: function (options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }

        options || (options = {});

        var partialsDir = this.partialsDir;

        function getPartial(filePath, callback) {
            filePath = path.join(partialsDir, filePath);
            this.getTemplate(filePath, options, callback);
        }

        function mapPartials(dir, callback) {
            var extRegex    = new RegExp(this.extname + '$'),
                partialsMap = {};

            async.map(dir, getPartial.bind(this), function (err, partials) {
                if (err) { return callback(err); }

                dir.forEach(function (filePath, i) {
                    var name = filePath.replace(extRegex, '');

                    // HACK: Fix for Handlebars bug:
                    // https://github.com/wycats/handlebars.js/pull/389
                    name = name.replace('/', '.');

                    partialsMap[name] = partials[i];
                });

                callback(null, partialsMap);
            });
        }

        async.waterfall([
            this._getDir.bind(this, partialsDir, options),
            mapPartials.bind(this)
        ], callback);
    },

    getTemplate: function (filePath, options, callback) {
        if (typeof options === 'function') {
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

        this._getFile(filePath, options, function (err, file) {
            if (err) { return callback(err); }

            try {
                template = cache[filePath] = compile(file);
                callback(null, template);
            } catch (err) {
                callback(err);
            }
        });
    },

    render: function (filePath, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }

        options || (options = {});

        function renderTemplate(err, templates) {
            if (err) { return callback(err); }

            var context  = options,
                helpers  = this.helpers,
                partials = templates.partials,
                template = templates.template,
                output;

            try {
                output = template(context, {
                    helpers : helpers,
                    partials: partials
                });

                callback(null, output);
            } catch (err) {
                callback(err);
            }
        }

        async.parallel({
            partials: this.getPartials.bind(this, options),
            template: this.getTemplate.bind(this, filePath, options)
        }, renderTemplate.bind(this));
    },

    renderView: function (viewPath, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }

        options || (options = {});

        var layoutPath = 'layout' in options ? options.layout :
                this.defaultLayout;

        // Simple render when no layout is used.
        if (!layoutPath) {
            this.render.apply(this, arguments);
            return;
        }

        if (!path.extname(layoutPath)) {
            layoutPath += this.extname;
        }

        if (layoutPath[0] !== '/') {
            layoutPath = path.join(this.layoutsDir, layoutPath);
        }

        function renderLayout(body, callback) {
            var context = extend({}, options, {body: body});
            this.render(layoutPath, context, callback);
        }

        async.waterfall([
            this.render.bind(this, viewPath, options),
            renderLayout.bind(this)
        ], callback);
    },

    // -- Private Methods ------------------------------------------------------

    _getDir: function (dirPath, options, callback) {
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

    _getFile: function (filePath, options, callback) {
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
    }
});

// -- Exports ------------------------------------------------------------------

function exphbs(config) {
    return exphbs.create(config).engine;
}

exphbs.create = function (config) {
    return new ExpressHandlebars(config);
};

exphbs.ExpressHandlebars = ExpressHandlebars;

module.exports = exphbs;
