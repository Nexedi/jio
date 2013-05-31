/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global command: true */
var getAttachmentCommand = function (spec, my) {
  var that = command(spec, my);
  spec = spec || {};
  my = my || {};
  // Attributes //
  // Methods //
  that.getLabel = function () {
    return 'getAttachment';
  };

  that.executeOn = function (storage) {
    storage.getAttachment(that);
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
    if (typeof that.getAttachmentId() !== "string") {
      that.error({
        "status": 22,
        "statusText": "Attachment Id Required",
        "error": "attachment_id_required",
        "message": "The attachment id must be set",
        "reason": "Attachment id not set"
      });
      return false;
    }
    if (that.getAttachmentId() === "") {
      that.error({
        "status": 23,
        "statusText": "Invalid Attachment Id",
        "error": "invalid_attachment_id",
        "message": "The attachment id must not be an empty string",
        "reason": "Attachment id is empty"
      });
    }
    return true;
  };

  return that;
};
