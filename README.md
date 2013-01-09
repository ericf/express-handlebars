Express3 Handlebars
===================

A [Handlebars][] view engine for [Express][] which doesn't suck.

[Express]: https://github.com/visionmedia/express
[Handlebars]: https://github.com/wycats/handlebars.js

Design & Goals
--------------

I created this project out of frustration with the existing Handlebars view
engines for Express. As of version 3.x, Express got out of the business of being
a generic view engine — this was a great decision — leaving developers to
implement the concepts of layouts, partials, and doing file I/O for their
template engines of choice.

### Goals and Features

After building a half-dozen Express apps, I developed requirements and opinions
about what a Handlebars view engine should provide and how it should be
implemented. The following is that list:

* Add back the concept of "layout", which was removed in Express 3.x.

* Add back the concept of "partials" via Handlebars' partials mechanism.

* Support a directory of partials; e.g., `{{> foo/bar}}` which exists on the
  file system at `views/partials/foo/bar.handlebars` by default.

* Smart file system I/O and template caching. When in development, templates are
  always loaded from disk. In production, raw files and compiled templates are
  cached, including partials.

* All async and non-blocking. File system I/O is slow and servers should not be
  blocked from handling requests while reading from disk. I/O queuing is used to
  avoid unnecessary I/O.

* Ability to expose precompiled partials to the client, for template sharing.

* Ability to use a different Handlebars module/implementation other than the
  Handlebars npm module.

### API Design

This module was designed to work great for both the simple and complex use
cases. I _intentionally_ made sure the full implementation is exposed and is
easily overrideable.

The module exports a function which can be invoked with no arguments or a
`config` object and it will return a function (closed over sane defaults) which
can be registered with an Express app. It's an engine factory function.

This exported engine factory has two properties which expose the underlying
implementation:

* `ExpressHandlebars()`: The constructor function which holds the internal
  implementation on its `prototype`. This produces instance objects which store
  their configuration, `compiled` and `precompiled` templates, and expose an
  `engine()` function which can be registered with an Express app.

* `create()`: A convenience factory function for creating `ExpressHandlebars`
  instances.

An instance-based approach is used so that multiple `ExpressHandlebars`
instances can be created with their own configuration, templates, partials, and
helpers.

Installation
------------

Install using npm:

    npm install express3-handlebars

Usage
-----

This module uses sane defaults that leverage the "Express-way" of structuring an
app's views. This makes it trivial to use this module in basic apps:

```javascript
var express = require('express'),
    exphbs  = require('express3-handlebars'),

    app = express();

app.engine('handlebars', exphbs({ /* config */ }));
app.set('view engine', 'handlebars');
```

### Configuration and Defaults

The following is a list of configuration properties and their default values
(if any):

* __`defaultLayout`__: The string name or path of a template in the `layoutsDir`
  to use as the default layout. This is overridden by a `layout` specified in
  the app or response `locals`. **Note:** A falsy value will render without a
  layout; e.g., `res.render('home', {layout: false});`.

* __`extname = '.handlebars'`__: The string name of the file extension used by
  the templates.

* __`handlebars = require('handlebars')`__: The Handlebars
  module/implementation. This allows for the `ExpressHandlebars` instance to use
  a different Handlebars module/implementation than that provided by the
  Handlebars npm module.

* __`helpers`__: An object which holds the helper functions used when rendering
  templates. This defaults to `handlebars.helpers`, and will merge any helpers
  specified during construction.

* __`layoutsDir = 'views/layouts/'`__: The string path to the directory where
  the layout templates reside.

* __`partialsDir = 'views/partials/'`__: The string path to the directory where
  the partials templates reside.

### Advanced Usage

As noted in the **API Design** section, this module's implementation is
instance-based, and more advanced usages can take advantage of this. The
following example demonstrates how to use an `ExpressHandlebars` instance to
share templates with the client:

The app's "views/" directory has the following structure:

```
views
├── home.handlebars
├── layouts
│   └── main.handlebars
└── partials
    ├── foo
    │   └── bar.handlebars
    └── title.handlebars

3 directories, 4 files
```

The Express app can be implemented to expose its partials as follows:

```javascript
var express = require('express'),
    exphbs  = require('express3-handlebars'),

    app = express(),
    hbs;

// Create `ExpressHandlebars` instance with a default layout.
hbs = exphbs.create({
    defaultLayout: 'main'
});

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// Middleware to expose the app's partials when rendering the view.
function exposeTemplates(req, res, next) {
    // Uses the `ExpressHandlebars` instance to get the precompiled partials.
    hbs.getPartials({
        cache      : app.enabled('view cache'),
        precompiled: true
    }, function (err, partials) {
        if (err) { return next(err); }

        var templates = [];

        Object.keys(partials).forEach(function (name) {
            templates.push({
                name    : name,
                template: partials[name]
            });
        });

        // Exposes the partials during view rendering.
        res.locals.templates = templates;
        next();
    });
}

app.get('/', exposeTemplates, function (req, res, next) {
    res.render('home');
});

app.listen(3000);
```

The `main` layout can then access these precompiled partials via the `templates`
local, and render them like this:

```handlebars
<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Example App</title>
</head>
<body>

    {{{body}}}

  {{#if templates}}
    <script src="/libs/handlebars.runtime.js"></script>
    <script>
        (function () {
            var template  = Handlebars.template,
                templates = Handlebars.templates = Handlebars.templates || {};

          {{#templates}}
            templates['{{{name}}}'] = template({{{template}}});
          {{/templates}}
        }());
    </script>
  {{/if}}

</body>
</html>
```

License
-------

Copyright (c) 2013 by Eric Ferraiuolo (eferraiuolo@gmail.com). All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
