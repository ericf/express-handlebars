var ExpressHandlebars = require('./lib/express-handlebars');

function exphbs(config) {
    return exphbs.create(config).engine;
}

exphbs.create = function (config) {
    return new ExpressHandlebars(config);
};

exphbs.ExpressHandlebars = ExpressHandlebars;

module.exports = exphbs;
