Express3 Handlebars Change History
==================================

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

* Renamed methods prefixed with "get" to "load" for clarity:

    * `getPartials()` -> `loadPartials()`
    * `getTemplate()` -> `loadTemplate()`

  Aliases for these methods have been created to maintain back-compat, but the
  old method names are now deprecated will be removed in the future. (Issue #5)

* All paths are resolved before checking in or adding to caches. (Issue #1)

* Force `{precompiled: false}` option within `render()` and `renderView()`
  methods to prevent trying to render with precompiled templates. (Issue #2)


0.1.2 (2013-01-10)
------------------

* Tweak formatting of README documentation.


0.1.1 (2013-01-10)
------------------

* Add README documentation.


0.1.0 (2013-01-07)
------------------

* Initial release.
