var activityUpdater = (function(spec, my) {
    var that = {};
    spec = spec || {};
    my = my || {};
    // Attributes //
    var priv = {};
    priv.id = spec.id || 0;
    priv.interval = 400;
    priv.interval_id = null;

    // Methods //
    /**
     * Update the last activity date in the localStorage.
     * @method touch
     */
    priv.touch = function() {
        LocalOrCookieStorage.setItem ('jio/id/'+priv.id, Date.now());
    };

    /**
     * Sets the jio id into the activity.
     * @method setId
     * @param  {number} id The jio id.
     */
    that.setId = function(id) {
        priv.id = id;
    };

    /**
     * Sets the interval delay between two updates.
     * @method setIntervalDelay
     * @param  {number} ms In milliseconds
     */
    that.setIntervalDelay = function(ms) {
        priv.interval = ms;
    };

    /**
     * Gets the interval delay.
     * @method getIntervalDelay
     * @return {number} The interval delay.
     */
    that.getIntervalDelay = function() {
        return priv.interval;
    };

    /**
     * Starts the activity updater. It will update regulary the last activity
     * date in the localStorage to show to other jio instance that this instance
     * is active.
     * @method start
     */
    that.start = function() {
        if (!priv.interval_id) {
            priv.touch();
            priv.interval_id = setInterval(function() {
                priv.touch();
            }, priv.interval);
        }
    };

    /**
     * Stops the activity updater.
     * @method stop
     */
    that.stop = function() {
        if (priv.interval_id !== null) {
            clearInterval(priv.interval_id);
            priv.interval_id = null;
        }
    };

    return that;
}());

