var assert = require("assert");
var events = require("events");
var bigt   = require("./bigt");

var StatusNode = bigt.StatusNode,
    Test = bigt.Test,
    TestWrapper = bigt.TestWrapper,
    update = bigt.update,
    render = bigt.render,
    StringBuffer = bigt.StringBuffer;

// RESULTS AGGREGATOR TEST

var root = new StatusNode();

update(root, [],{
    name: "root",
    path: [],
    status: "running",
    error: null
});
assert.deepEqual(root, {
    name: "root",
    path: [],
    status: "running",
    error: null,
    index: 0,
    children: []
});

update(root, [1], {
    name: "child-1",
    path: [1],
    status: "running",
    error: null
});
assert.deepEqual(root, {
    name: "root",
    path: [],
    status: "running",
    error: null,
    index: 0,
    children: [{
        name: "child-1",
        path: [1],
        status: "running",
        error: null,
        index: 1,
        children: []
    }]
});

update(root, [1], {
    name: "child-1",
    path: [1],
    status: "passed",
    error: null
});
assert.deepEqual(root, {
    name: "root",
    path: [],
    status: "running",
    error: null,
    index: 0,
    children: [{
        name: "child-1",
        path: [1],
        status: "passed",
        error: null,
        index: 1,
        children: []
    }]
});

update(root, [3], {
    name: "child-3",
    path: [3],
    status: "failed",
    error: null
});
assert.deepEqual(root, {
    name: "root",
    path: [],
    status: "running",
    error: null,
    index: 0,
    children: [{
        name: "child-1",
        path: [1],
        status: "passed",
        error: null,
        index: 1,
        children: []
    },
    {
        name: "child-3",
        path: [3],
        status: "failed",
        error: null,
        index: 3,
        children: []
    }]
});

update(root, [2], {
    name: "child-2",
    path: [2],
    status: "failed",
    error: null
});
assert.deepEqual(root, {
    name: "root",
    path: [],
    status: "running",
    error: null,
    index: 0,
    children: [{
        name: "child-1",
        path: [1],
        status: "passed",
        error: null,
        index: 1,
        children: []
    },
    {
        name: "child-2",
        path: [2],
        status: "failed",
        error: null,
        index: 2,
        children: []
    },
    {
        name: "child-3",
        path: [3],
        status: "failed",
        error: null,
        index: 3,
        children: []
    }]
});

// RENDERER TEST

var sb = new StringBuffer();

render(sb, root, 0);

process.stdout.write(sb.toString());

// TEST OBJECT TESTS

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
    update(rootNode, status.path.slice(0), status);
});

rootTest.addListener("finished", function () {
    var sb = new StringBuffer();
    render(sb, rootNode, 0);
    process.stdout.write(sb.toString());
});

rootTest.run();

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
    update(wrappedRootNode, status.path.slice(0), status);
});
wrappedRootTest.addListener("finished", function () {
    var sb = new StringBuffer();
    render(sb, wrappedRootNode, 0);
    process.stdout.write(sb.toString());
});
wrappedRootTest();

/*
var T, UT  = require("./bigt.js").Test;
var Cout   = require("./bigt.js").ConsoleOutput; 

Cout(T("A Test should", function(T) {
    var ut = UT("Test under test");
    T("Be an EventEmitter").assert.ok(ut instanceof events.EventEmitter);
    T("Be callable").assert.doesNotThrow(function() {ut();});

    T("Pass itself as an argument to test functions", function(T) {
        var ut = UT("Test under test", function(UT) {
            T.assert.equal(ut, UT);
        });
    })();

    T("Emit the `result` signal when called", function(T) {
        var ut = UT("Test under test");
        ut.once("result", function(result) {
            T("Which has a path").assert.ok(result.path);
            T("And a result").assert.ok(result.ok);
            T.done();
        });
        ut();
    }).expect(50)();

    T("Have an `expect` method that", function(T) {
        T("Means the `result` signal is not emitted on call", function(T) {
            var ut = UT("Test under test").expect(1);
            ut.once("result", function(result) {
                T.assert.ok(false);
            });
            ut();
        })();

        T("Emits the `result` signal on `done`", function(T) {
            var ut = UT("Test under test", function(UT) {UT.done();}).expect(50);
            ut.once("result", function(result) {
                T("Which has a path").assert.ok(result.path);
                T("And a result").assert.ok(result.ok);
                T.done();
            });
            ut();
        }).expect(50)();

        T("Times out after the specified time", function(T) {
            var ut = UT("Test under test").expect(1);
            ut.once("result", function(result) {
                T.assert.equal(result.ok, false);
            });
        }).expect(50)();
    })();

    T("Be able to create child tests", function(T) {
        var ut  = UT("Test under test");
        var cut = ut("Child test under test");

        T("Which are EventEmitters").assert.ok(cut instanceof events.EventEmitter);
        T("Which are callable").assert.doesNotThrow(function() {ut();});

        T("Which emits the `result` signal when called", function(T) {
            var ut = UT("Test under test");
            var cut = ut("Child test under test");
            cut.once("result", function(result) {
                T("Which has a path").assert.ok(result.path);
                T("And a result").assert.ok(result.ok);
                T.done();
            });
            cut();
        }).expect(50)();

        T("Whose results are available through the parents `result` signal", function(T) {
            var ut = UT("Test under test");
            var cut = ut("Child test under test");
            ut.once("result", function(result) {
                T("Which has a path").assert.ok(result.path);
                T("And a result").assert.ok(result.ok);
                T.done();
            });
            ut();
        }).expect(50)();
    })();

    T("Subsume the `assert` API", function(T) {
        var ut = UT("Test under test");
        assert.ok(ut.assert.fail);
        assert.ok(ut.assert.ok);
        assert.ok(ut.assert.equal);
        assert.ok(ut.assert.notEqual);
        assert.ok(ut.assert.deepEqual);
        assert.ok(ut.assert.notDeepEqual);
        assert.ok(ut.assert.strictEqual);
        assert.ok(ut.assert.notStrictEqual);
        assert.ok(ut.assert.throws);
        assert.ok(ut.assert.doesNotThrow);
        assert.ok(ut.assert.ifError);
    })();

    T("Have asserts that return the `result` signal immidiately", function(T) {
        var ut = UT("Test under test");

        ut.once("result", function(result) {
            T("Which has a path").assert.ok(result.path);
            T("And a result").assert.ok(result.ok);
            T.done();
        });
        ut.assert.ok(true);
    }).expect(50)();

    T("Catch exceptions within the test function", function(T) {
        var ut = UT("Test under test", function(UT) {throw Error;});

        ut.once("result", function(result) {
            assert.equal(result.ok, false);
        });
        ut();
    }).expect(50)();
}))();
*/
