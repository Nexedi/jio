/*jslint indent: 2, maxlen: 80, sloppy: true, unparam: true */
/*global ReferenceArray */

function enableJobReference(jio, shared, options) {

  // creates
  // - shared.jobs Object Array

  // uses 'job', 'jobEnd' events

  shared.jobs = [];

  var job_references = new ReferenceArray(shared.jobs);

  shared.on('job', function (param) {
    job_references.put(param);
  });

  shared.on('jobEnd', function (param) {
    job_references.remove(param);
  });
}
