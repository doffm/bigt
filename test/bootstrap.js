var assert = require("assert");
var events = require("events");

var T = UT = require("../bigt.js").T;
var Cout   = require("../bigt.js").ConsoleOutput; 

Cout(T("A Test should", function(T) {
    var ut = UT("Test under test");
    T("Be an EventEmitter").assert.ok(ut.addListener);
    T("Be callable").assert.doesNotThrow(function() {ut();});

    T("Pass itself as an argument to test functions", function(T) {
        var ut = UT("Test under test", function(UT) {
            T.assert.equal(ut, UT);
        });
    })();

    T("Emit the `status` signal when called", function(T) {
        var ut = UT("Test under test");
        ut.once("status", function(status) {
            T("Which has a path").assert.ok(status.path);
            T("And a status").assert.ok(status.status);
            T.pass();
        });
        ut();
    }).async(50)();

    T("Have an `async` method that", function(T) {
        T("Means the `status` signal is not emitted on call", function(T) {
            var ut = UT("Test under test").async(1);
            ut.once("status", function(status) {
                T.assert.ok(false);
            });
            ut();
        })();

        T("Emits the `status` signal on `pass`", function(T) {
            var ut = UT("Test under test", function(UT) {UT.pass();}).async(50);
            ut.once("status", function(status) {
                T("Which has a path").assert.ok(status.path);
                T("And a status").assert.ok(status.status);
                T.pass();
            });
            ut();
        }).async(50)();

        T("Times out after the specified time", function(T) {
            var ut = UT("Test under test").async(20);
            ut.addListener("status", function(status) {
                if (status.status == "failed") {
                    T.pass();
                };
            });
            ut();
        }).async(50)();
    })();

    T("Be able to create child tests", function(T) {
        var ut  = UT("Test under test");
        var cut = ut("Child test under test");

        T("Which are EventEmitters").assert.ok(cut.addListener);
        T("Which are callable").assert.doesNotThrow(function() {ut();});

        T("Which emits the `status` signal when called", function(T) {
            var ut = UT("Test under test");
            var cut = ut("Child test under test");
            cut.once("status", function(status) {
                T("Which has a path").assert.ok(status.path);
                T("And a status").assert.ok(status.status);
                T.pass();
            });
            cut();
        }).async(50)();

        T("Whose status is available through the parents `status` signal", function(T) {
            var ut = UT("Test under test");
            var cut = ut("Child test under test");
            ut.once("status", function(status) {
                T("Which has a path").assert.ok(status.path);
                T("And a status").assert.ok(status.status);
                T.pass();
            });
            ut();
        }).async(50)();
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

    T("Have asserts that return the `status` signal immidiately", function(T) {
        var ut = UT("Test under test");

        ut.once("status", function(status) {
            T("Which has a path").assert.ok(status.path);
            T("And a status").assert.ok(status.status);
            T.pass();
        });
        ut.assert.ok(true);
    }).async(50)();

    T("Catch exceptions within the test function", function(T) {
        var ut = UT("Test under test", function(UT) {throw Error;});

        ut.addListener("status", function(status) {
            if (status.status == "failed") {
              T.pass();
            };
        });
        ut();
    }).async(50)();
}));
