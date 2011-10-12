var util    = require("util");
var assert  = require("assert");
var timers  = require("timers");
var console = require("console");

var EventEmitter = require("events").EventEmitter;

var BigT = module.exports;

var isEmpty = function (obj) {
    var empty = true;
    for (prop in obj) {
        empty = false;
        break;
    }
    return empty;
}

var merge = function (dest, source) {
    for (var p in source) {
        dest[p] = source[p];
    };
    return dest;
}

/*
 * Test Class
 *
 * Tests are made up of a single test function.
 * This function is passed an `InnerTest` object on
 * which child tests can be created.
 */
var Test = BigT.Test = function (name, tfunc) {
    EventEmitter.call(this);

    this.name    = name;
    this.tfunc    = tfunc;
    this.timeout = 0;

    this.assert = new Assert(this);
};
util.inherits(Test, EventEmitter);

/*
 * Run the test by executing the test function.
 */
Test.prototype.run = function (tfunc) {
    var innerTest = new InnerTest(this);
    innerTest.run(tfunc);
    return this;
};

/*
 * Set the test as `async`. Async tests will emit the
 * `finished` signal only when `pass` or `fail` is
 * explicity called on the `InnerTest` object.
 */
Test.prototype.async = function (timeout) {
    this.timeout = timeout;
    return this;
};

/*
 * Skip the test, when run the test will pass immidiately
 * and the test function will never be called.
 */
Test.prototype.skip = function () {
    this.tfunc = function () {};
    return this.run();
};

/*
 * Test assert module
 *
 * Wraps the node assert module API.
 */
var Assert = function (test) {
    this.test = test;
};

var assertProps = [];
for (prop in assert) {
    assertProps.push(prop);
};

assertProps.forEach(function (prop) {
    var assertFunc = assert[prop];
    Assert.prototype[prop] = function () {
        var realArgs = arguments;
        var assertFunc = assert[prop];

        this.test.tfunc = function () {
            assertFunc.apply(this, realArgs);
        };

        return this.test.run();
    };
});

/*
 * InnerTest Class
 *
 * InnerTest objects are passed to test functions
 * when they are executed.
 *
 * They are used to create child tests and to explicity
 * pass or fail the test.
 */
var InnerTest = function (test) {
    this.test = test;
    this.timeoutId = null;

    this.result = false;
    this.finished = false;

    this.children = {};
    this.childCounter = 0;
};

InnerTest.prototype.run = function (tfunc) {
    var timeout = this.test.timeout;
    try {
        if (timeout && timeout > 0) {
            this.timeoutId = timers.setTimeout(function (self) {
                self.fail(new Error("Timeout"));
            }, timeout, this);
        };
        this.emit("status", {name:this.test.name, path: [], status: "running"});
        // Run the actual test function
        var actual = tfunc ? tfunc : this.test.tfunc;
        actual(this);
        if (!timeout) {
            this.pass();
        };
    } catch (error) {
        this.fail(error);
    }
};

InnerTest.prototype.emit = function (name, obj) {
    if (!this.finished) {
        this.test.emit(name, obj);
    }
};

InnerTest.prototype.finish = function () {
    if (this.timeoutId) timers.clearTimeout(this.timeoutId);
    this.emit("finished");
    this.finished = true;
};

/*
 * Explicitly set the test as passed.
 *
 * It will emit the `status` signal, and if all of its
 * children have finished it will also emit the `finished`
 * signal.
 */
InnerTest.prototype.pass = function () {
    this.result = true;
    this.emit("status", {name: this.test.name, path: [], status: "passed"});
    if (this.result && isEmpty(this.children))
        this.finish();
};

/*
 * Explicitly fail the test.
 *
 * It will emit the `status` signal followed
 * by the `finished` signal.
 */
InnerTest.prototype.fail = function (error) {
    this.result = true;
    this.emit("status", {name: this.test.name, path: [], status: "failed", error: error});
    this.finish();
};

/*
 * Create a new child test.
 */
InnerTest.prototype.child = function (name, tfunc) {
    var child = new Test(name, tfunc);
    var childId = this.childCounter++;

    this.children[childId] = child;

    child.addListener("status", (function(status) {
        // Emit the childs status
        status.path.unshift(childId);
        this.emit("status", status);
    }).bind(this));

    child.addListener("finished", (function() {
        delete this.children[childId];

        if (this.result && isEmpty(this.children))
            this.finish();
    }).bind(this));

    return child;
};

