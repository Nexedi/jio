var jio = function(spec) {

    var generateUuid = function () {
        var S4 = function () {
            var i, string = Math.floor(
                Math.random() * 0x10000 /* 65536 */
            ).toString(16);
            for (i = string.length; i < 4; i += 1) {
                string = '0'+string;
            }
            return string;
        };
        return S4() + S4() + "-" +
            S4() + "-" +
            S4() + "-" +
            S4() + "-" +
            S4() + S4() + S4();
    };
