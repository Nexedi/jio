var storage_type_object = {     // -> 'key':constructorFunction
    'base': function () {}      // overriden by jio
};
var jioNamespace = (function(spec) {
    var that = {};
    spec = spec || {};
    // Attributes //

    // Methods //

    /**
     * Creates a new jio instance.
     * @method newJio
     * @param  {object} spec The parameters:
     * - {object} spec.storage: A storage description
     *     - {string} spec.storage.type: The storage type
     *     - {string} spec.storage.username: The user name
     *     - {string} spec.storage.application_name: The application name
     * @return {object} The new Jio instance.
     */
    Object.defineProperty(that,"newJio",{
        configurable:false,enumerable:false,writable:false,value:
        function(spec) {
            var storage = spec, instance = null;
            if (typeof storage === 'string') {
                storage = JSON.parse (storage);
            }
            storage = storage || {type:'base'};
            instance = jio(spec);
            instance.start();
            return instance;
        }
    });

    /**
     * Add a storage type to jio.
     * @method addStorageType
     * @param  {string} type The storage type
     * @param  {function} constructor The associated constructor
     */
    Object.defineProperty(that,"addStorageType",{
        configurable:false,enumerable:false,writable:false,value:
        function(type, constructor) {
            constructor = constructor || function(){return null;};
            if (storage_type_object[type]) {
                throw invalidStorageType({type:type,message:'Already known.'});
            }
            storage_type_object[type] = constructor;
        }
    });

    return that;
}());
