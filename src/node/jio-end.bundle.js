   // return jIO;

   // export UriTemplate, when module is present, or pass it to window or global
   if (typeof module !== "undefined") {
    module.exports = jIO;
  }
  else if (typeof define === "function") {
    define([],function() {
        return jIO;
    });
  }
  else if (typeof window !== "undefined") {
    window.jIO = jIO;
  }
  else {
    global.jIO = jIO;
  }
} ({}));
