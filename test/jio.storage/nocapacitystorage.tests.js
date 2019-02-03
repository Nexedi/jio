// TODO: Add license probably

(function (jIO, QUnit, Blob) {
    "use strict";

    function TestStorage () {
        return this;
    }
    jIO.addStorage('teststorage', TestStorage);

    module("NoCapacityStorage");

    QUnit.test('test constructor', function () {
        var jio = jIO.createJIO({
            type="nocapacity",
            schema: {'date': {'type': 'string', format: 'date-time'}},
            sub_storage: {
                type: 'teststorage'
            }
        });
    });

    QUnit.test('test hasCapacity', function () {
        var jio = jIO.createJIO({
            type="nocapacity",
            schema: {'date': {'type': 'string', format: 'date-time'}},
            sub_storage: {
                type: 'teststorage'
            }
        });
        QUnit.equal(jio.hasCapacity('query'), false);
    });

})(jIO, QUnit, Blob));
