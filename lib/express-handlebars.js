'use strict';

var Promise = global.Promise || require('promise');

var glob       = require('glob'),
    Handlebars = require('handlebars'),
    fs         = require('graceful-fs'),
    path       = require('path'),
    semver     = require('semver'),
    utils      = require('./utils');

module.exports = ExpressHandlebars;

// -----------------------------------------------------------------------------

function ExpressHandlebars(config) {
    config || (config = {});

    this.handlebars  = config.handlebars  || this.handlebars;
    this.extname     = config.extname     || this.extname;
    this.layoutsDir  = config.layoutsDir  || this.layoutsDir;
    this.partialsDir = config.partialsDir || this.partialsDir;

    this.handlebarsVersion =
            ExpressHandlebars.getHandlebarsSemver(this.handlebars);

    if (this.extname.charAt(0) !== '.') {
        this.extname = '.' + this.extname;
    }

    this.defaultLayout = config.defaultLayout;
    this.helpers       = config.helpers;

    this.compiled    = {};
    this.precompiled = {};

    this.engine = this.renderView.bind(this);
}

ExpressHandlebars._fsCache = {};

ExpressHandlebars.getHandlebarsSemver = function (handlebars) {
    var version = handlebars.VERSION || '';

    // Makes sure the Handlebars version is a valid semver.
    if (version && !semver.valid(version)) {
        version = version.replace(/(\d\.\d)\.(\D.*)/, '$1.0-$2');
    }

    return version;
};

ExpressHandlebars.prototype.handlebars  = Handlebars;
ExpressHandlebars.prototype.extname     = '.handlebars';
ExpressHandlebars.prototype.layoutsDir  = 'views/layouts/';
ExpressHandlebars.prototype.partialsDir = 'views/partials/';

ExpressHandlebars.prototype.compileTemplate = function (template, options) {
    options || (options = {});

    var compiler = options.precompiled ? 'precompile' : 'compile',
        compile  = this.handlebars[compiler];

    return compile(template);
};

ExpressHandlebars.prototype.getPartials = function (options) {
    options || (options = {});

    var partialsDirs = Array.isArray(this.partialsDir) ?
            this.partialsDir : [this.partialsDir];

    partialsDirs = partialsDirs.map(function (dir) {
        var namespace;

        // Support `partialsDir` collection with object entries that contain a
        // namespace.
        if (dir && typeof dir !== 'string') {
            namespace = dir.namespace;
            dir       = dir.dir;
        }

        return this.getTemplates(dir, options).then(function (templates) {
            return {
                templates: templates,
                namespace: namespace
            };
        });
    }, this);

    return Promise.all(partialsDirs).then(function (dirs) {
        var getPartialName = this._getPartialName.bind(this);

        return dirs.reduce(function (partials, dir) {
            var templates = dir.templates,
                namespace = dir.namespace,
                filePaths = Object.keys(templates);

            filePaths.forEach(function (filePath) {
                var partialName = getPartialName(filePath, namespace);
                partials[partialName] = templates[filePath];
            });

            return partials;
        }, {});
    }.bind(this));
};

ExpressHandlebars.prototype.getTemplate = function (filePath, options) {
    filePath = path.resolve(filePath);
    options || (options = {});

    var precompiled = options.precompiled,
        cache       = precompiled ? this.precompiled : this.compiled,
        template    = options.cache && cache[filePath];

    if (template) {
        return template;
    }

    // Optimistically cache template promise to reduce file system I/O, but
    // remove from cache if there was a problem.
    template = cache[filePath] = this._getFile(filePath, options)
        .then(function (file) {
            return this.compileTemplate(file, options);
        }.bind(this));

    return template.catch(function (err) {
        delete cache[filePath];
        throw err;
    });
};

ExpressHandlebars.prototype.getTemplates = function (dirPath, options) {
    options || (options = {});

    return this._getDir(dirPath, options).then(function (filePaths) {
        var templates = filePaths.map(function (filePath) {
            return this.getTemplate(path.join(dirPath, filePath), options);
        }, this);

        return Promise.all(templates).then(function (templates) {
            return filePaths.reduce(function (map, filePath, i) {
                map[filePath] = templates[i];
                return map;
            }, {});
        });
    }.bind(this));
};

