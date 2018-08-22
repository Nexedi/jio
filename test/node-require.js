var dist = require('../dist/jio-node-latest');
Object.keys(dist).forEach(key => global[key] = dist[key]);

var sinon = require('sinon');
global.sinon = sinon;
