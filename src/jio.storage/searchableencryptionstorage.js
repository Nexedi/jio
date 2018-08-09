/***********************************************************************
**   Written by Abdullatif Shikfa, Alcatel Lucent Bell-Labs France    **
**      With the invaluable help of Tristan Cavelier, Nexedi          **
**                        31/01/2014                                  **
***********************************************************************/

/*global  jIO, define, exports, require, sjcl*/

(function (dependencies, module) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    return define(dependencies, module);
  }
  if (typeof exports === 'object') {
    return module(
      require('jio'),
      require('sjcl')
    );
  }
  module(jIO, sjcl);
}([
  'jio',
  'sjcl'
], function (jIO, sjcl) {
  "use strict";

  /**
  * SearchableEncryptionStorage is a function that creates
  * the searchable encryption storage
  *
  *keywords: a list of keywords associated with the current document, and which
  *          can be searched with the searchable encryption algorithm.
  *nbMaxKeywords: the maximum number of keywords that any document can contain.
  *encryptedIndex: an index that represents the keywords in an encrypted form.
  *                It is a Bloom Filter, which allows queries, without false
  *                negatives but with a false positive probability.
  *errorRate: the false positive rate is bound to 2 to the power -errorRate.
  *           Increasing the value of errorRate decreases the rate of false
  *           positives but increases the size of the encryptedIndex.
  *password: a user chosen password used to encrypt metadata as well as to
  *          generate the encryptedIndex.
  */

  function SearchableEncryptionStorage(storage_description) {
    this._password = storage_description.password; //string
    this._errorRate = storage_description.errorRate || 20; //int
    this._nbMaxKeywords = storage_description.nbMaxKeywords || 100; //int
    this._url = storage_description.url;
    this._keywords = storage_description.keywords; //string array
    if (typeof this._password !== 'string') {
      throw new TypeError("'password' description property is not a string");
    }
  }

  /**
  * computeBFLength is a function that computes the length of a Bloom Filter
  * depending on the false positive ratio and the maximum number of elements
  * (keywords) that it will represent.
  * A Bloom Filter is indeed a data structure which is a bit array that
  * represents a set of elements.
  * The false positive rate is bound to 2 to the power -errorRate, and the
  * length is then computed according to the following formula.
  */

  function computeBFLength(errorRate, nbMaxKeywords) {
    return Math.ceil((errorRate * nbMaxKeywords) / Math.log(2));
  }

  /**
  * intArrayToString is a helper function that converts an array of integers to
  * one big string. It basically concatenates all the integers of the array.
  */

  /*function intArrayToString(arr) {
    var i, result = "";
    for (i = 0; i < arr.length; i += 1) {
      result = result + arr[i].toString();
    }
    return result;
  }*/

  /**
  * bigModulo is a helper function that computes the remainder of a large
  * integer divided by an operand. The large integer is represented as several
  * regular integers (of 32 bits) in big endian in an array.
  * The function leverages the modulo operation on integers implemented in
  * javascript to perform the modulo on the large integer : it computes the
  * modulo of each integer of the array multiplied by the modulo of the
  * base (2 to the power 32) to the power of the position in the array.
  * However, since javascript encodes integers on 32 bits we have to add another
  * trick: we do the computations on half words and we use the function
  * sjcl.bitArray.bitSlice which extracts some bits out of a bit array, and we
  * and we thus mutliply by half of the base.
  */

  function bigModulo(arr, mod) {
    var i, result = 0, base = 1, maxIter = (2 * arr.length);
    for (i = 0; i < maxIter; i += 1) {
      result = result + (
        (sjcl.bitArray.bitSlice(arr, i * 16, (i + 1) * 16)[0]) % mod
      ) * base;
      base = (base * Math.pow(2, 16)) % mod;
    }
    result = result % mod;
    return result;
  }

  /**
  * constructBloomFilter is a function that constructs an encrypted Bloom Filter
  * representing a set of elements (keywords) with a given password, a given
  * false positive ratio and the maximum number of elements that any Bloom
  * Filter can contain in our scenario (this is useful so that all documents
  * have the same size of bloom filters).
  * This function follows the algorithm proposed by Goh in 2004 in his article
  * about "secure indexes" and that allows to perform searchable encryption.
  * The function first computes the length of the Bloom Filter depending on the
  * errorRate and nbMaxKeywords using an auxiliary function computeBFLength
  * previously explained.
  * It then creates an array of the said length initialized with 0 at all
  * positions.
  * The array is then filled with ones at certain positions using the following:
  * algorithm:
  *   For each keyword in the array keywords compute errorRate hashes:
  *       Each hash is the SHA256 function applied to the keyword concatenated
  *       with the password and the iterator of the hash function (j). The
  *       resulting digest is an array that is converted to a base64 string and
  *       concatenated with the id of the documents (to obtain different results
  *       if a given keyword is found in several documents). The result is then
  *       taken modulo the length of the Bloom Filter and indicates a position
  *       in the array which is set to one.
  * In the end there are at most bFLength * errorRate 1s in the array (and in
  * fact less because several keywords can lead to the same position for
  * different hash functions).
  */

  function constructBloomFilter(
    password,
    errorRate,
    nbMaxKeywords,
    keywords,
    id
  ) {
    var bFLength = computeBFLength(errorRate, nbMaxKeywords), result = [], i, j;
    for (i = 0; i < bFLength; i += 1) {
      result[i] = 0;
    }
    for (i = 0; i < keywords.length; i += 1) {
      for (j = 0; j < errorRate; j += 1) {
        result[bigModulo(sjcl.hash.sha256.hash(sjcl.codec.base64.fromBits(
          sjcl.hash.sha256.hash(keywords[i] + password + j)
        ) + id), bFLength)] = 1;
      }
    }
    return result;
  }

  /**
  * constructEncryptedQuery is a function that constructs an encrypted query
  * from a keyword and a password. It basically performs the first step of
  * adding a word to a Bloom Filter.
  * It hashes the keyword errorRate times using different hash functions.
  * Each hash is the SHA256 function applied to the keyword concatenated
  * with the password and the iterator of the hash function (j). The
  * resulting digest is an array that is converted to a base64 string using the
  * sjcl.codec.base64.fromBits function.
  * In the end, the encrypted query corresponding to a keyword is an array of
  * errorRates base64 strings. Note that the query can only be computed by the
  * client as it requires knowledge of the secret key.
  */

  function constructEncryptedQuery(
    password,
    errorRate,
    keyword
  ) {
    var result = [], j;

    for (j = 0; j < errorRate; j += 1) {
      result[j] = sjcl.codec.base64.fromBits(sjcl.hash.sha256.hash(
        keyword + password + j
      ));
    }
    return result;
  }


/*  // Encrypt a message
  function encrypt(plaintext, password) {
    var rp = {}, ct, p;

    p = {
      adata: "",
      iter: 1,
      mode: "ccm",
      ts: 64,
      ks: 128,
      iv: "t6vxTD/94Lk7DM87LZkPQA==",
      cipher: "aes",
      salt: "SdieDA4jA08="
    };
    ct = sjcl.encrypt(password, plaintext, p, rp);//.replace(/,/g,",\n");
    return JSON.parse(ct).ct;
  }

  // Decrypt a message
  function decrypt(ciphertext, password) {
    var p, plaintext, rp = {};
    p = {
      adata: "",
      iter: 1,
      mode: "ccm",
      ts: 64,
      ks: 128,
      iv: "t6vxTD/94Lk7DM87LZkPQA==",
      cipher: "aes",
      salt: "SdieDA4jA08=",
      ct: ciphertext
    };
    plaintext = sjcl.decrypt(password, JSON.stringify(p), {}, rp);
    return plaintext;
  }*/

  //Copied from the davstorage connector
  /**
   * Creates a new document if not already exists
   *
   * @method post
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to put
   * @param  {Object} options The command options
   */
/*   SearchableEncryptionStorage.prototype.post = function (
    command,
    metadata
  ) {
 //   this.postOrPut('post', command, metadata);
    metadata.encryptedIndex = constructBloomFilter(
      this._password,
      this._errorRate,
      this._nbMaxKeywords,
      this._keywords,
      metadata._id
    );
  }; */


  /**
   * Creates or updates a document
   *
   * @method put
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to post
   * @param  {Object} options The command options
   */
  SearchableEncryptionStorage.prototype.put = function (
    command,
    metadata
  ) {
// First create the associated encryptedIndex to allow encrypted queries at a
// later stage
// Then we encrypt the data using sjcl library. This step is independant of
// the searchable encryption features, however it is also related to
// confidentiality hence we added it here as an example of how to use the sjcl
// library.
    var encryptedIndex = constructBloomFilter(
      this._password,
      this._errorRate,
      this._nbMaxKeywords,
      metadata.keywords,
      metadata._id
    ), data = sjcl.encrypt(this._password, JSON.stringify(metadata));
// The remainder is a classical put using the ajax method
    jIO.util.ajax({
      "type": "PUT",
      "url": this._url + "/" + metadata._id,
      "dataType": "json",
      "data": {"metadata": data, "encryptedIndex": encryptedIndex}
    }).then(function (e) {
      command.success(e.target.status);
    }, function (e) {
      var xhr = e.target;
      command.reject(
        xhr.status,
        xhr.statusText,
        "Document update from server failed"
      );
    });
  };

  /**
   * Creates a document if it does not already exist.
   *
   * @method post
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to post
   * @param  {Object} options The command options
   */
  SearchableEncryptionStorage.prototype.post = function (
    command,
    metadata
  ) {
// First create the associated encryptedIndex to allow encrypted queries at a
// later stage
// Then we encrypt the data using sjcl library. This step is independant of
// the searchable encryption features, however it is also related to
// confidentiality hence we added it here as an example of how to use the sjcl
// library.
    var encryptedIndex = constructBloomFilter(
      this._password,
      this._errorRate,
      this._nbMaxKeywords,
      metadata.keywords,
      metadata._id
    ), data = sjcl.encrypt(this._password, JSON.stringify(metadata));
// The remainder is a classical put using the ajax method
    jIO.util.ajax({
      "type": "POST",
      "url": this._url + "/" + metadata._id,
      "dataType": "json",
      "data": {"metadata": data, "encryptedIndex": encryptedIndex}
    }).then(function (e) {
      command.success(e.target.status);
    }, function (e) {
      var xhr = e.target;
      command.reject(
        xhr.status,
        xhr.statusText,
        "Document update from server failed"
      );
    });
  };


  /**
   * Adds attachments to a document
   *
   * @method putAttachment
   * @param  {Object} command The JIO command
   * @param  {Object} metadata The metadata to putAttachment
   * @param  {Object} options The command options
   */
  SearchableEncryptionStorage.prototype.putAttachment = function (
    command,
    param
  ) {
// This function adds an attachment to a document, it has nothing specific to
// searchable encryption. Optionally the attachment could be encrypted as well
// using the same primitive shown in previous methods.
    jIO.util.ajax({
      "type": "PUT",
      "url": this._url + "/" + param._id + "/" + param._attachment,
      "dataType": "blob",
      "data": param._blob
    }).then(function (e) {
      command.success(e.target.status);
    }, function (e) {
      var xhr = e.target;
      command.reject(
        xhr.status,
        xhr.statusText,
        "Document update from server failed"
      );
    });
  };

  /**
  * Retrieve metadata
  *
  * @method get
  * @param  {Object} command The JIO command
  * @param  {Object} param The command parameters
  * @param  {Object} options The command options
  */
  SearchableEncryptionStorage.prototype.get = function (
    command,
    param
  ) {
// This function retrieves a document given its ID. It is not specific to
// searchable encryption. Here we also have to decrypt the metadata as we
// encrypted them in the put or post methods.
    var that = this;
    jIO.util.ajax({
      "type": "GET",
      "url": this._url + "/" + param._id
    }).then(function (e) {
      var data = JSON.parse(sjcl.decrypt(
        that._password,
        e.target.responseText
      ));
      command.success(e.target.status, {"data": data});
    }, function (e) {
      var xhr = e.target;
      command.reject(
        xhr.status,
        xhr.statusText,
        "Document retrieval from server failed"
      );
    });
  };

  SearchableEncryptionStorage.prototype.getAttachment = function (
    command,
    param
  ) {
// This function retrieves an attachment of a document. Nothing specific to
// searchable encryption either.
    jIO.util.ajax({
      "type": "GET",
      "url": this._url + "/" + param._id + "/" + param._attachment
    }).then(function (e) {
      command.success(e.target.status, {"data": e.target.response});
    }, function (e) {
      var xhr = e.target;
      command.reject(
        xhr.status,
        xhr.statusText,
        "Document retrieval from server failed"
      );
    });
  };

  SearchableEncryptionStorage.prototype.remove = function (
    command,
    param
  ) {
// This function removes a document. Nothing specific to
// searchable encryption either.
    jIO.util.ajax({
      "type": "DELETE",
      "url": this._url + "/" + param._id
    }).then(function (e) {
      command.success(e.target.status);
    }, function (e) {
      var xhr = e.target;
      command.reject(
        xhr.status,
        xhr.statusText,
        "Document removal from server failed"
      );
    });
  };

  SearchableEncryptionStorage.prototype.removeAttachment = function (
    command,
    param
  ) {
// This function removes an attachment of a document. Nothing specific to
// searchable encryption either.
    jIO.util.ajax({
      "type": "DELETE",
      "url": this._url + "/" + param._id + "/" + param._attachment
    }).then(function (e) {
      command.success(e.target.status);
    }, function (e) {
      var xhr = e.target;
      command.reject(
        xhr.status,
        xhr.statusText,
        "Document removal from server failed"
      );
    });
  };

/**
 * AllDocs deals with encrypted queries. This is a core function of the
 * searchable encryption connector.
 * In this version, AllDOcs enables to retrieve all documents containing a
 * keyword. However the server should not learn the keyword, and it should not
 * learn anything with respect to the documents either if they are encrypted.
 * The trick here is that the function encrypts the query (composed of a single
 * keyword) by performing the first steps of the construction of the Bloom
 * Filters: it hashes the keyword concatenated with the password and an
 * iterator (which takes values between 0 and errorRate) and thus obtains an
 * array of errorRate rows, each row is converted to a base64 string.
 * Using this encrypted query the servers tests all documents it has stored with
 * their respective encrypted indexes, and it returns the list of documents
 * that match the query (without understanding the query though!). AllDocs
 * simply has to decrypt all documents at this stage (since we encrypted them in
 * the put and post steps): the user gets the documents he searched for with a
 * high level of confidentiality against the server.
 */
  SearchableEncryptionStorage.prototype.allDocs = function (
    command,
    param,
    option
  ) {

    /*jslint unparam: true */
    var query, that = this;
    query = constructEncryptedQuery(
      this._password,
      this._errorRate,
      option.query
    );

    jIO.util.ajax({
      "type": "POST",
      "url": this._url,
      "dataType": "json",
      "data": {"query": query}
    }).then(function (e) {
      var document_list = e.target.response;
      document_list = document_list.map(function (param) {
        param = JSON.parse(sjcl.decrypt(that._password, param));
        var row = {
          "id": param._id,
          "value": {}
        };
        if (option.include_docs === true) {
          row.doc = param;
        }
        return row;
      });
      command.success(e.target.status, {"data": {
        "total_rows": document_list.length,
        "rows": document_list
      }});
    }, function (e) {
      var xhr = e.target;
      command.reject(
        xhr.status,
        xhr.statusText,
        "Documents retrieval from server failed"
      );
    });
  };

  jIO.addStorage("searchableencryption", SearchableEncryptionStorage);
}));

// Methods remaining to be defined: only check and repair