ExpressHandlebars.prototype.render = function (filePath, context, options) {
    options || (options = {});

    // Force `precompiled` to `false` since we're rendering to HTML.
    if (options.precompiled) {
        options = utils.extend({}, options, {precompiled: false});
    }

    return Promise.all([
        this.getTemplate(filePath, options),
        options.partials || this.getPartials(options)
    ]).then(function (templates) {
        var template = templates[0],
            partials = templates[1],
            data     = options.data;

        var helpers = options.helpers ||
                utils.extend({}, this.handlebars.helpers, this.helpers);

        return this._renderTemplate(template, context, {
            data    : data,
            helpers : helpers,
            partials: partials
        });
    }.bind(this));
};

ExpressHandlebars.prototype.renderView = function (viewPath, options, callback) {
    var context = options,
        data    = options.data;

    var helpers = utils.extend({},
            this.handlebars.helpers, this.helpers, options.helpers);

    // Pluck-out ExpressHandlebars-specific options.
    options = {
        cache      : options.cache,
        layout     : 'layout' in options ? options.layout : this.defaultLayout,
        precompiled: false
    };

    // Extend `options` with Handlebars-specific rendering options.
    utils.extend(options, {
        data    : data,
        helpers : helpers,
        partials: this.getPartials(options)
    });

    this.render(viewPath, context, options)
        .then(function (body) {
            var layoutPath = this._resolveLayoutPath(options.layout);

            if (layoutPath) {
                context = utils.extend({}, context, {body: body});
                return this.render(layoutPath, context, options);
            }

            return body;
        }.bind(this))
        .then(utils.passValue(callback))
        .catch(utils.passError(callback));
};

ExpressHandlebars.prototype._getDir = function (dirPath, options) {
    dirPath = path.resolve(dirPath);

    var cache = ExpressHandlebars._fsCache,
        dir   = options.cache && cache[dirPath];

    if (dir) {
        return dir.then(function (dir) {
            return dir.concat();
        });
    }

    var pattern = '**/*' + this.extname;

    // Optimistically cache dir promise to reduce file system I/O, but remove
    // from cache if there was a problem.
    dir = cache[dirPath] = new Promise(function (resolve, reject) {
        glob(pattern, {cwd: dirPath}, function (err, dir) {
            if (err) {
                reject(err);
            } else {
                resolve(dir);
            }
        });
    });

    return dir.then(function (dir) {
        return dir.concat();
    }).catch(function (err) {
        delete cache[dirPath];
        throw err;
    });
};

ExpressHandlebars.prototype._getFile = function (filePath, options) {
    filePath = path.resolve(filePath);

    var cache = ExpressHandlebars._fsCache,
        file  = options.cache && cache[filePath];

    if (file) {
        return file;
    }

    // Optimistically cache file promise to reduce file system I/O, but remove
    // from cache if there was a problem.
    file = cache[filePath] = new Promise(function (resolve, reject) {
        fs.readFile(filePath, 'utf8', function (err, file) {
            if (err) {
                reject(err);
            } else {
                resolve(file);
            }
        });
    });

    return file.catch(function (err) {
        delete cache[filePath];
        throw err;
    });
};

ExpressHandlebars.prototype._getPartialName = function (filePath, namespace) {
    var extRegex = new RegExp(this.extname + '$'),
        name     = filePath.replace(extRegex, ''),
        version  = this.handlebarsVersion;

    if (namespace) {
        name = namespace + '/' + name;
    }

    // Fixes a Handlebars bug in versions prior to 1.0.rc.2 which caused
    // partials with "/"s in their name to not be found.
    // https://github.com/wycats/handlebars.js/pull/389
    if (version && !semver.satisfies(version, '>=1.0.0-rc.2')) {
        name = name.replace(/\//g, '.');
    }

    return name;
};

ExpressHandlebars.prototype._renderTemplate = function (template, context, options) {
    return template(context, options);
};

ExpressHandlebars.prototype._resolveLayoutPath = function (layoutPath) {
    if (!layoutPath) {
        return null;
    }

    if (!path.extname(layoutPath)) {
        layoutPath += this.extname;
    }

    if (layoutPath.charAt(0) !== '/') {
        layoutPath = path.join(this.layoutsDir, layoutPath);
    }

    return layoutPath;
};
