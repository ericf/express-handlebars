Express3 Handlebars Change History
==================================

0.5.0 (2013-07-25)
------------------

* Added `loadTemplates()` method which will load all the templates in a
  specified directory.

* Added support for multiple partials directories. This enables the
  `partialsDir` configuration property to be specified as an *array* of
  directories, and loads all of the templates in each one.

  This feature allows an app's partials to be split up in multiple directories,
  which is common if an app has some shared partials which will also be exposed
  to the client, and some server-side-only partials.

* Added runnable code examples in this package's "examples/" directory.

* Improved optional argument handling in public methods to treat Express
  `locals` function objects as `options` and not `callback` params to the method
  being invoked.


0.4.1 (2013-04-06)
------------------

* Updated `async` dependency to the latest stable minor version: "~0.2".


0.4.0 (2013-03-24)
------------------

* (!) Removed the following "get" -> "load" aliases which kept in v0.2.0 for
  back-compat:

    * `getPartials()` -> `loadPartials()`
    * `getTemplate()` -> `loadTemplate()`

  This is the future version where these aliases have been removed.

* (!) Renamed `lib/express3-handlebars.js` -> `lib/express-handlebars.js`.

* Exposed `getHandlebarsSemver()` function as a static property on the
  `ExpressHandlebars` constructor.

* Rearranged module exports by moving the engine factory function to `index.js`,
  making the `lib/express3-handlebars.js` module only responsible for exporting
  the `ExpressHandlebars` constructor.


0.3.3 (2013-03-22)
------------------

* Updated internal `_resolveLayoutPath()` method to take the full
  `options`/locals objects which the view is rendered with. This makes it easier
  to override. (Issue #14)


0.3.2 (2013-02-20)
------------------

* Transfered ownership and copyright to Yahoo! Inc. This software is still free
  to use, and is now licensed under the Yahoo! Inc. BSD license.


0.3.1 (2013-02-18)
------------------

* Updated README with info about `options.helpers` for `render()` and
  `renderView()` docs.


0.3.0 (2013-02-18)
------------------

* Added support for render-level helpers, via `options.helpers`, to the
  `render()` and `renderView()` methods. Handlebars' `registerHelper()` function
  now works as expected and does not have to be called before the
  `ExpressHandlebars` instance is created. Helpers are now merged from:
  `handlebars.helpers` (global), `helpers` (instance), and `options.helpers`
  (render-level) before a template is rendered; this provides flexibility at
  all levels.

* Added `handlebarsVersion` property which is the version number of `handlebars`
  as a semver. This is used internally to branch on certain operations which
  differ between Handlebars releases.


0.2.3 (2013-02-13)
------------------

* Fixed issue with naming nested partials when using the latest version of
  Handlebars (1.0.rc.2). Previous versions require a hack to replace "/"s with
  "."s in partial names, and the latest version of Handlebars fixes that bug.
  This hack will only be applied to old versions of Handlebars. (Issue #9)


0.2.2 (2013-02-04)
------------------

* Updated README with the public method renames which happened v0.2.0.


0.2.1 (2013-02-04)
------------------

* `extname`, `layoutsDir`, and `partialsDir` property values will now reference
  the values on the prototype unless an `ExpressHandlebars` instance is
  constructed with config values for these properties.

* Improved clarity of method implementations, and exposed more override "hooks"
  via new private methods: `_getPartialName()`, `_renderTemplate()`, and
  `_resolveLayoutPath()`.


0.2.0 (2013-02-01)
------------------

* (!) Renamed methods prefixed with "get" to "load" for clarity:

    * `getPartials()` -> `loadPartials()`
    * `getTemplate()` -> `loadTemplate()`

  Aliases for these methods have been created to maintain back-compat, but the
  old method names are now deprecated will be removed in the future. (Issue #5)

* All paths are resolved before checking in or adding to caches. (Issue #1)

* Force `{precompiled: false}` option within `render()` and `renderView()`
  methods to prevent trying to render with precompiled templates. (Issue #2)


0.1.2 (2013-01-10)
------------------

* Tweaked formatting of README documentation.


0.1.1 (2013-01-10)
------------------

* Added README documentation.


0.1.0 (2013-01-07)
------------------

* Initial release.
