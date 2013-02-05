/*jslint indent: 2, maxlen: 80, sloppy: true */
var jobRules = (function () {
  var that = {}, priv = {};

  priv.compare = {};
  priv.action = {};

  Object.defineProperty(that, "eliminate", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function () {
      return 'eliminate';
    }
  });
  Object.defineProperty(that, "update", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function () {
      return 'update';
    }
  });
  Object.defineProperty(that, "dontAccept", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function () {
      return 'dont accept';
    }
  });
  Object.defineProperty(that, "wait", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function () {
      return 'wait';
    }
  });
  Object.defineProperty(that, "none", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function () {
      return 'none';
    }
  });
  that.default_action = that.none;
  that.default_compare = function (job1, job2) {
    return (job1.getCommand().getDocId() === job2.getCommand().getDocId() &&
            job1.getCommand().getAttachmentId() ===
            job2.getCommand().getAttachmentId() &&
            job1.getCommand().getDocInfo('_rev') ===
            job2.getCommand().getDocInfo('_rev') &&
            job1.getCommand().getOption('rev') ===
            job2.getCommand().getOption('rev') &&
            JSON.stringify(job1.getStorage().serialized()) ===
            JSON.stringify(job2.getStorage().serialized()));
  };

  // Methods //
  /**
   * Returns an action according the jobs given in parameters.
   * @method getAction
   * @param  {object} job1 The already existant job.
   * @param  {object} job2 The job to compare with.
   * @return {string} An action string.
   */
  priv.getAction = function (job1, job2) {
    var j1label, j2label, j1status;
    j1label = job1.getCommand().getLabel();
    j2label = job2.getCommand().getLabel();
    j1status = (job1.getStatus().getLabel() === 'on going' ?
        'on going' : 'not on going');
    if (priv.action[j1label] && priv.action[j1label][j1status] &&
        priv.action[j1label][j1status][j2label]) {
      return priv.action[j1label][j1status][j2label](job1, job2);
    }
    return that.default_action(job1, job2);
  };

  /**
   * Checks if the two jobs are comparable.
   * @method canCompare
   * @param  {object} job1 The already existant job.
   * @param  {object} job2 The job to compare with.
   * @return {boolean} true if comparable, else false.
   */
  priv.canCompare = function (job1, job2) {
    var job1label = job1.getCommand().getLabel(),
      job2label = job2.getCommand().getLabel();
    if (priv.compare[job1label] && priv.compare[job2label]) {
      return priv.compare[job1label][job2label](job1, job2);
    }
    return that.default_compare(job1, job2);
  };

  /**
   * Returns an action string to show what to do if we want to add a job.
   * @method validateJobAccordingToJob
   * @param  {object} job1 The current job.
   * @param  {object} job2 The new job.
   * @return {string} The action string.
   */
  Object.defineProperty(that, "validateJobAccordingToJob", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function (job1, job2) {
      if (priv.canCompare(job1, job2)) {
        return {
          action: priv.getAction(job1, job2),
          job: job1
        };
      }
      return {
        action: that.default_action(job1, job2),
        job: job1
      };
    }
  });

  /**
   * Adds a rule the action rules.
   * @method addActionRule
   * @param {string} method1 The action label from the current job.
   * @param {boolean} ongoing Is this action is on going or not?
   * @param {string} method2 The action label from the new job.
   * @param {function} rule The rule that return an action string.
   */
  Object.defineProperty(that, "addActionRule", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function (method1, ongoing, method2, rule) {
      var ongoing_s = (ongoing ? 'on going' : 'not on going');
      priv.action[method1] = priv.action[method1] || {};
      priv.action[method1][ongoing_s] = priv.action[method1][ongoing_s] || {};
      priv.action[method1][ongoing_s][method2] = rule;
    }
  });

  /**
   * Adds a rule the compare rules.
   * @method addCompareRule
   * @param {string} method1 The action label from the current job.
   * @param {string} method2 The action label from the new job.
   * @param {function} rule The rule that return a boolean
   * - true if job1 and job2 can be compared, else false.
   */
  Object.defineProperty(that, "addCompareRule", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function (method1, method2, rule) {
      priv.compare[method1] = priv.compare[method1] || {};
      priv.compare[method1][method2] = rule;
    }
  });

  ////////////////////////////////////////////////////////////////////////////
  // Adding some rules
  /*
      LEGEND:
      - s: storage
      - m: method
      - n: name
      - c: content
      - o: options
      - =: are equal
      - !: are not equal

      select ALL        s= n=
      removefailordone  fail|done
      /                           elim repl nacc wait
      Remove     !ongoing  Save    1    x    x    x
      Save       !ongoing  Remove  1    x    x    x
      GetList    !ongoing  GetList 0    1    x    x
      Remove     !ongoing  Remove  0    1    x    x
      Load       !ongoing  Load    0    1    x    x
      Save c=    !ongoing  Save    0    1    x    x
      Save c!    !ongoing  Save    0    1    x    x
      GetList     ongoing  GetList 0    0    1    x
      Remove      ongoing  Remove  0    0    1    x
      Remove      ongoing  Load    0    0    1    x
      Remove     !ongoing  Load    0    0    1    x
      Load        ongoing  Load    0    0    1    x
      Save c=     ongoing  Save    0    0    1    x
      Remove      ongoing  Save    0    0    0    1
      Load        ongoing  Remove  0    0    0    1
      Load        ongoing  Save    0    0    0    1
      Load       !ongoing  Remove  0    0    0    1
      Load       !ongoing  Save    0    0    0    1
      Save        ongoing  Remove  0    0    0    1
      Save        ongoing  Load    0    0    0    1
      Save c!     ongoing  Save    0    0    0    1
      Save       !ongoing  Load    0    0    0    1
      GetList     ongoing  Remove  0    0    0    0
      GetList     ongoing  Load    0    0    0    0
      GetList     ongoing  Save    0    0    0    0
      GetList    !ongoing  Remove  0    0    0    0
      GetList    !ongoing  Load    0    0    0    0
      GetList    !ongoing  Save    0    0    0    0
      Remove      ongoing  GetList 0    0    0    0
      Remove     !ongoing  GetList 0    0    0    0
      Load        ongoing  GetList 0    0    0    0
      Load       !ongoing  GetList 0    0    0    0
      Save        ongoing  GetList 0    0    0    0
      Save       !ongoing  GetList 0    0    0    0

      For more information, see documentation
    */
  that.addActionRule('post', true, 'post', that.dontAccept);
  that.addActionRule('post', true, 'put', that.wait);
  that.addActionRule('post', true, 'get', that.wait);
  that.addActionRule('post', true, 'remove', that.wait);
  that.addActionRule('post', true, 'putAttachment', that.wait);
  that.addActionRule('post', false, 'post', that.update);
  that.addActionRule('post', false, 'put', that.wait);
  that.addActionRule('post', false, 'get', that.wait);
  that.addActionRule('post', false, 'remove', that.eliminate);
  that.addActionRule('post', false, 'putAttachment', that.wait);

  that.addActionRule('put', true, 'post', that.dontAccept);
  that.addActionRule('put', true, 'put', that.wait);
  that.addActionRule('put', true, 'get', that.wait);
  that.addActionRule('put', true, 'remove', that.wait);
  that.addActionRule('put', true, 'putAttachment', that.wait);
  that.addActionRule('put', false, 'post', that.dontAccept);
  that.addActionRule('put', false, 'put', that.update);
  that.addActionRule('put', false, 'get', that.wait);
  that.addActionRule('put', false, 'remove', that.eliminate);
  that.addActionRule('put', false, 'putAttachment', that.wait);

  that.addActionRule('get', true, 'post', that.wait);
  that.addActionRule('get', true, 'put', that.wait);
  that.addActionRule('get', true, 'get', that.dontAccept);
  that.addActionRule('get', true, 'remove', that.wait);
  that.addActionRule('get', true, 'putAttachment', that.wait);
  that.addActionRule('get', false, 'post', that.wait);
  that.addActionRule('get', false, 'put', that.wait);
  that.addActionRule('get', false, 'get', that.update);
  that.addActionRule('get', false, 'remove', that.wait);
  that.addActionRule('get', false, 'putAttachment', that.wait);

  that.addActionRule('remove', true, 'post', that.wait);
  that.addActionRule('remove', true, 'get', that.dontAccept);
  that.addActionRule('remove', true, 'remove', that.dontAccept);
  that.addActionRule('remove', true, 'putAttachment', that.dontAccept);
  that.addActionRule('remove', false, 'post', that.eliminate);
  that.addActionRule('remove', false, 'put', that.dontAccept);
  that.addActionRule('remove', false, 'get', that.dontAccept);
  that.addActionRule('remove', false, 'remove', that.update);
  that.addActionRule('remove', false, 'putAttachment', that.dontAccept);

  that.addActionRule('allDocs', true, 'allDocs', that.dontAccept);
  that.addActionRule('allDocs', false, 'allDocs', that.update);

  that.addActionRule('putAttachment', true, 'post', that.dontAccept);
  that.addActionRule('putAttachment', true, 'put', that.wait);
  that.addActionRule('putAttachment', true, 'get', that.wait);
  that.addActionRule('putAttachment', true, 'remove', that.wait);
  that.addActionRule('putAttachment', true, 'putAttachment', that.wait);
  that.addActionRule('putAttachment', false, 'post', that.dontAccept);
  that.addActionRule('putAttachment', false, 'put', that.wait);
  that.addActionRule('putAttachment', false, 'get', that.wait);
  that.addActionRule('putAttachment', false, 'remove', that.eliminate);
  that.addActionRule('putAttachment', false, 'putAttachment', that.update);
  // end adding rules
  ////////////////////////////////////////////////////////////////////////////
  return that;
}());
