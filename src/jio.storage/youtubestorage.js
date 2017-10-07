/**
 * Youtube (Data) Storage. Type = "youtube".
 */
/*global jIO, RSVP, UriTemplate, JSON, Query */
/*jslint nomen: true*/
(function (jIO, RSVP, UriTemplate, JSON, Query) {
  "use strict";

  var GET_URL = "https://www.googleapis.com/youtube/v3/videos?" +
      "part=snippet,statistics,contentDetails{&id}{&key}",
    GET_TEMPLATE = UriTemplate.parse(GET_URL),
    ALLDOCS_URL = "https://www.googleapis.com/youtube/v3/search?" +
      "part=snippet{&pageToken}&q={search}&type=video&maxResults=10{&key}",
    ALLDOCS_TEMPLATE = UriTemplate.parse(ALLDOCS_URL);

  function handleError(error, id) {
    if (error.target && error.target.status === 404) {
      throw new jIO.util.jIOError("Cannot find document: " + id, 404);
    }
    throw error;
  }

  function getValue(query_list, key) {
    var i;
    for (i = 0; i < query_list.length; i += 1) {
      if (query_list[i].key === key) {
        return query_list[i].value;
      }
    }
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
      })
      .push(undefined, function (error) {
        if (error.target && error.target.status === 404) {
          throw new jIO.util.jIOError("Cannot find document: " + id, 404);
        }
        throw error;
      });
  };

  YoutubeStorage.prototype.buildQuery = function (options) {
    var key,
      query;
    if (options.query === undefined) {
      throw new jIO.util.jIOError("query parameter is required",
                                    400);
    }
    key = this._api_key;
    query = Query.parseStringToObject(options.query);
    return new RSVP.Queue()
      .push(function () {
        var token,
          search;

        if (query.type === "simple") {
          search = query.value;
          token = "";
        } else {
          search = getValue(query.query_list, "q");
          token = getValue(query.query_list, "token");
        }

        return jIO.util.ajax({
          "type": "GET",
          "url": ALLDOCS_TEMPLATE.expand({
            "search": search,
            "key": key,
            "pageToken": token
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

}(jIO, RSVP, UriTemplate, JSON, Query));
