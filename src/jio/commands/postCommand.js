/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global command: true */
var postCommand = function (spec, my) {
  var that = command(spec, my);

  spec = spec || {};
  my = my || {};

  // Methods //
  that.getLabel = function () {
    return 'post';
  };

  that.validateState = function () {
    if (that.getAttachmentId() !== undefined) {
      that.error({
        "status": 21,
        "statusText": "Invalid Document Id",
        "error": "invalid_document_id",
        "message": "The document id contains '/' characters " +
          "which are forbidden",
        "reason": "Document id contains '/' character(s)"
      });
      return false;
    }
    return true;
  };
  that.executeOn = function (storage) {
    storage.post(that);
  };
  return that;
};