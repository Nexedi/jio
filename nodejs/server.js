// server.js
// where your node app starts

/*--
var global = self,
    window = self;

self.DOMParser = {};
self.DOMError = {};
self.sessionStorage = {};
self.localStorage = {};
self.openDatabase = {};
--*/
URI = require('URI');
RSVP = require('rsvp');
UriTemplate = require("uritemplate");
require('lz-string');
moment = require('moment');
navigator = require('navigator');
Rusha = require('rusha');
FormData = require('formdata');
btoa = require('btoa');
indexedDB = require('indexeddb');
atob = require('atob');
FileReader = require("FileReader");
Blob = require("Blob");
IDBKeyRange = require('idb-range');
crypto = require("crypto-browserify");
localStorage = require('node-localstorage');

window = global;
QueryFactory = {};
Query = {}; //require('Query');
IDBOpenDBRequest = {};
DOMException = {};
DOMParser = {};
DOMError = {};
sessionStorage = {};

var jIO = require('jio');


// init project
var express = require('express');
var app = express();


// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});


// listen for requests :)
var listener = app.listen(3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
