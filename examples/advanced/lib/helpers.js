'use strict';

exports.yell = function (msg) {
    return msg.toUpperCase();
};

var blocks = {};

exports.block = function (name) {
  var str = (blocks[name] || []).join("");
  blocks[name] = [];
  return str;
};

exports.extend = function (name, options) {
  if (!blocks[name]) return;
  blocks[name].push(options.fn(this));
};
