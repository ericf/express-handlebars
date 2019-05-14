'use strict';

var Promise = global.Promise || require('promise');

var express = require('express'),
    exphbs  = require('../../'), // "express-handlebars"
    helpers = require('./lib/helpers');

var app = express();

// Create `ExpressHandlebars` instance with a default layout.
var hbs = exphbs.create({
    helpers      : helpers,

    // Uses multiple partials dirs, templates in "shared/templates/" are shared
    // with the client-side of the app (see below).
    partialsDir: [
        'shared/templates/',
        'views/partials/'
    ]
});

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// Middleware to expose the app's shared templates to the client-side of the app
// for pages which need them.
function exposeTemplates(req, res, next) {
    // Uses the `ExpressHandlebars` instance to get the get the **precompiled**
    // templates which will be shared with the client-side of the app.
    hbs.getTemplates('shared/templates/', {
        cache      : app.enabled('view cache'),
        precompiled: true
    }).then(function (templates) {
        // RegExp to remove the ".handlebars" extension from the template names.
        var extRegex = new RegExp(hbs.extname + '$');

        // Creates an array of templates which are exposed via
        // `res.locals.templates`.
        templates = Object.keys(templates).map(function (name) {
            return {
                name    : name.replace(extRegex, ''),
                template: templates[name]
            };
        });

        // Exposes the templates during view rendering.
        if (templates.length) {
            res.locals.templates = templates;
        }

        setImmediate(next);
    })
    .catch(next);
}

app.get('/', function (req, res) {
    res.render('home', {
        title: 'Home'
    });
});

app.get('/yell', function (req, res) {
    res.render('yell', {
        title: 'Yell',

        // This `message` will be transformed by our `yell()` helper.
        message: 'hello world'
    });
});

app.get('/exclaim', function (req, res) {
    res.render('yell', {
        title  : 'Exclaim',
        message: 'hello world',

        // This overrides _only_ the default `yell()` helper.
        helpers: {
            yell: function (msg) {
                return (msg + '!!!');
            }
        }
    });
});

app.get('/echo/:message?', exposeTemplates, function (req, res) {
    res.render('echo', {
        title  : 'Echo',
        message: req.params.message,

        // Overrides which layout to use, instead of the defaul "main" layout.
        layout: 'shared-templates',

        partials: Promise.resolve({
            echo: hbs.handlebars.compile('<p>ECHO: {{message}}</p>')
        })
    });
});

app.use(express.static('public/'));

app.listen(3000, function () {
    console.log('express-handlebars example server listening on: 3000');
});
