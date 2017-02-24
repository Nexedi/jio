// server.js
// where your node app starts
"use strict"
global.URI = require("uri-js");
global.RSVP = require('rsvp');
global.UriTemplate = require("uritemplate");
global.moment = require('moment');
global.navigator = require('navigator');
global.Rusha = require('rusha');
global.FormData = require('formdata');
global.atob = require('atob');
global.FileReader = require("FileReader");
global.Blob = require("Blob");
global.localStorage = require('node-localstorage');
global.btoa = require('btoa');
global.XMLHttpRequest = require('w3c-xmlhttprequest').XMLHttpRequest

global.window = global;
global.sessionStorage = {};

var jIO = require('jio');
var ClearRoadBillingPeriodRegistration = require("clearroad");

var cr = new ClearRoadBillingPeriodRegistration();
console.log("init");
cr.post({
    "reference" : "Q42",
    "start_date" : "2017-02-01T00:00:00Z",
    "stop_date" : "2017-03-01T00:00:00Z"
  }).push(function (){
      console.log("start sync...");
      return cr.sync();
  }).push(function (){
      console.info("Sync done");
  }, function (error) {
      console.info("Error :");
      console.warn(error.stack)
      console.warn(error);
  });


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
