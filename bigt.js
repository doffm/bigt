var util    = require("util");
var assert  = require("assert");
var timers  = require("timers");
var console = require("console");

var EventEmitter = require("events").EventEmitter;

var merge = function (dest, source) {
    for (var p in source) {
        dest[p] = source[p];
    };
    return dest;
}

var StatusSignal = function() {
    // Name of the test.
    this.name = "Unknown";
    // Path of the test relative to its parent tests
    this.path = [];
    // Status of the test one of `running`, `passed`, `failed`.
    this.status = "running";
    // If the test has failed an error object is available.
    this.error = null;
};

var StatusNode = function() {
    StatusSignal.call(this);
    // Index of the test within its parent test.
    this.index = 0;
    // Status of child tests
    this.children = [];
};
module.exports.StatusNode = StatusNode;

// TEST OBJECT

// Logic behind signal emission.
//
// A test emits running when it is started.
// A test emits failed if it explicitly fails either through
// a 'fail' call or through an exception in the main function.
// A test emits passed only when it has passed and all of its
// children have passed.
//
// If it passes and one of its children fails then it fails.
//
// Running emitted when started.
//
// Failed emitted on exception or through explicit `fail` method.

var isEmpty = function (obj) {
    var empty = true;
    for (prop in obj) {
        empty = false;
        break;
    }
    return empty;
}


var Assert = function (test) {
    this.test = test;
};

var assertProps = [];
for (prop in assert) {
  assertProps.push(prop);
};

// Create a facade assert API on the Test object
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

var Test = function (name, tfunc) {
    EventEmitter.call(this);

    this.name    = name;
    this.tfunc    = tfunc;
    this.timeout = 0;

    this.assert = new Assert(this);
};
util.inherits(Test, EventEmitter);
module.exports.Test = Test;

Test.prototype.run = function (tfunc) {
    var innerTest = new InnerTest(this);
    innerTest.run(tfunc);
    return this;
};

Test.prototype.async = function (timeout) {
    this.timeout = timeout;
    return this;
};

Test.prototype.skip = function () {
    this.tfunc = function () {};
    return this.run();
};

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

InnerTest.prototype.pass = function () {
    this.result = true;
    this.emit("status", {name: this.test.name, path: [], status: "passed"});
    if (this.result && isEmpty(this.children))
        this.finish();
};

InnerTest.prototype.fail = function (error) {
    this.result = true;
    this.emit("status", {name: this.test.name, path: [], status: "failed", error: error});
    this.finish();
};

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

// TEST WRAPPER OBJECT

var TestWrapper = function (test) {
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
module.exports.TestWrapper = TestWrapper;

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

// RESULTS AGGREGATOR

var update = function(node, path, status) {
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
            update(node.children[i], path, status);
        } else {
            // Create a new desendant node, insert and update it
            node.children.splice(i, 0, update(merge(new StatusNode, {index: pathIndex}), path, status));
        }
    }

    return node;
};
module.exports.update = update;

// AGGREGATED RESULTS RENDERER

var clear = function() {
    process.stdout.write("\033[1A");
};

var StringBuffer = function() {
    this.buffer = [];
};
StringBuffer.prototype.write = function(s) {
    this.buffer.push(s);
};
StringBuffer.prototype.toString = function() {
    return this.buffer.join("");
};
module.exports.StringBuffer = StringBuffer;

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


var render = function(output, node, depth) {
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
        lines += render(output, c, depth+1)
    });

    return lines;
};
module.exports.render = render;
