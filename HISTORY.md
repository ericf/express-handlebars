Express3 Handlebars Change History
==================================

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