/*
 * Test Wrappers
 *
 * The test wrappers are API sugar for the `Test` and `InnerTest` objects.
 *
 * They create callable objects that have the same API as `Test` and `InnerTest`.
 * When called the `TestWrapper` object will call `run`. When called the `InnerTest`
 * object will create a child test.
 */

var TestWrapper = BigT.TestWrapper = function (test) {
    var tw = function () {
        test.run(function (innerTest) {
            test.tfunc(InnerTestWrapper(innerTest));
        });
        return tw;
    };

    // Create an EventEmitter facade
    ["addListener",
     "on",
     "once",
     "removeListener",
     "removeAllListeners",
     "listeners",
     "setMaxListeners"].forEach(function (prop) {
        tw[prop] = typeof test[prop] == "function" ? test[prop].bind(test) : test[prop];
    });

    // Raise the API of Test to TestWrapper
    ["async", "skip"].forEach(function (prop) {
        tw[prop] = function () {
            return TestWrapper(test[prop].apply(test, arguments));
        };
    });

    // Raise the API of assert to TestWrapper
    tw.assert = {};
    assertProps.forEach(function (prop) {
        var assertFunc = test.assert[prop];
        tw.assert[prop] = function () {
            return TestWrapper(assertFunc.apply(test.assert, arguments));
        };
    });

    return tw;
};

var InnerTestWrapper = function (innerTest) {
    var itw = function (name, tfunc) {
        return TestWrapper(innerTest.child(name, tfunc));
    };

    // Create an InnerTest facade
    ["pass", "fail"].forEach(function (prop) {
        itw[prop] = function () {
            innerTest[prop].apply(innerTest, arguments);
        };
    });

    return itw;
};

/*
 * StatusNodes are used to build a tree of test results from emitted `status`
 * signals.
 */
var StatusNode = BigT.StatusNode = function() {
    // Set some default values for the status signal properties.
    this.name = "Unknown";
    this.path = [];
    this.status = "running";
    this.error = null;

    // Index of the test within its parent test
    this.index = 0;
    // Child tests
    this.children = [];
};

/*
 * Updates a status node using an emitted `status` signal.
 *
 * Builds a tree of test results from all the `status` signals.
 */
var updateStatusNode = BigT.updateStatusNode = function(node, path, status) {
    if (path.length == 0) {
        // If refering to the current node
        merge(node, status);
    } else {
        // If referring to a descendant node
        var pathIndex = path.shift();

        var i=0;
        for (; i<node.children.length; i++) {
            if (node.children[i].index >= pathIndex)
                break;
        }

        if (node.children[i] && node.children[i].index == pathIndex) {
            // If a matching node was found
            updateStatusNode(node.children[i], path, status);
        } else {
            // Create a new desendant node, insert and update it
            node.children.splice(i, 0, updateStatusNode(merge(new StatusNode, {index: pathIndex}), path, status));
        }
    }

    return node;
};

var color = function(status) {
    switch (status) {
        case "running": return "33";
        case "passed" : return "1;32";
        case "failed" : return "1;31";
        default       : return "31";
    };
};

var lout = function(output, line, depth, color) {
    output.write(Array(depth+1).join("\t") + "\033[2K\033[" + color + "m" + line + "\n\033[37m");
};

/*
 * Renders a tree of test results to a stream output.
 *
 * Uses terminal escape codes for coloring the output.
 */
var renderStatusNode = BigT.renderStatusNode = function(output, node, depth) {
    var lines = 1;
    lout(output, node.name, depth, color(node.status));

    if(node.status == "failed" && node.error) {
        var message = node.error.stack || node.error.message;
        message.split(/\r\n|\r|\n/).forEach(function(l) {
            lines += 1;
            lout(output, l, depth, 37)
        });
    }
    node.children.forEach(function(c) {
        lines += renderStatusNode(output, c, depth+1)
    });

    return lines;
};


/*
 * Console output.
 *
 * Listens to signals from a Test object and outputs
 * results to the console as they are reported.
 */

var StringBuffer = function() {
    this.buffer = [];
};
StringBuffer.prototype.write = function(s) {
    this.buffer.push(s);
};
StringBuffer.prototype.toString = function() {
    return this.buffer.join("");
};

var clear = function() {
    process.stdout.write("\033[1A");
};
