'use_strict';

var ExpressHandlebars = require('../lib/express-handlebars'),
    Promise           = global.Promise || require('promise'),
    assert            = require('assert'),
    sinon             = require('sinon');

describe('Namespace', function () {
    it('should resolve partial names with namespace if provided on getPartials', function (done) {
        var partialsDir = [
            'no-namespace',
            {dir: 'dir-a', namespace: 'namespace-a'},
            {dir: 'dir-b', namespace: 'namespace-b'},
        ];
        var expressHandlebars = new ExpressHandlebars({
            partialsDir: partialsDir,
        });

        sinon.stub(expressHandlebars, '_getFile').returns(Promise.resolve(''));

        var _getDirStub = sinon.stub(expressHandlebars, '_getDir');

        _getDirStub.withArgs(sinon.match('no-namespace')).returns(Promise.resolve(['file-no-namespace']));
        _getDirStub.withArgs(sinon.match('dir-a')).returns(Promise.resolve(['file-a']));
        _getDirStub.withArgs(sinon.match('dir-b')).returns(Promise.resolve(['file-b']));

        expressHandlebars.getPartials().then(function (partials) {
            assert.ok(partials.hasOwnProperty('file-no-namespace'));
            assert.ok(partials.hasOwnProperty('namespace-a/file-a'));
            assert.ok(partials.hasOwnProperty('namespace-b/file-b'));
        }).then(done, done);
    });
});
