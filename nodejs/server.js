// server.js
// where your node app starts
"use strict"
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
global.localStorage = require('node-localstorage');
global.btoa = require('btoa');
global.XMLHttpRequest = require('xhr2');
global.StreamBuffers = require('stream-buffers');
global.window = global;
global.sessionStorage = {};

var jIO = require('jio');
var clearroad = require("clearroad");
var i = 0;
var cr = new clearroad.ClearRoadBillingPeriodRegistration("testam", "testam");
console.log("init");
cr.post({
    "reference" : "Q421",
    "start_date" : "2017-02-01T00:00:00Z",
    "stop_date" : "2017-03-01T00:00:00Z"
  }).push(function (){
      console.log("start sync...");
      return cr.sync();
  }).push(function (){
      console.info("Sync done");
  }).push(function() {
    cr = new clearroad.ClearRoadBillingPeriodRegistrationReport("testam", "testam", 100);
    return cr.sync();
  }).push(function (){
    console.log("sync done && loading result...")
    return cr.allDocs()
  }).push(function (result) {
    console.log("browsing results : "+result.data.total_rows);
    for (i = 0; i < result.data.total_rows; i += 1) {
      console.log("Ref : "+result.data.rows[i].value.reference+", state : "+result.data.rows[i].value.state+", comment"+result.data.rows[i].value.comment);
    }
    console.log("Finished");
  }).push(undefined, function (error) {
    throw error;
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

