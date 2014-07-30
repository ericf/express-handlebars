'use strict';

var ExpressHandlebars = require('./lib/express-handlebars');

exports = module.exports  = exphbs;
exports.create            = create;
exports.ExpressHandlebars = ExpressHandlebars;

// -----------------------------------------------------------------------------

function exphbs(config) {
    return create(config).engine;
}

function create(config) {
    return new ExpressHandlebars(config);
}
