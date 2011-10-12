var assert = require("assert");
var events = require("events");

var bigt   = require("../bigt");

var Test = bigt.Test,
    TestWrapper = bigt.TestWrapper,
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

var wrappedRootTest = TestWrapper(new Test("Wrapped Root Test", function (T) {
    assert.ok(true);
    T("S1", function(T) {
        assert.ok(true);
    })();
    T("S2", function(T) {
        assert.ok(true);
        T("S21", function(T) {
            assert.ok(true);
        })();
    })();
    T("S3", function(T) {
        assert.ok(false);
    })();
    T("S4", function(T) {
        assert.ok(true);
        T.pass();
    }).async()();
    T("S5", function(T) {
        T.fail(new Error("Foobar"));
    })();
    T("S6", function(T) {
        assert.ok(true);
    }).async(20)();
    T("S7", function(T) {
        assert.ok(false);
    }).skip();
    T("S8", function(T) {
        T("S81").assert.ok(true);
        T("S82").assert.equal(true, true);
        T("S83").assert.equal(true, false);
    })();
}));

var wrappedRootNode = new StatusNode();

wrappedRootTest.addListener("status", function(status) {
    updateStatusNode(wrappedRootNode, status.path.slice(0), status);
});

wrappedRootTest.addListener("finished", function () {
    var sb = new StringBuffer();
    renderStatusNode(sb, wrappedRootNode, 0);
    process.stdout.write(sb.toString());
});

wrappedRootTest();
