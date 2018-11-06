  var RSVP = require('rsvp'),
  moment = require('moment'),
  Rusha = require('rusha'),
  XMLHttpRequest = require('xhr2'),
  FormData = require('form-data'),
  URI = require('urijs'),
  UriTemplate = require('uritemplate'),
  process = require('process');

window.moment = moment;
window.FormData = window.FormData || FormData;
window.XMLHttpRequest = window.XMLHttpRequest || XMLHttpRequest;
