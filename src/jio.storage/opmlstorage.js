/*
 * Copyright 2016, Nexedi SA
 * Released under the LGPL license.
 * http://www.gnu.org/licenses/lgpl.html
 */

/*jslint nomen: true*/
/*global jIO, RSVP, DOMParser */

(function (jIO, RSVP, DOMParser) {
  "use strict";

  var dummy = {getAttribute: function () { return; }};

  function getOpmlOutlineAsDict(outline) {
    var outline_dict = {
      title: outline.getAttribute('title') || dummy.textContent,
      htmlurl: outline.getAttribute('htmlUrl') || dummy.textContent,
      xmlurl: outline.getAttribute('xmlUrl') || dummy.textContent,
      url: outline.getAttribute('url') || dummy.textContent,
      text: outline.getAttribute('text') || dummy.textContent,
      type: outline.getAttribute('type') || dummy.textContent,
      version: outline.getAttribute('version') || dummy.textContent,
      created: outline.getAttribute('created') || dummy.textContent,
      category: outline.getAttribute('category') || dummy.textContent
    };
    return outline_dict;
  }

  function getOpmlDocumentId(outline) {
    return outline.getAttribute('url') ||
      outline.getAttribute('htmlUrl') ||
      outline.getAttribute('xmlUrl') || '';
  }

  function getOpmlHeadAsDict(doc) {
    var element;

    function getElementsByTagName(name) {
      return (doc.getElementsByTagName(name)[0] || dummy).textContent;
    }

    element = {
      opml_title: getElementsByTagName('title'),
      created_date: getElementsByTagName('dateCreated'),
      modified_date: getElementsByTagName('dateModified'),
      owner_name: getElementsByTagName('ownerName'),
      owner_email: getElementsByTagName('ownerEmail'),
      opml_link: getElementsByTagName('link')
    };
    return element;
  }

  function getOpmlElement(doc, id) {
    var outline_list = doc.getElementsByTagName('outline'),
      i,
      max,
      element = getOpmlHeadAsDict(doc);

    for (i = 0, max = outline_list.length; i < max; i += 1) {
      if (outline_list[i].getAttribute('htmlUrl') === id ||
          outline_list[i].getAttribute('xmlUrl') === id ||
          outline_list[i].getAttribute('url') === id) {
        Object.assign(element, getOpmlOutlineAsDict(outline_list[i]));
        break;
      }
    }
    return element;
  }


  function getOpmlElementList(doc, options) {
    var i,
      max,
      tmp_id,
      push_method,
      opml_head = {},
      opml_list = [],
      outline_list = doc.getElementsByTagName('outline');

    if (options.include_docs === true) {
      opml_head = getOpmlHeadAsDict(doc);
      push_method = function (id, outline) {
        var element = getOpmlOutlineAsDict(outline);
        Object.assign(element, opml_head);
        opml_list.push({
          "id": id,
          "value": {},
          "doc": element
        });
      };
    } else {
      push_method = function (id) {
        opml_list.push({
          "id": id,
          "value": {}
        });
      };
    }

    for (i = 0, max = outline_list.length; i < max; i += 1) {

      if (!outline_list[i].hasChildNodes()) {
        tmp_id = getOpmlDocumentId(outline_list[i]);
        if (tmp_id !== '') {
          push_method(tmp_id, outline_list[i]);
        }
      }
    }
    return opml_list;
  }

  function parseOpmlFeed(feed_url, id, options) {
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
          result;
        if (!response.target.responseText) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        element =  new DOMParser().parseFromString(
          response.target.responseText,
          "text/xml"
        );
        if (id !== undefined && id !== null) {
          result = getOpmlElement(element, id);
          if (result === undefined) {
            throw new jIO.util.jIOError("Cannot find document", 404);
          }
          return result;
        }
        if (!options) {
          options = {};
        }
        return getOpmlElementList(element, options);
      }, function (error) {
        if ((error.target !== undefined) &&
            (error.target.status === 404)) {
          throw new jIO.util.jIOError("Cannot find document", 404);
        }
        throw error;
      });
  }

  /**
   * The JIO OPML Storage extension
   *
   * @class OPMLStorage
   * @constructor
   */
  function OPMLStorage(spec) {
    if (typeof spec.url !== 'string') {
      throw new TypeError("OPMLStorage 'url' is not of type string");
    }
    this._url = spec.url;
  }

  OPMLStorage.prototype.get = function (id) {
    return parseOpmlFeed(this._url, id);
  };

  OPMLStorage.prototype.hasCapacity = function (capacity) {
    return (capacity === "list") || (capacity === "include");
  };

  OPMLStorage.prototype.buildQuery = function (options) {
    return parseOpmlFeed(this._url, undefined, options);
  };

  jIO.addStorage('opml', OPMLStorage);

}(jIO, RSVP, DOMParser));
