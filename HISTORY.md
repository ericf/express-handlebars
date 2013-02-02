Express3 Handlebars Change History
==================================

0.2.0 (2013-02-01)
------------------

* Renamed methods prefixed with "get" to "load" for clarity. (Issue #5)

    * `getPartials()` -> `loadPartials()`
    * `getTemplate()` -> `loadTemplate()`

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
