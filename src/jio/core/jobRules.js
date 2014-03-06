/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global exports, defaults */

// adds
// - jIO.addJobRuleCondition(name, function)

function addJobRuleCondition(name, method) {
  if (typeof name !== 'string') {
    throw new TypeError("jIO.addJobRuleAction(): " +
                        "Argument 1 is not of type 'string'");
  }
  if (typeof method !== 'function') {
    throw new TypeError("jIO.addJobRuleAction(): " +
                        "Argument 2 is not of type 'function'");
  }
  if (defaults.job_rule_conditions[name]) {
    throw new TypeError("jIO.addJobRuleAction(): Action already exists");
  }
  defaults.job_rule_conditions[name] = method;
}
exports.addJobRuleCondition = addJobRuleCondition;
