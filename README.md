
BigT is small, flexible test framework.

Tests take one test function, to execute the test just
call the test object.

    var T = require("bigt.js").T;

    var test = T("A banana should", function(T) {
        var banana = new Banana();
    });

    // Run the test
    test();

Exceptions within the test function cause tests to fail.

The test function takes a test object on which child tests
may be created.

    var test = T("A banana should", function(T) {
        var banana = new Banana();

        T("Have a peel that", function(T) {
            var peel = banana.peel();
        })();
    })();

The `ConsoleOutput` function will output the results of
the test and all child tests. The test will be executed
automatically.

    var T = require("bigt.js").T;
    var ConsoleOutput = require("bigt.js").ConsoleOutput;

    ConsoleOutput(T("A banana should", function(T) {
        var banana = new Banana();

        T("Have a peel that", function(T) {
            var peel = banana.peel();
        })();
    }));


The assert module is available on test objects. When
assert module methods are called the test is executed
immidiately.

    var test = T("A banana should", function(T) {
        var banana = new Banana();

        T("Have a peel that", function(T) {
            var peel = banana.peel();
            T("Is slippy").assert.ok(peel.isSlippy());
        })();
    });

Tests can be skipped. When a test is skipped it will always
pass and its test function will not be run.

    var test = T("A failing test", function(T) {
      throw new Error();
    });

    test.skip();
    test();

Tests usually pass when the test reaches the end without
an exception. Tests can be made asyncronous by calling
the `async` function with a timeout in ms.

    T("An async test", function(T) {
        asyncFunc(function(result) {
            if (result = "pass") {
                T.pass();
            } else {
                T.fail();
            }
        });
    }).async(500)();
