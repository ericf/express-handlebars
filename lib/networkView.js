var View = require('express/lib/view');
var path = require('path');

var NetworkView = function(name, options) {
  View.call(this, name, options);
};

NetworkView.prototype = Object.create(View.prototype);
NetworkView.prototype.constructor = NetworkView;

NetworkView.prototype.lookup = function(name) {
  return View.prototype.lookup.call(this, name) || this.join(this.root, name);
}

NetworkView.prototype.join = function(root, name) {
  return root + (name[0] === '/' ? name : ('/' + name));
}

module.exports = NetworkView;
