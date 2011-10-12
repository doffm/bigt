var assert = require("assert");
var events = require("events");

var bigt   = require("../bigt");

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
