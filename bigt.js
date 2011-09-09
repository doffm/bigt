var sys     = require("sys");
var assert  = require("assert");
var timers  = require("timers");

var EventEmitter = require("events").EventEmitter;

var console = require("console");

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
        node.error.stack.split(/\r\n|\r|\n/).forEach(function(l) {
            lines += 1;
            lout(output, l, depth, 37)
        });
    }
    node.children.forEach(function(c) {
        lines += render(output, c, depth+1)
    });

    return lines;
};

var sb = new StringBuffer();

render(sb, root, 0);

process.stdout.write(sb.toString());

var facade = function (dest, source, properties) {
    properties.forEach(function (prop) {
        if (source[prop]) {
            dest[prop] = typeof source[prop] == "function" ? source[prop].bind(source) : source[prop];
        };
    });
};

var isEmpty = function (obj) {
    var empty = true;
    for (prop in obj) {
        empty = false;
        break;
    }
    return empty;
}

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

var Test = function (name, func) {
    EventEmitter.call(this);

    this.name    = name;
    this.func    = func;
    this.timeout = 0;
};
sys.inherits(Test, EventEmitter);

Test.prototype.run = function () {
    var innerTest = new InnerTest(this);
    innerTest.run();
    return this;
};

Test.prototype.async = function (timeout) {
    this.timeout = timeout;
    return this;
};

Test.prototype.skip = function () {
    this.func = function () {};
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

InnerTest.prototype.run = function () {
    var timeout = this.test.timeout;
    try {
        if (timeout && timeout > 0) {
            this.timeoutId = timers.setTimeout(function (self) {
                self.fail(new Error("Timeout"));
            }, timeout, this);
        };
        this.emit("status", {name:this.test.name, path: [], status: "running"});
        // Run the actual test function
        this.test.func(this);
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

InnerTest.prototype.child = function (name, func) {
    var child = new Test(name, func);
    var childId = this.childCounter++;

    this.children[childId] = child;
        
    child.addListener("status", (function(status) {
        // Emit the childs status
        status.path.push(childId);
        this.emit("status", status);
    }).bind(this));

    child.addListener("finished", (function() {
        delete this.children[childId];

        if (this.result && isEmpty(this.children))
            this.finish();
    }).bind(this));

    return child;
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

// Notes -- 
//
// Need to make a decision on when a parent test sends its results.
//
// Only when all children have finished?
// Only when all children have failed?
// When just a single child has failed?
// When all the children have passed.
//
// Makes most sense to send the pass / fail signal when all the sub test status have
// been recieved.
//
// Could there be a separate finished signal?
//
// Status and finished signals.
// That makes a little sense.
