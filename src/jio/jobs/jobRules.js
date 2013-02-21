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
  Object.defineProperty(that, "ok", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function () {
      return 'none';
    }
  });
  that.default_action = that.ok;
  that.default_compare = function (job1, job2) {
    return job1.getId() !== job2.getId() &&
      job1.getStatus().getLabel() !== "done" &&
      job1.getStatus().getLabel() !== "fail" &&
      JSON.stringify(job1.getStorage().serialized()) ===
      JSON.stringify(job2.getStorage().serialized());
  };

  // Compare Functions //

  Object.defineProperty(that, "sameDocumentId", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function (job1, job2) {
      return job1.getCommand().getDocId() === job2.getCommand().getDocId();
    }
  });

  Object.defineProperty(that, "sameRevision", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function (job1, job2) {
      return job1.getCommand().getDocInfo("_rev") ===
        job2.getCommand().getDocInfo("_rev");
    }
  });

  Object.defineProperty(that, "sameAttachmentId", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function (job1, job2) {
      return job1.getCommand().getAttachmentId() ===
        job2.getCommand().getAttachmentId();
    }
  });

  Object.defineProperty(that, "sameDocument", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function (job1, job2) {
      return JSON.stringify(job1.getCommand().cloneDoc()) ===
        JSON.stringify(job2.getCommand().cloneDoc());
    }
  });

  Object.defineProperty(that, "sameOption", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function (job1, job2) {
      return JSON.stringify(job1.getCommand().cloneOption()) ===
        JSON.stringify(job2.getCommand().cloneOption());
    }
  });

  // Methods //
  /**
   * Returns an action according the jobs given in parameters.
   * @method getAction
   * @param  {object} job1 The already existant job.
   * @param  {object} job2 The job to compare with.
   * @return {string} An action string.
   */
  priv.getAction = function (job1, job2) {
    var method1, method2, tmp = priv.action, i, j, condition_list = [], res;
    method1 = job1.getCommand().getLabel();
    method2 = job2.getCommand().getLabel();
    tmp = tmp[method1] = tmp[method1] || {};
    tmp = tmp[method2] = tmp[method2] || [];
    for (i = 0; i < tmp.length; i += 1) {
      // browsing all method1 method2 rules
      condition_list = tmp[i].condition_list;
      res = true;
      for (j = 0; j < condition_list.length; j += 1) {
        // test all the rule's conditions
        if (!condition_list[j](job1, job2)) {
          res = false;
          break;
        }
      }
      if (res) {
        // if all respects condition list, then action
        return tmp[i].rule();
      }
    }
    return that.default_action();
  };

  /**
   * Checks if the two jobs are comparable.
   * @method canCompare
   * @param  {object} job1 The already existant job.
   * @param  {object} job2 The job to compare with.
   * @return {boolean} true if comparable, else false.
   */
  priv.canCompare = function (job1, job2) {
    var method1, method2;
    method1 = job1.getCommand().getLabel();
    method2 = job2.getCommand().getLabel();
    if (priv.compare[method1] && priv.compare[method1][method2]) {
      return priv.compare[method1][method2](job1, job2);
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
    value: function (method1, method2, condition_list, rule) {
      var tmp = priv.action;
      tmp = tmp[method1] = tmp[method1] || {};
      tmp = tmp[method2] = tmp[method2] || [];
      tmp.push({
        "condition_list": condition_list,
        "rule": rule
      });
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
    Rules
    original job |job to add |condition                                |action

    post          post        same doc                                  update
      "             "         same docid, same rev                      wait
      "           put         same doc                                  update
      "             "         same docid, same rev                      wait
      "           putA                  "                               wait
      "           remove                "                                 "
    put           post        same doc                                  update
      "             "         same docid, same rev                      wait
      "           put         same doc                                  update
      "             "         same docid, same rev                      wait
      "           putA                  "                                 "
      "           remove                "                                 "
    putA          post        same docid, same rev                      wait
      "           put                   "                                 "
      "           putA        same doc                                  update
      "             "         same docid, same rev, same attmt          wait
      "           remove      same docid, same rev                        "
    remove        post        same docid, same rev                      wait
      "           put                   "                                 "
      "           putA                  "                                 "
      "           remove                "                               update
    get           get         same doc, same options                    update
    allDocs       allDocs     same doc, same options                    update
   */

  that.addActionRule("post", "post", [that.sameDocument], that.update);
  that.addActionRule("post", "post",
                     [that.sameDocumentId, that.sameRevision], that.wait);
  that.addActionRule("post", "put", [that.sameDocument], that.update);
  that.addActionRule("post", "put",
                     [that.sameDocumentId, that.sameRevision], that.wait);
  that.addActionRule("post", "putAttachment",
                     [that.sameDocumentId, that.sameRevision], that.wait);
  that.addActionRule("post", "remove",
                     [that.sameDocumentId, that.sameRevision], that.wait);

  that.addActionRule("put", "post", [that.sameDocument], that.update);
  that.addActionRule("put", "post",
                     [that.sameDocumentId, that.sameRevision], that.wait);
  that.addActionRule("put", "put", [that.sameDocument], that.update);
  that.addActionRule("put", "put",
                     [that.sameDocumentId, that.sameRevision], that.wait);
  that.addActionRule("put", "putAttachment",
                     [that.sameDocumentId, that.sameRevision], that.wait);
  that.addActionRule("put", "remove",
                     [that.sameDocumentId, that.sameRevision], that.wait);

  that.addActionRule("putAttachment", "post",
                     [that.sameDocumentId, that.sameRevision], that.wait);
  that.addActionRule("putAttachment", "put",
                     [that.sameDocumentId, that.sameRevision], that.wait);
  that.addActionRule("putAttachment", "putAttachment", [that.sameDocument],
                     that.update);
  that.addActionRule("putAttachment", "putAttachment", [
    that.sameDocumentId,
    that.sameRevision,
    that.sameAttachmentId
  ], that.wait);
  that.addActionRule("putAttachment", "remove",
                     [that.sameDocumentId, that.sameRevision], that.wait);

  that.addActionRule("remove", "post",
                     [that.sameDocumentId, that.sameRevision], that.wait);
  that.addActionRule("remove", "put",
                     [that.sameDocumentId, that.sameRevision], that.wait);
  that.addActionRule("remove", "putAttachment",
                     [that.sameDocumentId, that.sameRevision], that.wait);
  that.addActionRule("remove", "remove",
                     [that.sameDocumentId, that.sameRevision], that.update);

  that.addActionRule("get", "get",
                     [that.sameDocument, that.sameOption], that.update);
  that.addActionRule("allDocs", "allDocs",
                     [that.sameDocument, that.sameOption], that.update);

  // end adding rules
  ////////////////////////////////////////////////////////////////////////////
  return that;
}());
