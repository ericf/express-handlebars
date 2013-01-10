Express3 Handlebars
===================

A [Handlebars][] view engine for [Express][] which doesn't suck.

[Express]: https://github.com/visionmedia/express
[Handlebars]: https://github.com/wycats/handlebars.js


Goals & Design
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
  avoid doing unnecessary work.

* Ability to expose precompiled templates and partials to the client, enabling
  template sharing and reuse.

* Ability to use a different Handlebars module/implementation other than the
  Handlebars npm module.

### Module Design

This module was designed to work great for both the simple and complex use
cases. I _intentionally_ made sure the full implementation is exposed and is
easily overrideable.

The module exports a function which can be invoked with no arguments or with a
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

```shell
$ npm install express3-handlebars
```


Usage
-----

This module uses sane defaults that leverage the "Express-way" of structuring an
app's views. This makes it trivial to use this module in basic apps:

#### Directory Structure:

```
.
├── app.js
└── views
    ├── home.handlebars
    └── layouts
        └── main.handlebars

2 directories, 3 files
```

#### app.js:

```javascript
var express = require('express'),
    exphbs  = require('express3-handlebars'),

    app = express();

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.get('/', function (req, res, next) {
    res.render('home');
});

app.listen(3000);
```

#### views/layouts/main.handlebars:

```html
<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Example App</title>
</head>
<body>

    {{{body}}}

</body>
</html>
```

#### views/home.handlebars:

```html
<h1>Example App: Home</h1>
```

### Using Instances

Another way to use this module is to create an instance(s) of
`ExpressHandlebars`, allowing access to the full API:

```javascript
var express = require('express'),
    exphbs  = require('express3-handlebars'),

    app = express(),
    hbs = exphbs.create({ /* config */ });

// Register `hbs.engine` with the Express app.
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// ...still have a reference to `hbs`, which methods like `getPartials()` can be
// called on.
```

### Template Caching

This module uses a smart template caching strategy. In development, templates
will always be loaded from disk, i.e., no caching. In production, raw files and
compiled Handlebars templates are aggressively cached.

The easiest way to control template/view caching is through Express'
[view cache setting][]:

```javascript
app.enable('view cache');
```

Express enables this setting by default when in production mode, i.e.,
`process.env.NODE_ENV === "production"`.

**Note:** All of the public API methods accept `options.cache`, which gives
control over caching when calling these methods directly.

### Layouts

This module adds back the concept of "layout", which was removed in Express 3.x.
This view engine can be configured with a path to the layouts directory, by
default it's set to `"views/layouts/"`.

There are two ways to set a default layout: configuring the view engine's
`defaultLayout` property, or setting [Express locals][] `app.locals.layout`.

The layout in which a view should be rendered can be overridden per-request by
assigning a different value to the `layout` request local. The following will
render the "home" view with no layout:

```javascript
app.get('/', function (req, res, next) {
    res.render('home', {layout: false});
});
```

[view cache setting]: http://expressjs.com/api.html#app-settings
[Express locals]: http://expressjs.com/api.html#app.locals


API
---

### Configuration and Defaults

There are two main ways to use this module: via its engine factory function, or
creating `ExpressHandlebars` instances; both use the same configuration
properties and defaults.

```javascript
var exphbs = require('express3-handlebars');

// Using the engine factory:
exphbs({ /* config */ });

// Create an instance:
exphbs.create({ /* config */ });
```

The following is the list of configuration properties and their default values
(if any):

#### `defaultLayout`
The string name or path of a template in the `layoutsDir` to use as the default
layout. This is overridden by a `layout` specified in the app or response
`locals`. **Note:** A falsy value will render without a layout; e.g.,
`res.render('home', {layout: false});`.

#### `extname=".handlebars"`
The string name of the file extension used by the templates.

#### `handlebars=require('handlebars')`
The Handlebars module/implementation. This allows for the `ExpressHandlebars`
instance to use a different Handlebars module/implementation than that provided
by the Handlebars npm module.

#### `helpers`
An object which holds the helper functions used when rendering templates. This
defaults to `handlebars.helpers`, and will merge any helpers specified during
construction.

#### `layoutsDir="views/layouts/"`
The string path to the directory where the layout templates reside.

#### `partialsDir="views/partials/"`
The string path to the directory where the partials templates reside.

### Properties

The public API properties are provided via `ExpressHandlebars` instances. In
additional to the properties listed in the **Configuration and Defaults**
section, the following are additional public properties:

#### `compiled`
An object cache which holds compiled Handlebars template functions in the
format: `{"path/to/template": [Function]}`.

#### `engine`
A function reference to the `renderView()` method which is bound to `this`
`ExpressHandlebars` instance. This bound function should be used when
registering this view engine with an Express app.

#### `precompiled`
An object cache which holds precompiled Handlebars template strings in the
format: `{"path/to/template": [String]}`.

### Methods

The following is the list of public API methods provided via `ExpressHandlebars`
instances:

#### `getPartials(options|callback, [callback])`

