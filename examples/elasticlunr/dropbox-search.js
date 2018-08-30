/*jslint nomen: true, maxlen: 100*/
/*global jIO, faker*/
(function (jIO, faker) {
  var storage = null,
    accessToken = document.getElementById('access_token'),
    createStatus = document.getElementById('create-status'),
    createCount = document.getElementById('create-count'),
    createButton = document.getElementById('create'),
    queryInput = document.getElementById('query'),
    indexSelect = document.getElementById('index-select'),
    searchIndexButton = document.getElementById('search-index'),
    searchQueryButton = document.getElementById('search-query'),
    searchStatus = document.getElementById('search-status'),
    searchResults = document.getElementById('results'),
    searchResultsList = document.getElementById('results-list').getElementsByTagName('tbody')[0],
    searchResultCount = document.getElementById('result-count'),
    searchResultTime = document.getElementById('result-time');

  function getAccessToken() {
    return accessToken.value;
  }

  function initIndexStorage() {
    var type = indexSelect.options[indexSelect.selectedIndex].value;
    storage = jIO.createJIO({
      type: type,
      index_fields: ['title', 'description'],
      index_sub_storage: {
        type: 'indexeddb',
        database: 'jio_examples_' + type + '_dropbox'
      },
      sub_storage: {
        type: 'drivetojiomapping',
        sub_storage: {
          type: 'dropbox',
          access_token: getAccessToken()
        }
      }
    });
  }

  function initQueryStorage() {
    storage = jIO.createJIO({
      type: 'query',
      sub_storage: {
        type: 'drivetojiomapping',
        sub_storage: {
          type: 'dropbox',
          access_token: getAccessToken()
        }
      }
    });
  }

  function createRecursiveDoc(max) {
    var count = parseInt(createCount.textContent, 10);

    if (count <= max) {
      return storage.put(faker.random.uuid(), {
        title: faker.name.title(),
        description: faker.lorem.words()
      }).then(function () {
        createCount.textContent = count + 1;
        return createRecursiveDoc(max);
      });
    }
  }

  function searchDocs(query) {
    return storage.allDocs({
      query: 'title: "' + query + '"'
    });
  }

  function addCell(row, content) {
    row.insertCell(0).appendChild(document.createTextNode(content));
  }

  window.create = function () {
    createButton.style.display = 'none';
    createStatus.style.display = 'inline';
    searchIndexButton.disabled = true;
    searchQueryButton.disabled = true;
    createCount.textContent = 0;

    initIndexStorage();

    var count = parseInt(document.getElementById('doc_count').value);
    createRecursiveDoc(count).then(function () {
      createButton.style.display = 'inline';
      createStatus.style.display = 'none';
      searchIndexButton.disabled = false;
      searchQueryButton.disabled = false;
    }, function (error) {
      console.error(error);
    });
  };

  function insertResult(id, data) {
    var row = searchResultsList.insertRow(searchResultsList.rows.length);
    // addCell(row, data.description);
    addCell(row, data.title);
    addCell(row, id);
  }

  function search(query) {
    var now = new Date();

    searchStatus.style.display = 'inline';
    searchResults.style.display = 'none';
    createButton.disabled = true;
    searchIndexButton.disabled = true;
    searchQueryButton.disabled = true;

    searchDocs(query).then(function (result) {
      searchStatus.style.display = 'none';
      searchResults.style.display = 'block';
      createButton.disabled = false;
      searchIndexButton.disabled = false;
      searchQueryButton.disabled = false;

      searchResultCount.textContent = result.data.total_rows;
      searchResultTime.textContent = (new Date().getTime() - now.getTime()) / 1000;

      // fetch each result to display document values (without using filtering on ids)
      setTimeout(function () {
        searchResultsList.innerHTML = '';

        // TODO: is there a way to cancel the promises when a new search is done?
        // otherwise searching while still getting past results will append them to new ones
        result.data.rows.map(function (row) {
          var id = row.id;
          if (Object.keys(row.value).length) {
            insertResult(id, row.value);
            return;
          }

          return storage.get(id).then(function (data) {
            insertResult(id, data);
          });
        });
      });
    }, function (error) {
      console.error(error);
    });
  }

  window.searchWithIndex = function () {
    var query = queryInput.value;
    initIndexStorage();
    search(query);
  };

  window.searchWithQuery = function () {
    var query = queryInput.value;
    initQueryStorage();
    search('%' + query + '%');
  };
}(jIO, faker));
