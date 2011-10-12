var assert = require("assert");
var events = require("events");

var bigt   = require("../bigt");

var StatusNode = bigt.StatusNode,
    updateStatusNode = bigt.updateStatusNode;

var root = new StatusNode();

updateStatusNode(root, [],{
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

updateStatusNode(root, [1], {
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

updateStatusNode(root, [1], {
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

updateStatusNode(root, [3], {
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

updateStatusNode(root, [2], {
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
