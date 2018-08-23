var RSVP = require('rsvp'),
  moment = require('moment'),
  Rusha = require('rusha'),
  XMLHttpRequest = require('xhr2'),
  FormData = require('form-data'),
  URI = require('urijs'),
  UriTemplate = require('uritemplate'),
  process = require('process');

window.FormData = FormData;
window.XMLHttpRequest = XMLHttpRequest;
