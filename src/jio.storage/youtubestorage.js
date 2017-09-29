/**
 * Youtube (Data) Storage. Type = "youtube".
 */
/*global jIO, RSVP, UriTemplate, JSON*/
/*jslint nomen: true*/
(function (jIO, RSVP, UriTemplate, JSON) {
  "use strict";

  var GET_URL = "https://www.googleapis.com/youtube/v3/videos?" +
    "part=snippet,statistics,contentDetails{&id}{&key}";
  var GET_TEMPLATE = UriTemplate.parse(GET_URL);
  var ALLDOCS_URL = "https://www.googleapis.com/youtube/v3/search?" +
    "part=snippet{&pageToken}&q={search}&type=video&maxResults=10{&key}";
  var ALLDOCS_TEMPLATE = UriTemplate.parse(ALLDOCS_URL);

  function handleError(error, id) {
    if (error.target && error.target.status === 404) {
      throw new jIO.util.jIOError("Cannot find document: " + id, 404);
    }
    throw error;
  }

  /**
   * The JIO Youtube Storage extension
   *
   * @class YoutubeStorage
   * @constructor
   */
  function YoutubeStorage(spec) {
    if (spec === undefined || spec.api_key === undefined ||
        typeof spec.api_key !== 'string') {
      throw new TypeError("API Key must be a string " +
                          "which contains more than one character.");
    }
    this._api_key = spec.api_key;
    return;
  }

  YoutubeStorage.prototype.get = function (id) {
    var key = this._api_key;
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          type: "GET",
          url: GET_TEMPLATE.expand({
            "id": id,
            "key": key
          })
        });
      })
      .push(function (evt) {
        return JSON.parse(evt.target.response || evt.target.responseText);
      }, handleError);
  };

  YoutubeStorage.prototype.buildQuery = function (options) {
    var key = this._api_key;
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          "type": "GET",
          "url": ALLDOCS_TEMPLATE.expand({
            "search": options.query,
            "key": key,
            "pageToken": options.token || ""
          })
        });
      })
      .push(function (data) {
        var obj = JSON.parse(data.target.response || data.target.responseText),
          i;
        for (i = 0; i < obj.items.length; i += 1) {
          obj.items[i].value = {};
        }
        obj.items.nextPageToken = obj.nextPageToken;
        return obj.items;

      }, handleError);
  };

  YoutubeStorage.prototype.hasCapacity = function (name) {
    return ((name === "list") || (name === "include") || (name === "query"));
  };

  jIO.addStorage('youtube', YoutubeStorage);

} (jIO, RSVP, UriTemplate, JSON));
