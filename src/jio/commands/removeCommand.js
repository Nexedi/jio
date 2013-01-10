/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global command: true */
var removeCommand = function (spec, my) {
  var that = command(spec, my);
  spec = spec || {};
  my = my || {};
  // Attributes //
  // Methods //
  that.getLabel = function () {
    return 'remove';
  };

  that.validateState = function () {
    if (!(typeof that.getDocId() === "string" && that.getDocId() !==
        "")) {
      that.error({
        "status": 20,
        "statusText": "Document Id Required",
        "error": "document_id_required",
        "message": "The document id is not provided",
        "reason": "Document id is undefined"
      });
      return false;
    }
    if (typeof that.getAttachmentId() === "string") {
      if (that.getAttachmentId() === "") {
        that.error({
          "status": 23,
          "statusText": "Invalid Attachment Id",
          "error": "invalid_attachment_id",
          "message": "The attachment id must not be an empty string",
          "reason": "Attachment id is empty"
        });
        return false;
      }
    }
    return true;
  };

  that.executeOn = function (storage) {
    storage.remove(that);
  };

  return that;
};