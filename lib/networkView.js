var View = require('express/lib/view');

var NetworkView = function(name, options) {
  View.call(this, name, options);
};

NetworkView.prototype = Object.create(View.prototype);
NetworkView.prototype.constructor = NetworkView;

NetworkView.prototype.lookup = function(name) {
  return View.prototype.lookup.call(this, name) || this.join(this.root, name);
}

NetworkView.prototype.join = function(root, name) {
  root = root[root.length - 1] === '/' ?
    root.slice(0, root.length - 1) : root;
    
  return root + (name[0] === '/' ? name : ('/' + name));
}

module.exports = NetworkView;
