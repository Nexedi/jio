
define ('jiotestsloader',[
    'LocalOrCookieStorage','JIO','Base64','SJCL',
    'jQuery','JIODummyStorages','JIOStorages'],
function (LocalOrCookieStorage,JIO,Base64,sjcl,jQuery) {
    return {
        LocalOrCookieStorage: LocalOrCookieStorage,
        JIO: JIO,
        sjcl: sjcl,
        Base64: Base64,
        jQuery: jQuery
    };
});
