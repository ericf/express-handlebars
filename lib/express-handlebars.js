'use strict';

var Promise = global.Promise || require('promise');

var fs         = require('fs'),
    path       = require('path'),
    glob       = require('glob'),
    Handlebars = require('handlebars'),
    semver     = require('semver'),
    utils      = require('./utils');

module.exports = ExpressHandlebars;

// -----------------------------------------------------------------------------

function ExpressHandlebars(config) {
    config || (config = {});

    if ('handlebars'  in config) { this.handlebars  = config.handlebars;  }
    if ('extname'     in config) { this.extname     = config.extname;     }
    if ('layoutsDir'  in config) { this.layoutsDir  = config.layoutsDir;  }
    if ('partialsDir' in config) { this.partialsDir = config.partialsDir; }

    if (this.extname.charAt(0) !== '.') {
        this.extname = '.' + this.extname;
    }

    this.defaultLayout = config.defaultLayout;
    this.helpers       = config.helpers;

    this.handlebarsVersion =
            ExpressHandlebars.getHandlebarsSemver(this.handlebars);

    this.compiled    = {};
    this.precompiled = {};

    this.engine = this.renderView.bind(this);
}

ExpressHandlebars._dirCache  = {};
ExpressHandlebars._fileCache = {};

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

ExpressHandlebars.prototype.getPartials = function (options) {
    options || (options = {});

    var partialsDirs = Array.isArray(this.partialsDir) ?
            this.partialsDir : [this.partialsDir];

    partialsDirs = partialsDirs.map(function (dir) {
        return this.getTemplates(dir, options);
    }, this);

    return Promise.all(partialsDirs).then(function (dirs) {
        var getPartialName = this._getPartialName.bind(this);

        return dirs.reduce(function (partials, templates) {
            Object.keys(templates).forEach(function (filePath) {
                partials[getPartialName(filePath)] = templates[filePath];
            });

            return partials;
        }, {});
    }.bind(this));
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

ExpressHandlebars.prototype.render = function (filePath, options) {
    options || (options = {});

    // Force `precompiled` to `false` since we're rendering to HTML.
    if (options.precompiled) {
        options = utils.extend({}, options, {precompiled: false});
    }

    return Promise.all([
        this.getTemplate(filePath, options),
        this.getPartials(options)
    ]).then(function (templates) {
        var template = templates[0],
            partials = templates[1];

        var helpers = utils.extend({},
                this.handlebars.helpers, this.helpers, options.helpers);

        return template(options, {
            helpers : helpers,
            partials: partials
        });
    }.bind(this));
};

ExpressHandlebars.prototype.renderView = function (viewPath, options, callback) {
    this.render(viewPath, options)
        .then(function (body) {
            var layoutPath = 'layout' in options ? options.layout :
                    this.defaultLayout;

            layoutPath = this._resolveLayoutPath(layoutPath);

            if (layoutPath) {
                options = utils.extend({}, options, {body: body});
                return this.render(layoutPath, options);
            }
        }.bind(this))
        .then(utils.passValue(callback))
        .catch(utils.passError(callback));
};

ExpressHandlebars.prototype._getDir = function (dirPath, options) {
    dirPath = path.resolve(dirPath);

    var dirCache = ExpressHandlebars._dirCache,
        dir      = options.cache && dirCache[dirPath];

    if (dir) {
        return dir.then(function (dir) {
            return dir.concat();
        });
    }

    var pattern = '**/*' + this.extname;

    // Optimistically cache dir promise to reduce file system I/O, but remove
    // from cache if there was a problem.
    dir = dirCache[dirPath] = new Promise(function (resolve, reject) {
        glob(pattern, {cwd: dirPath}, function (err, dir) {
            if (err) {
                reject(err);
            } else {
                resolve(dir);
            }
        });
    });

    return dir.catch(function (err) {
        delete dirCache[dirPath];
        throw err;
    }).then(function (dir) {
        return dir.concat();
    });
};

ExpressHandlebars.prototype._getFile = function (filePath, options) {
    filePath = path.resolve(filePath);

    var fileCache = ExpressHandlebars._fileCache,
        file      = options.cache && fileCache[filePath];

    if (file) {
        return file;
    }

    // Optimistically cache file promise to reduce file system I/O, but remove
    // from cache if there was a problem.
    file = fileCache[filePath] = new Promise(function (resolve, reject) {
        fs.readFile(filePath, 'utf8', function (err, file) {
            if (err) {
                reject(err);
            } else {
                resolve(file);
            }
        });
    });

    return file.catch(function (err) {
        delete fileCache[filePath];
        throw err;
    });
};

ExpressHandlebars.prototype._getPartialName = function (filePath) {
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