Retreives the partials in the `partialsDir` and passes an object mapping the
partials in the form `{name: partial}` to the `callback`.

By default each partial will be a compiled Handlebars template function. Use
`options.precompiled` to receive the partials as precompiled templates — this is
useful for sharing templates with client code.

**Parameters:**

* `[options]`: Optional object containing any of the following properties:

  * `[cache]`: Whether cached templates can be used if they have already been
    requested. This is recommended for production to avoid unnecessary file I/O.

  * `[precompiled=false]`: Whether precompiled templates should be provided,
    instead of compiled Handlebars template functions.

* `callback`: Function to call once the partials are retrieved.

The name of each partial corresponds to its location in `partialsDir`. For
example, consider the following directory structure:

```
views
└── partials
    ├── foo
    │   └── bar.handlebars
    └── title.handlebars

2 directories, 2 files
```

`getPartials()` would produce the following result:

```javascript
var hbs = require('express3-handlebars').create();

hbs.getPartials(function (err, partials) {
    console.log(partials);
    // => { 'foo.bar': [Function],
    // =>    title: [Function] }
});
```

**Note:** The partial name `"foo.bar"` would ideally be `"foo/bar"`, but this is
being prevented by a [Handlebars bug][]. Once this bug is fixed, a future
version will use a "/" separator. Templates requiring the partial still use:
`{{> foo/bar}}`.

#### `getTemplate(filePath, [options|callback], [callback])`

Retreives the template at the specified `filePath` and passes a compiled
Handlebars template function to the `callback`.

Use `options.precompiled` to receive a precompiled Handlebars template.

**Parameters:**

* `filePath`: String path to the Handlebars template file.

* `[options]`: Optional object containing any of the following properties:

  * `[cache]`: Whether a cached template can be used if it have already been
    requested. This is recommended for production to avoid necessary file I/O.

  * `[precompiled=false]`: Whether a precompiled template should be provided,
    instead of a compiled Handlebars template function.

* `callback`: Function to call once the template is retrieved.

#### `render(filePath, [options|callback], [callback])`

Renders the template at the specified `filePath` using this instance's `helpers`
and partials, and passes the resulting string to the `callback`.

The `options` will be used both as the context in which the Handlebars template
is rendered, and to signal this view engine on how it should behave, e.g.,
`options.cache = false` will load _always_ load the templates from disk.

**Parameters:**

* `filePath`: String path to the Handlebars template file.

* `[options]`: Optional object which will serve as the context in which the
  Handlebars template is rendered. It may also contain any of the following
  properties which affect this view engine's behavior:

  * `[cache]`: Whether a cached template can be used if it have already been
    requested. This is recommended for production to avoid unnecessary file I/O.

* `callback`: Function to call once the template is retrieved.

#### `renderView(viewPath, [options|callback], [callback])`

Renders the template at the specified `viewPath` as the `{{{body}}}` within the
layout specified by the `defaultLayout` or `options.layout`. Rendering will use
this instance's `helpers` and partials, and passes the resulting string to the
`callback`.

This method is called by Express and is the main entry point into this Express
view engine implementation. It adds the concept of a "layout" and delegates
rendering to the `render()` method.

The `options` will be used both as the context in which the Handlebars templates
are rendered, and to signal this view engine on how it should behave, e.g.,
`options.cache=false` will load _always_ load the templates from disk.

**Parameters:**

* `viewPath`: String path to the Handlebars template file which should serve as
  the `{{{body}}}` when using a layout.

* `[options]`: Optional object which will serve as the context in which the
  Handlebars templates are rendered. It may also contain any of the following
  properties which affect this view engine's behavior:

  * `[cache]`: Whether cached templates can be used if they have already been
    requested. This is recommended for production to avoid unnecessary file I/O.

  * `[layout]`: Optional string path to the Handlebars template file to be used
    as the "layout". This overrides any `defaultLayout` value. Passing a falsy
    value will render with no layout (even if a `defaultLayout` is defined).

* `callback`: Function to call once the template is retrieved.

[Handlebars bug]: https://github.com/wycats/handlebars.js/pull/389


Advanced Usage Example
----------------------

As noted in the **Module Design** section, this module's implementation is
instance-based, and more advanced usages can take advantage of this. The
following example demonstrates how to use an `ExpressHandlebars` instance to
share templates with the client:

#### Directory Structure:

```
.
├── app.js
└── views
    ├── home.handlebars
    └── layouts
    │   └── main.handlebars
    └── partials
        ├── foo
        │   └── bar.handlebars
        └── title.handlebars

2 directories, 3 files
```

#### app.js:

The Express app can be implemented to expose its partials through the use of
route middleware:

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
        if (templates.length) {
            res.locals.templates = templates;
        }

        next();
    });
}

app.get('/', exposeTemplates, function (req, res, next) {
    res.render('home');
});

app.listen(3000);
```

#### views/layouts/main.handlebars:

The layout can then access these precompiled partials via the `templates` local,
and render them like this:

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
