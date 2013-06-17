
  if (typeof define === "function" && define.amd) {
    define(to_export);
  } else if (typeof window === "object") {
    Object.defineProperty(window, module_name, {
      configurable: false,
      enumerable: true,
      writable: false,
      value: to_export
    });
  } else if (typeof exports === "object") {
    var i;
    for (i in to_export) {
      if (to_export.hasOwnProperty(i)) {
        exports[i] = to_export[i];
      }
    }
  } else {
    complex_queries = to_export;
  }
}());
