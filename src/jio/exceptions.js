var jioException = function(spec, my) {
    var that = {};
    spec = spec || {};
    my = my || {};
    that.name = 'jioException';
    that.message = spec.message || 'Unknown Reason.';
    that.toString = function() {
        return that.name + ': ' + that.message;
    };
    return that;
};

var invalidCommandState = function(spec, my) {
    var that = jioException(spec, my);
    spec = spec || {};
    var command = spec.command;
    that.name = 'invalidCommandState';
    that.toString = function() {
        return that.name +': ' +
            command.getLabel() + ', ' + that.message;
    };
    return that;
};

var invalidStorage = function(spec, my) {
    var that = jioException(spec, my);
    spec = spec || {};
    var type = spec.storage.getType();
    that.name = 'invalidStorage';
    that.toString = function() {
        return that.name +': ' +
            'Type "'+type + '", ' + that.message;
    };
    return that;
};

var invalidStorageType = function(spec, my) {
    var that = jioException(spec, my);
    var type = spec.type;
    that.name = 'invalidStorageType';
    that.toString = function() {
        return that.name +': ' +
            type + ', ' + that.message;
    };
    return that;
};

var jobNotReadyException = function(spec, my) {
    var that = jioException(spec, my);
    that.name = 'jobNotReadyException';
    return that;
};

var tooMuchTriesJobException = function(spec, my) {
    var that = jioException(spec, my);
    that.name = 'tooMuchTriesJobException';
    return that;
};

var invalidJobException = function(spec, my) {
    var that = jioException(spec, my);
    that.name = 'invalidJobException';
    return that;
};
