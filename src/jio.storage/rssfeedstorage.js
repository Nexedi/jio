/*
 * Copyright 2016, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint nomen: true*/
/*global jIO, RSVP, DOMParser */

// JIO Rss Storage Description :
// {
//   type: "rss",
//   url: {string}
// }


(function (jIO, RSVP, DOMParser) {
  "use strict";

  var dummy = {getAttribute: function () { return; }};

  function selectElement(element, selector) {
    return (element.querySelector(selector) || dummy);
  }

  function getRssHeaderItemDict(element) {
    var rss_channel = element.querySelector("rss > channel"),
      feed_channel;

    feed_channel = {
      siteTitle: selectElement(
        rss_channel,
        "title"
      ).textContent,
      reference: selectElement(
        rss_channel,
        "description"
      ).textContent,
      siteLink: selectElement(
        rss_channel,
        "link"
      ).textContent,
      lastBuildDate: selectElement(
        rss_channel,
        "lastBuildDate"
      ).textContent,
      siteGenerator: selectElement(
        rss_channel,
        "generator"
      ).textContent,
      siteDocs: selectElement(
        rss_channel,
        "docs"
      ).textContent
    };

    return feed_channel;
  }

  function getFeedItem(entry) {
    var item;

    item = {
      link: selectElement(entry, "link").textContent,
      date: selectElement(entry, "pubDate").textContent,
      title: selectElement(entry, "title").textContent,
      author: selectElement(entry, "author").textContent,
      category: selectElement(entry, "category").textContent,
      comments: selectElement(entry, "comments").textContent,
      sourceUrl: selectElement(entry, "source").getAttribute('url'),
      source: selectElement(entry, "source").textContent,
      description: selectElement(entry, "description").textContent,
      guid: selectElement(entry, "guid").textContent
    };
    return item;
  }

  function getRssFeedEntry(element, id) {
    var item,
      rss_guid_list,
      i;

    if (id !== undefined && id !== null) {

      rss_guid_list = element.querySelectorAll("rss>channel>item>guid");

      for (i = 0; i < rss_guid_list.length; i += 1) {
        if (rss_guid_list[i].textContent === id) {
          item = getFeedItem(rss_guid_list[i].parentNode);
          Object.assign(item, getRssHeaderItemDict(element));
          break;
        }
      }
    }
    return item;
  }

  function getRssFeedEntryList(element, options) {
    var rss_entry_list,
      item_list = [],
      push_method,
      feed_channel;

    if (options.include_docs === true) {
      feed_channel = getRssHeaderItemDict(element);
      push_method = function (id, entry) {
        var item;

        if (!id) {
          return;
        }
        item = getFeedItem(entry);
        Object.assign(item, feed_channel);
        item_list.push({
          "id": id,
          "value": {},
          "doc": item
        });
      };
    } else {
      push_method = function (id) {
        if (!id) {
          return;
        }
        item_list.push({
          "id": id,
          "value": {}
        });
      };
    }

    rss_entry_list = element.querySelectorAll("rss > channel > item");
    [].forEach.call(rss_entry_list, function (entry) {
      push_method(
        selectElement(entry, "guid").textContent,
        entry
      );
    });
    return item_list;
  }

  function parseRssFeed(feed_url, id, options) {

    return new RSVP.Queue()
      .push(function () {
        return jIO.util.ajax({
          type: "GET",
          url: feed_url,
          dataType: "text"
        });
      })
      .push(function (response) {
        var element,
          item;
        element =  new DOMParser().parseFromString(
          response.target.responseText,
          "text/xml"
        );
        if (id !== undefined && id !== null) {
          item = getRssFeedEntry(element, id);
          if (item === undefined) {
            throw new jIO.util.jIOError("Cannot find document", 404);
          }
          return item;
        }
        if (!options) {
          options = {};
        }
        return getRssFeedEntryList(element, options);
      }, function (error) {
        if ((error.target !== undefined) &&
            (error.target.status === 404)) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        throw error;
      });
  }

  /**
   * The JIO RSSStorage Storage extension
   *
   * @class RSSStorage
   * @constructor
   */
  function RSSStorage(spec) {
    if (typeof spec.url !== 'string') {
      throw new TypeError("RSSStorage 'url' is not of type string");
    }
    this._url = spec.url;
  }

  RSSStorage.prototype.get = function (id) {
    return parseRssFeed(this._url, id);
  };

  RSSStorage.prototype.hasCapacity = function (capacity) {
    return (capacity === "list") || (capacity === 'include');
  };

  RSSStorage.prototype.buildQuery = function (options) {
    return parseRssFeed(this._url, undefined, options);
  };

  jIO.addStorage('rss', RSSStorage);

}(jIO, RSVP, DOMParser));
