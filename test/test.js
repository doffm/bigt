var assert = require("assert");
var events = require("events");

var bigt   = require("../bigt");

var Test = bigt.Test,
    StatusNode = bigt.StatusNode,
    updateStatusNode = bigt.updateStatusNode,
    renderStatusNode = bigt.renderStatusNode;

var StringBuffer = function() {
    this.buffer = [];
};
StringBuffer.prototype.write = function(s) {
    this.buffer.push(s);
};
StringBuffer.prototype.toString = function() {
    return this.buffer.join("");
};

var rootTest = new Test("Root Test", function(T) {
    assert.ok(true);
    T.child("S1", function(T) {
        assert.ok(true);
    }).run();
    T.child("S2", function(T) {
        assert.ok(true);
        T.child("S21", function(T) {
            assert.ok(true);
        }).run();
    }).run();
    T.child("S3", function(T) {
        assert.ok(false);
    }).run();
    T.child("S4", function(T) {
        assert.ok(true);
        T.pass();
    }).async().run();
    T.child("S5", function(T) {
        T.fail(new Error("Foobar"));
    }).run();
    T.child("S6", function(T) {
        assert.ok(true);
    }).async(20).run();
    T.child("S7", function(T) {
        assert.ok(false);
    }).skip();
    T.child("S8", function(T) {
        T.child("S81").assert.ok(true);
        T.child("S82").assert.equal(true, true);
        T.child("S83").assert.equal(true, false);
    }).run();
});

var rootNode = new StatusNode();

rootTest.addListener("status", function(status) {
    updateStatusNode(rootNode, status.path.slice(0), status);
});

rootTest.addListener("finished", function () {
    var sb = new StringBuffer();
    renderStatusNode(sb, rootNode, 0);
    process.stdout.write(sb.toString());
});

rootTest.run();
