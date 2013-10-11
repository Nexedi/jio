/*jslint indent: 2, maxlen: 80, sloppy: true, unparam: true */
/*global ReferenceArray */

function enableJobReference(jio, shared, options) {

  // creates
  // - shared.jobs Object Array

  // uses 'job:new' and 'job:end' events

  shared.jobs = [];

  var job_references = new ReferenceArray(shared.jobs);

  shared.on('job:new', function (param) {
    job_references.put(param);
  });

  shared.on('job:end', function (param) {
    job_references.remove(param);
  });
}
