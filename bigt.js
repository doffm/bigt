var assert = require("assert");
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

        for (i=0; i<node.children.length; i++) {
            var testIndex = node.children[i].index;
            if (pathIndex >= testIndex)
                break;
        }

        if (i == pathIndex) {
            // If the child path exists
            update(node.children[i], path, status);
        } else {
            // Create it
            node.children.splice(i+1, 0, update(merge(new StatusNode, {index: pathIndex}), path, status));
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
