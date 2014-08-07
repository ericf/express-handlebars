'use strict';

exports.extend    = extend;
exports.passError = passError;
exports.passValue = passValue;

// -----------------------------------------------------------------------------

function extend(target) {
    [].slice.call(arguments, 1).forEach(function (source) {
        if (!source) { return; }

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
    });

    return target;
}

function passError(callback) {
    return function (reason) {
        setImmediate(function () {
            callback(reason);
        });
    };
}

function passValue(callback) {
    return function (value) {
        setImmediate(function () {
            callback(null, value);
        });
    };
}
