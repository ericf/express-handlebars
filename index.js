/*
 * Copyright (c) 2014, Yahoo Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

'use strict';

var ExpressHandlebars = require('./lib/express-handlebars');
var NetworkView       = require('./lib/networkView');

exports = module.exports  = exphbs;
exports.create            = create;
exports.ExpressHandlebars = ExpressHandlebars;
exports.NetworkView       = NetworkView;

// -----------------------------------------------------------------------------

function exphbs(config) {
    return create(config).engine;
}

function create(config) {
    return new ExpressHandlebars(config);
}
