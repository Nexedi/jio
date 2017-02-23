// server.js
// where your node app starts

URI = require("uri-js");
RSVP = require('rsvp');
UriTemplate = require("uritemplate");
moment = require('moment');
navigator = require('navigator');
Rusha = require('rusha');
FormData = require('formdata');
atob = require('atob');
FileReader = require("FileReader");
Blob = require("Blob");
localStorage = require('node-localstorage');

window = global;
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
