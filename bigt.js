var assert = require("assert");
var console = require("console");
var events = require("events");

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
            lout(output, l, depth+1, 37)
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

var Test = function (name, test) {
    events.EventEmitter.call(this);

    this.name = name;
    this.test = test;
    this.children = 0;
};
Test.prototype = Object.create(events.EventEmitter.prototype, {
    constructor: {
        value: Test, 
        enumerable: false,
        writable: true,
        configurable: true
    }
});

Test.prototype.run = function() {
    try {
        this.emit("status", merge(new StatusSignal(), {
            name: this.name
        }));
        this.test(this);
        this.emit("status", merge(new StatusSignal(), {
            name: this.name,
            status: "passed",
        }));
    } catch (err) {
        this.emit("status", merge(new StatusSignal(), {
            name: this.name,
            status: "failed",
            error: err
        }));
    }
    return this;
};

Test.prototype.createChild = function(name, test) {
    var self = this;
    var child = new Test(name, test);
    child.addListener("status", function(status) {
        status.path.push(self.children);
        self.emit("status", status);
    });
    self.children += 1;
    return child;
};

var rootTest = new Test("Root Test", function(T) {
    assert.ok(true);
    T.createChild("S1", function(T) {
        assert.ok(true);
    }).run();
    T.createChild("S2", function(T) {
        assert.ok(true);
    }).run();
    T.createChild("S3", function(T) {
        assert.ok(false);
    }).run();
});

var rootNode = new StatusNode();

rootTest.addListener("status", function(status) {
    update(rootNode, status.path.slice(0), status);
});

rootTest.run();

var sb = new StringBuffer();

render(sb, rootNode, 0);

process.stdout.write(sb.toString());
