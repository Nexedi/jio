/*
 * Copyright 2017, ClearRoad Inc.
 * 
 * Authors: Aurélien Vermylen
 */
/**
 * JIO Automatic API Storage. Type = "automaticapi".
 * Automatic "handler" storage.
 */
/*global URI, Blob, jIO, RSVP, UriTemplate*/
/*jslint nomen: true*/

(function (jIO, RSVP, UriTemplate, URI, Blob) {
  'use strict';
  // Some Automatic API related constants.
  var AUTOMATIC_BASE_PROTOCOL = 'https',
    AUTOMATIC_BASE_DOMAIN = 'api.automatic.com',
    AUTOMATIC_BASE_URI = AUTOMATIC_BASE_PROTOCOL + '://'
                         + AUTOMATIC_BASE_DOMAIN,
    AUTOMATIC_VALID_ENDPOINT_REGEXES = [/^\/trip(\/T_\w*|)\/$/,
      /^\/user\/me(\/device(\/\w*|)|)\/$/,
      /^\/user\/U_\w*(\/device(\/\w*|)|)\/$/,
      /^\/vehicle(\/C_\w*(\/mil|)|)\/$/],
    AUTOMATIC_VALID_ENDPOINTID_REGEXES = [/^\/trip\/T_\w*\/$/,
      /^\/user\/me\/device\/\w*\/$/,
      /^\/user\/U_\w*\/device\/\w*\/$/,
      /^\/vehicle\/C_\w*\/$/],
    automatic_template = UriTemplate.parse(AUTOMATIC_BASE_URI +
      '{/endpoint*}');

  // Check validity of endpoint.
  function checkEndpoint(endpoint) {
    var i;
    for (i = 0; i < AUTOMATIC_VALID_ENDPOINT_REGEXES.length; i += 1) {
      if (AUTOMATIC_VALID_ENDPOINT_REGEXES[i].test(endpoint)) {
        return true;
      }
    }
    return false;
  }

  // Check that ids match a valid Automatic API id
  function checkEndpointAsId(endpoint) {
    var i;
    for (i = 0; i < AUTOMATIC_VALID_ENDPOINTID_REGEXES.length; i += 1) {
      if (AUTOMATIC_VALID_ENDPOINTID_REGEXES[i].test(endpoint)) {
        return true;
      }
    }
    return false;
  }

  function _queryAutomaticAPI(endpoint, filters, jio) {
    var result = [],
      type = endpoint.split('/')[1],
      promises,
      dev = filters.device || 'all',
      isId = checkEndpointAsId(endpoint),
      device_dict = {},
      i;
    // Remove 'device' filter which should not be put in Automatic request.
    delete filters.device;
    // Check endpoint validity.
    if (!checkEndpoint(endpoint)) {
      throw new jIO.util.jIOError('Wrong Automatic API query. (usually ' +
        'caused by wrong "id" or "type")', 400);
    }
    // Handle /user/me/device/ endpoint, which would be put as user, but
    // is actually a device query.
    if (endpoint === '/user/me/device/') {
      type = 'device';
    }
    // Promise chain to handle multi-part response ("_metadata"->"next" parts).
    function treatNext(returned) {
      var data,
        device_id,
        next;
      // If the returned value was an error, return it (-> quite nasty design 
      // to have to return errors, but this is in order for all RSVP.all() to
      // continue till the end.
      if (returned instanceof jIO.util.jIOError) {
        return returned;
      }
      data = returned[0];
      device_id = device_dict[returned[1]];
      data = [data];
      if (!isId) {
        if (data[0]._metadata === undefined) {
          return new jIO.util.jIOError('Malformed Automatic API result.', 500);
        }
        next = data[0]._metadata.next;
        data = data[0].results;
      }
      return RSVP.Queue().push(function () {
        return RSVP.all(data.map(function (dat) {
          var path, temp;
          path = URI(dat.url).path();
          temp = {
            'automatic_path': path,
            'reference': '/' + device_id + path,
            'id': '/' + device_id + path,
            'type': type,
            'start_date': dat.started_at || null,
            'stop_date': dat.ended_at || null,
            'automatic_device': device_id
          };
          result.push(temp);
          return jio._cache.put('/' + device_id + path, temp).push(function () {
            return jio._cache.putAttachment('/' + device_id + path, 'data',
              new Blob([JSON.stringify(dat)], {type:
                'text/plain'}));
          });
        }));
      }).push(function () {
        if (next === undefined || next === null) {
          return true;
        }
        return RSVP.Queue().push(function () {
          return jIO.util.ajax({
            'type': 'GET',
            'url': next,
            'headers': {'Authorization': 'Bearer ' + returned[1]}
            //'xhrFields': {withCredentials: true}
          });
        }).push(function (response) {
          return [JSON.parse(response.target.responseText), returned[1]];
        }, function (response) {
          return new jIO.util.jIOError(
            response.target.responseText,
            response.target.status
          );
        }).push(treatNext);
      }, function (error) {
        return error;
      });
    }
    // Start of the promise chain per token.
    promises = jio._access_tokens.map(function (token) {
      return new RSVP.Queue().push(function () {
        return jIO.util.ajax({
          'type': 'GET',
          'url': automatic_template.expand({endpoint: ['user', 'me', 'device',
            '']}),
          'headers': {'Authorization': 'Bearer ' + token}
          //'xhrFields': {withCredentials: true}
        });
      }).push(function (respdev) {
        var temp = JSON.parse(respdev.target.responseText);
        if (temp.results.length === 0) {
          return new jIO.util.jIOError(
            'No device associated to this account yet.',
            200
          );
        }
        device_dict[token] = temp.results[0].id;
        if (dev === 'all' || dev === device_dict[token]) {
          return jIO.util.ajax({
            'type': 'GET',
            'url': URI(automatic_template.expand({endpoint:
              endpoint.split('/').splice(1)})).search(filters).toString(),
            'headers': {'Authorization': 'Bearer ' + token}
            //'xhrFields': {withCredentials: true}
          });
        }
        return new jIO.util.jIOError('Ignored.', 200);
      }).push(function (response) {
        if (response instanceof jIO.util.jIOError) {
          return response;
        }
        return [JSON.parse(response.target.responseText), token];
      }, function (response) {
        return new jIO.util.jIOError(
          response.target.responseText,
          response.target.status
        );
      }).push(treatNext);
    });
    return new RSVP.Queue().push(function () {
      return RSVP.all(promises);
    }).push(function (trueOrErrorArray) {
      // If we queried an id, return results should be length 1
      if (isId && (dev !== 'all')) {
        if (result.length === 1) {
          return result[0];
        }
        if (result.length > 1) {
          throw new jIO.util.jIOError('Automatic API returned more' +
            ' than one result for id endpoint', 500);
        }
        // Result is empty, so we throw the correct token error.
        i = jio._access_tokens.map(function (token) {
          if (device_dict[token] === dev) {
            return true;
          }
          return false;
        }).indexOf(true);
        if (i < trueOrErrorArray.length && i > -1 &&
            trueOrErrorArray[i] instanceof jIO.util.jIOError) {
          throw trueOrErrorArray[i];
        }
        // If we didn't find the error in the promise returns, we don't have
        // a token for device dev.
        throw new jIO.util.jIOError('No valid token for device: ' + dev, 400);
      }
      // Otherwise return results and errors and let caller handle.
      return result;
    });
  }
  /**
   * The Automatic API Storage extension
   *
   * @class AutomaticAPIStorage
   * @constructor
   */
  function AutomaticAPIStorage(spec) {
    var i;
    if (typeof spec.access_tokens !== 'object' || !spec.access_tokens) {
      throw new TypeError('Access Tokens must be a non-empty array.');
    }
    for (i = 0; i < spec.access_tokens.length; i += 1) {
      if (typeof spec.access_tokens[i] !== 'string' || !spec.access_tokens[i]) {
        throw new jIO.util.jIOError('Access Tokens must be' +
          ' an array of non-empty strings.', 400);
      }
    }

    this._access_tokens = spec.access_tokens;
    this._cache = jIO.createJIO({type: 'memory'});
  }

  AutomaticAPIStorage.prototype.get = function (id) {
    var self = this,
      endpoint = id.split('/'),
      dev;
    dev = endpoint.splice(1, 1)[0];
    endpoint = endpoint.join('/');
    if (id.indexOf('/') !== 0) {
      throw new jIO.util.jIOError('id ' + id +
        ' is forbidden (not starting with /)', 400);
    }
    if (id.lastIndexOf("/") !== (id.length - 1)) {
      throw new jIO.util.jIOError('id ' + id +
        ' is forbidden (not ending with /)', 400);
    }
    if (!checkEndpointAsId(endpoint)) {
      throw new jIO.util.jIOError('Invalid id.', 400);
    }
    if (dev === 'all') {
      throw new jIO.util.jIOError('Invalid id.', 400);
    }
    return this._cache.get(id).push(function (res) {
      return res;
    }, function () {
      return _queryAutomaticAPI(endpoint, {'device': dev}, self)
        .push(function (res) {
          return res;
        }, function (err) {
          throw new jIO.util.jIOError('Cannot find document: ' + id +
            ', Error: ' + err.message, 404);
        });
    });
  };

  AutomaticAPIStorage.prototype.put = function (id, doc) {
    var self = this;
    return new RSVP.Queue().push(function () {
      return self._cache.get(id);
    }).push(function () {
      return self._cache.put(id, doc);
    }, function () {
      return;
    });
  };

  AutomaticAPIStorage.prototype.post = function () {
    return;
  };

  AutomaticAPIStorage.prototype.remove = function () {
    // Must do nothing to be able to use with use_remote_post!
    return;
  };

  AutomaticAPIStorage.prototype.getAttachment = function (id, name, options) {
    var self = this,
      endpoint = id.split('/'),
      dev;
    dev = endpoint.splice(1, 1)[0];
    endpoint = endpoint.join('/');
    if (id.indexOf('/') !== 0) {
      throw new jIO.util.jIOError('id ' + id +
        ' is forbidden (not starting with /)', 400);
    }
    if (id.lastIndexOf("/") !== (id.length - 1)) {
      throw new jIO.util.jIOError('id ' + id +
        ' is forbidden (not ending with /)', 400);
    }
    if (!checkEndpointAsId(endpoint)) {
      throw new jIO.util.jIOError('Invalid id.', 400);
    }
    if (dev === 'all') {
      throw new jIO.util.jIOError('Invalid id.', 400);
    }
    return this._cache.get(id).push(function () {
      return self._cache.getAttachment(id, name, options);
    }, function () {
      return self.get(id)
        .push(function () {
          return self._cache.getAttachment(id, name, options);
        });
    });
  };

  AutomaticAPIStorage.prototype.putAttachment = function (id, name, blob) {
    var self = this;
    return new RSVP.Queue().push(function () {
      return self._cache.get(id);
    }).push(function () {
      return self._cache.putAttachment(id, name, blob);
    }, function () {
      return;
    });
  };

  AutomaticAPIStorage.prototype.removeAttachment = function () {
    return;
  };

  AutomaticAPIStorage.prototype.allAttachments = function (id) {
    var endpoint = id.split('/'),
      dev;
    dev = endpoint.splice(1, 1)[0];
    endpoint = endpoint.join('/');
    if (id.indexOf('/') !== 0) {
      throw new jIO.util.jIOError('id ' + id +
        ' is forbidden (not starting with /)', 400);
    }
    if (id.lastIndexOf("/") !== (id.length - 1)) {
      throw new jIO.util.jIOError('id ' + id +
        ' is forbidden (not ending with /)', 400);
    }
    if (!checkEndpointAsId(endpoint)) {
      throw new jIO.util.jIOError('Invalid id.', 400);
    }
    if (dev === 'all') {
      throw new jIO.util.jIOError('Invalid id.', 400);
    }
    return {data: null};
  };

  AutomaticAPIStorage.prototype.repair = function () {
    return;
  };

  AutomaticAPIStorage.prototype.hasCapacity = function (name) {
    return ((name === 'list') || (name === 'query'));
  };

  AutomaticAPIStorage.prototype.buildQuery = function (options) {
    var parsed_query = jIO.QueryFactory.create(options.query ||
      'type:="trip"'),
      key_list,
      automatic_filters = {},
      simplequery_type_value,
      intercept_keys = ['start_date', 'stop_date', 'device',
        'vehicle'],
      intercept_keys_automatic_name = ['started_at', 'ended_at', 'device',
        'vehicle'],
      intercept_accepted_operators = [['>', '>=', '<', '<='],
        ['>', '>=', '<', '<='], ['='], ['=']],
      temp_operator_index,
      temp_key,
      automatic_endpoint,
      i,
      j;

    // XXX: check if there is no built-in method to seek in queries for
    // specific keys...
    function extractKeysFromQuery(quer) {
      var keys_list = [],
        i;
      if (quer.type === 'complex') {
        for (i = 0; i < quer.query_list.length; i += 1) {
          keys_list = keys_list.concat(
            extractKeysFromQuery(quer.query_list[i])
          );
        }
      } else if (quer.type === 'simple') {
        keys_list.push(quer.key);
      }
      return keys_list;
    }

    function findSimpleQueryForKey(key, quer) {
      var temp,
        result = [],
        i;
      if (quer.type === 'complex') {
        for (i = 0; i < quer.query_list.length; i += 1) {
          temp = findSimpleQueryForKey(key, quer.query_list[i]);
          if (temp !== undefined) {
            result = result.concat(temp);
          }
        }
      } else if (quer.type === 'simple' && quer.key === key) {
        result.push([quer.operator, quer.value]);
      }
      return result;
    }

    key_list = extractKeysFromQuery(parsed_query);

    // main loop that forms the filters to pass on to the HTTP call.
    for (i = 0; i < intercept_keys.length; i += 1) {
      if (key_list.indexOf(intercept_keys[i]) > -1) {
        simplequery_type_value = findSimpleQueryForKey(intercept_keys[i],
          parsed_query);
        for (j = 0; j < simplequery_type_value.length; j += 1) {
          temp_operator_index = intercept_accepted_operators[i].indexOf(
            simplequery_type_value[j][0]
          );
          if (temp_operator_index > -1) {
            if (i < 2) {
              temp_key = intercept_keys_automatic_name[i] +
                (temp_operator_index < 2 ? '__gte' : '__lte');
              automatic_filters[temp_key] = (new Date(
                simplequery_type_value[j][1]
              ).getTime() / 1000).toString();
            } else {
              temp_key = intercept_keys[i];
              automatic_filters[temp_key] = simplequery_type_value[j][1];
            }
          }
        }
      }
    }
    // Remove the 'type = value' query part: XXX -> add id retrieval!
    simplequery_type_value = findSimpleQueryForKey('type', parsed_query);
    if (simplequery_type_value.length === 0) {
      throw new jIO.util.jIOError('AutomaticAPIStorage Query must' +
        ' always contain "type".', 400);
    }
    if (simplequery_type_value.length > 1) {
      throw new jIO.util.jIOError('AutomaticAPIStorage Query must' +
        ' contain "type" constraint only once.', 400);
    }
    if (simplequery_type_value[0][0] !== '=') {
      throw new jIO.util.jIOError('AutomaticAPIStorage Query must' +
        ' contain "type" constraint with "=" operator.', 400);
    }
    automatic_endpoint = '/' + simplequery_type_value[0][1] + '/';
    if (automatic_endpoint === '/device/') {
      automatic_endpoint = '/user/me/device/';
    }
    return _queryAutomaticAPI(automatic_endpoint, automatic_filters, this)
      .push(function (results) {
        if (!(results instanceof Array)) {
          results = [results];
        }
        return parsed_query.exec(results, options);
      });
  };

  jIO.addStorage('automaticapi', AutomaticAPIStorage);

}(jIO, RSVP, UriTemplate, URI, Blob));