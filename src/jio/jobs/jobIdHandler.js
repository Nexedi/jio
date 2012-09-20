var jobIdHandler = (function(spec) {
    var that = {};
    spec = spec || {};
    // Attributes //
    var id = 0;
    // Methods //
    that.nextId = function() {
        id = id + 1;
        return id;
    };

    return that;
}());
