(function (jIO, RSVP, UriTemplate) {
  "use strict";

  var GET_POST_URL = "https://graph.facebook.com/v2.9/{+post_id}" +
      "?access_token={+access_token}",
      get_post_template = UriTemplate.parse(GET_POST_URL),
      GET_FEED_URL = "https://graph.facebook.com/v2.9/{+user_id}/feed" +
      "?fields={+fields}&access_token={+access_token}",
      get_feed_template = UriTemplate.parse(GET_FEED_URL);
      
  function FBStorage(spec) {
    if (typeof spec.access_token !== 'string' || !spec.access_token) {
      throw new TypeError("Access Token' must be a string " +
                          "which contains more than one character.");
    }
    if (typeof spec.user_id !== 'string' || !spec.user_id) {
      throw new TypeError("User ID' must be a string " +
                          "which contains more than one character.");
    }
    this._access_token = spec.access_token;
    this._user_id = spec.user_id;
  }
  
  FBStorage.prototype.get = function (id) {
    var that = this;
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          type: "GET",
          url: get_post_template.expand({post_id: id, access_token: that._access_token})
        })
      })
  };

  jIO.addStorage('FBStorage', FBStorage);

}(jIO, RSVP, UriTemplate));