/*global performance, String*/
(function (window, jIO, rJS) {
  "use strict";

  var test_count = 15;
  /*function randomi(limit) {
    return Math.floor(Math.random() * Math.floor(limit));
  }

  function randomSentence(length) {
    var alphabet = ['a', 'b', 'c', 'd', 'e', ' ', 'f', 'g', 'h', 'i', 'j', 'k',
      ' ', 'l', 'm', 'n', 'o', ' ', 'p', 'q', 'r', 's', 't', ' ',
      'u', 'v', 'w', ' ', 'x', 'y', 'z', ' '], sentence = '', z;
    for (z = 0; z < length; z += 1) {
      sentence += alphabet[randomi(alphabet.length - 1)];
    }
    return sentence;
  }

  function randomSentenceArray(sentence_length, array_length) {
    var y, sentence_array = [];
    for (y = 0; y < array_length; y += 1) {
      sentence_array.push(randomSentence(sentence_length));
    }
    return sentence_array;
  }*/

  function get_fake_data_values2(i) {
    if (i === 0 || i === 1 || i === 2) {
      return {'url': 'renderjs.com', 'name': 'erp5', 'user': 'preet'};
    }
    if (i === 3 || i === 4) {
      return {'url': 'erp5.com', 'name': 'erp5', 'user': 'test'};
    }
    if (i === 5 || i === 6 || i === 7) {
      return {'url': 'nexedi.com', 'name': 'nexedi', 'user': 'prabetcder'};
    }
    if (i === 10 || i === 11) {
      return {'url': 'vifib.com', 'name': 'renderjs', 'user': 'preetwinder'};
    }
    if (i === 12 || i === 13) {
      return {'url': 'renderjs.com', 'name': 'jio', 'user': 'obscure'};
    }
    return {'url': 'jio.nexedi.com', 'name': 'jio', 'user': 'praounsteter'};
  }

  /*function get_fake_data_values(i) {
    var data_value = {
      'id': i,
      'url': 'https://streetsite.com/profiles/' + i,
      'pic_url': 'https://cdn.streetsite.com/pictures/saoteuhcu/' + i,
      'short_description': randomSentence(10 + randomi(40)),
      'description': randomSentence(randomi(250)),
      'comments': randomSentenceArray(randomi(500), randomi(20))
    };
    if (i === 9900) {
      data_value.short_description = 'test';
    }
    if (i === 7500) {
      data_value.short_description = 'preet';
    }
    if (i === 5400) {
      data_value.short_description = 'obscure';
    }
    if (i === 3200) {
      data_value.short_description = 'precise';
    }
    if (i === 1200) {
      data_value.short_description = 'environ';
    }
    return data_value;
  }*/

 /* function sequential_test(i, storage) {
    if (i < test_count) {
      var data_value = {
        'id': i,
        'url': 'https://streetsite.com/profiles/' + i,
        'pic_url': 'https://cdn.streetsite.com/pictures/saoteuhcu/' + i,
        'short_description': randomSentence(10 + randomi(40)),
        'description': randomSentence(randomi(250)),
        'comments': randomSentenceArray(randomi(500), randomi(20))
      };
      if (i === 99000) {
        data_value.short_description = 'test';
      }
      if (i % 100 === 0) {
        data_value.short_description = 'preet';
      }
      if (i % 1000 === 0) {
        data_value.short_description = 'obscure';
      }
      if (i === 32000) {
        data_value.short_description = 'precise precise precise';
      }
      if (i === 120000) {
        data_value.short_description = 'environ';
      }
      return storage.put(String(i), data_value)
        .then(function () {
          if (i % 1000 === 0) {
            console.log(i);
          }
          data_value = null;
          return sequential_test(i + 1, storage);
        });
    }
    return;
  }*/


  rJS(window)

    .declareService(function () {
      var storage = jIO.createJIO({
        type: "index2",
        database: "index2test2",
        index_keys: ["user", "name", "url"],
        sub_storage: {
          type: "indexeddb",
          database: "index2testdata2",
        }
      }), promise_list = [], i, time;
      console.log('Staring to write ' + test_count + ' documents');
      //sequential_test(0, storage);
      for (i = 0; i < test_count; i += 1) {
        promise_list.push(storage.put(String(i), get_fake_data_values2(i)));
      }
      promise_list.push(storage.put('325', get_fake_data_values2(325)));
      time = performance.now();
      return RSVP.all(promise_list)
        .then(function () {
          console.log('Time to write - ', (performance.now() - time));
          console.log('Starting queries');
          console.log('Query 1');
          time = performance.now();
          return storage.allDocs({query: "user:preetwinder"});
        })
        .then(function (result) {
          console.log('Time to query 1 - ', (performance.now() - time));
          console.log(result);
          console.log('Query 2');
          time = performance.now();
          return storage.allDocs({query: 'user:preet'});
        })
        .then(function (result) {
          console.log('Time to query 2 - ', (performance.now() - time));
          console.log(result);
          console.log('Query 3');
          time = performance.now();
          return storage.allDocs({query: "(name:jio OR url:nexedi.com" +
            ") AND user:obscure"});
        })
        .then(function (result) {
          console.log('Time to query 3 - ', performance.now() - time);
          console.log(result);
          console.log('Query 4');
          time = performance.now();
          return storage.allDocs({query: 'name:not'});
        })
        .then(function (result) {
          console.log('Time to query 4 - ', performance.now() - time);
          console.log(result);
        });
    });
}(window, jIO, rJS));