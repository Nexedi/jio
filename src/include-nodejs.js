global.URI = require("urijs");
global.RSVP = require('rsvp');
global.UriTemplate = require("uritemplate");
global.moment = require('moment');
global.navigator = require('navigator');
global.Rusha = require('rusha');
global.FormData = require('form-data');
global.atob = require('atob');
global.FileReader = require("html5").FileReader;
global.Blob = require("html5").Blob;
var LocalStorage = require('node-localstorage').LocalStorage;
global.localStorage = new LocalStorage("tests");
global.btoa = require('btoa');
global.XMLHttpRequest = require('xhr2');
var mockdoc = require("mockdoc");
global.document = new mockdoc();
global.sinon = require('sinon');
global.StreamBuffers = require('stream-buffers');
global.window = global;
global.sessionStorage = {};
global.HTMLCanvasElement = {};
