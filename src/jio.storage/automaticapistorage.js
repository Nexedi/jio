/*
 * Copyright 2017, ClearRoad Inc.
 * 
 * Authors: Aurélien Vermylen
 */
/**
 * JIO Automatic API Storage. Type = "automaticapi".
 * Automatic "handler" storage.
 */
/*global Blob, jIO, RSVP, UriTemplate*/
/*jslint nomen: true*/

(function (jIO, RSVP, UriTemplate, URI) {
  'use strict';
  // Some Automatic API related constants.
  var AUTOMATIC_BASE_PROTOCOL = 'https',
    AUTOMATIC_BASE_DOMAIN = 'api.automatic.com',
    AUTOMATIC_BASE_URI = AUTOMATIC_BASE_PROTOCOL + '://'
                         + AUTOMATIC_BASE_DOMAIN,
    /*AUTOMATIC_VALID_ENDPOINTS = ['/trip/', '/trip/{id}/', '/user/',
      '/user/{id}/', '/user/{user_id}/device/',
      '/user/{user_id}/device/{device_id}/', '/vehicle/{id}/', '/vehicle/',
      '/vehicle/{vehicle_id}/mil/'],*/
    AUTOMATIC_VALID_ENDPOINT_REGEXES = [/^\/(U_\w*|all)\/trip(\/T_\w*|)\/$/,
      /^\/(U_\w*|all)\/user\/me(\/device(\/\w*|)|)\/$/,
      /^\/(U_\w*|all)\/vehicle(\/C_\w*(\/mil|)|)\/$/],
    AUTOMATIC_VALID_ENDPOINTID_REGEXES = [/^\/(U_\w*|all)\/trip\/T_\w*\/$/,
      /^\/(U_\w*|all)\/user\/me\/device\/\w*\/$/,
      /^\/(U_\w*|all)\/vehicle\/C_\w*\/$/],
    automatic_template = UriTemplate.parse(AUTOMATIC_BASE_URI + '{endpoint}');

  // Check validity of endpoint.
  function checkEndpoint(endpoint) {
    var regex;
    for (regex in AUTOMATIC_VALID_ENDPOINT_REGEXES) {
      if (AUTOMATIC_VALID_ENDPOINT_REGEXES.hasOwnProperty(regex)
          && regex.test(endpoint)) {
        return true;
      }
    }
    return false;
  }

  // Check that ids match a valid Automatic API id
  function checkEndpointAsId(endpoint) {
    var regex;
    for (regex in AUTOMATIC_VALID_ENDPOINTID_REGEXES) {
      if (AUTOMATIC_VALID_ENDPOINTID_REGEXES.hasOwnProperty(regex)
          && regex.test(endpoint)) {
        return true;
      }
    }
    return false;
  }

  function _queryAutomaticAPI(endpoint, filters, jio) {
    var result = [],
      type,
      promises,
      user_dict = {},
      temp,
      i;
    if (!checkEndpoint(endpoint)) {
      throw new jIO.util.jIOError('Wrong Automatic API query. (usually ' +
        'caused by wrong "id" or "type")', 400);
    }
    type = endpoint.split('/')[2];
    // Promise chain to handle multi-part response ("_metadata"->"next" parts).
    function treatNext(returned) {
      var path,
        data,
        user_id,
        next;
      data = returned[0];
      user_id = user_dict[returned[1]];
      if (data.error === 'err_unauthorized') {
        throw new jIO.util.jIOError('Invalid token provided, Unauthorized.',
          401);
      }
      if (!checkEndpointAsId(endpoint)) {
        if (data._metadata === undefined) {
          throw new jIO.util.jIOError('Malformed Automatic API result.', 500);
        }
        next = data._metadata.next;
        data = data.results;
      }
      for (i = 0; i < data.length; i += 1) {
        path = URI(data[i].url).path();
        temp = {
          'path': path,
          'reference': user_id + path,
          'type': type,
          'started_at': data[i].started_at || null,
          'ended_at': data[i].ended_at || null,
          'user': user_id
        };
        result.push(temp);
        jio._cache.put('/' + user_id + path, temp);
        jio._cache.putAttachment('/' + user_id + path, 'data',
          new Blob([JSON.stringify(data[i].results)], {type:
            'application/text'}));
      }
      if (next === undefined) {
        return true;
      }
      return jIO.util.ajax({
        'type': 'GET',
        'url': data._metadata.next,
        'headers': {'Authorization': 'Bearer ' + returned[1]},
        'xhrFields': {withCredentials: true}
      }).push(function (response) {
        if (response.target.status >= 400) {
          throw new jIO.util.jIOError(
            response.target.responseText ?
                JSON.parse(response.target.responseText) : {},
            response.target.status
          );
        }
        return [JSON.parse(response.target.responseText), returned[1]];
      }).push(treatNext);
    }
    // Start of the promise chain per token.
    promises = jio._access_tokens.map(function (token) {
      return RSVP.Queue().push(function () {
        return jIO.util.ajax({
          'type': 'GET',
          'url': automatic_template.expand('/user/me/'),
          'headers': {'Authorization': 'Bearer ' + token},
          'xhrFields': {withCredentials: true}
        }).push(function (usr) {
          user_dict[token] = JSON.parse(usr).id;
          temp = endpoint.split('/')[1];
          if (temp === 'all' || temp === user_dict[token]) {
            return jIO.util.ajax({
              'type': 'GET',
              'url': automatic_template.search(filters).expand(endpoint),
              'headers': {'Authorization': 'Bearer ' + token},
              'xhrFields': {withCredentials: true}
            });
          }
          throw new jIO.util.jIOError('Ignored.', 200);
        }).push(function (response) {
          return [JSON.parse(response.target.responseText), token];
        }).push(treatNext);
      });
    });
    return RSVP.all(promises).push(function () {
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
    if (id.indexOf('/') !== 0) {
      throw new jIO.util.jIOError('id ' + id +
        ' is forbidden (not starting with /)', 400);
    }
    if (id.lastIndexOf("/") !== (id.length - 1)) {
      throw new jIO.util.jIOError('id ' + id +
        ' is forbidden (not ending with /)', 400);
    }
    if (!checkEndpointAsId(id)) {
      throw new jIO.util.jIOError('Invalid id.', 400);
    }
    return this._cache.get(id).push(function (res) {
      return res;
    }, function () {
      return _queryAutomaticAPI(id, {}, this).push(function (res) {
        if (typeof res === 'object' && res.length > 0) {
          return res[0];
        }
        throw new jIO.util.jIOError('Cannot find document: ' + id, 404);
      }, function () {
        throw new jIO.util.jIOError('Cannot find document: ' + id, 404);
      });
    });
  };

  AutomaticAPIStorage.prototype.put = function () {
    return;
  };

  AutomaticAPIStorage.prototype.post = function () {
    return;
  };

  AutomaticAPIStorage.prototype.remove = function () {
    return;
  };

  AutomaticAPIStorage.prototype.putAttachment = function () {
    return;
  };

  AutomaticAPIStorage.prototype.removeAttachment = function () {
    return;
  };

  AutomaticAPIStorage.prototype.repair = function () {
    return;
  };

  AutomaticAPIStorage.prototype.hasCapacity = function (name) {
    return ((name === 'list') || (name === 'query'));
  };

  AutomaticAPIStorage.prototype.buildQuery = function (query) {
    var parsed_query = jIO.QueryFactory.create(query),
      key_list,
      automatic_filters = {},
      simplequery_type_value,
      intercept_keys = ['started_at', 'ended_at', 'vehicle'],
      intercept_accepted_operators = [['>', '>=', '<', '<='],
        ['>', '>=', '<', '<='], ['=']],
      temp_operator_index,
      temp_key,
      automatic_endpoint,
      i,
      j;

    // XXX: check if there is no built-in method to seek in queries for
    // specific keys...
    function extractKeysFromQuery(quer) {
      var keys_list = [];
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

    function findSimpleQueryForKey(quer, key) {
      var temp,
        result = [];
      if (quer.type === 'complex') {
        for (i = 0; i < quer.query_list.length; i += 1) {
          temp = findSimpleQueryForKey(quer.query_list[i], key);
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
              temp_key = intercept_keys[i] +
                (temp_operator_index < 2 ? '__gte' : '__lte');
              automatic_filters[temp_key] = simplequery_type_value[j][1];
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
    return _queryAutomaticAPI(automatic_endpoint, automatic_filters, this)
      .push(function (results) {
        return parsed_query.exec(results);
      });
  };
}(jIO, RSVP, Blob, UriTemplate));