import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs';
import builtins from 'rollup-plugin-node-builtins';
import hypothetical from 'rollup-plugin-hypothetical';

export default [{
  input: 'src/node/jio.js',
  output: {
    file: 'dist/node/jio.js',
    format: 'cjs'
  },
  plugins: [
    builtins()
  ]
}, {
  external: [
    'rsvp',
    'xhr2',
    'form-data',
    'jquery',
    'sjcl'
  ],
  input: 'src/jio.bundle.js',
  output: [{
    file: 'dist/jio.bundle.js',
    format: 'iife',
    name: 'jIOBundle',
    footer: `
for (var i in jIOBundle) {
  if (jIOBundle.hasOwnProperty(i)) {
    window[i] = jIOBundle[i];
  }
}
    `,
    outro: `
exports.moment = moment;
exports.LZString = lzString;
    `,
    globals: {
      rsvp: 'RSVP',
      rusha: 'Rusha',
      'form-data': 'FormData',
      jquery: 'jQuery',
      xhr2: 'XMLHttpRequest',
      sjcl: 'sjcl',
      http: 'http',
      https: 'https',
      os: 'os',
      url: 'url'
    }
  }],
  plugins: [
    hypothetical({
      allowFallthrough: true,
      files: {
        process: `
          export default window;
        `
      }
    }),
    resolve(),
    commonJS({
      include: 'node_modules/**'
    })
  ]
}, {
  external: [
    'rsvp',
    'jquery',
    'sjcl',
    'rusha',
    'lz-string',
    'uritemplate',
    'urijs',
    'moment'
  ],
  input: 'src/jio.bundle.js',
  output: [{
    file: 'dist/jio.module.js',
    format: 'cjs'
  }],
  plugins: [
    // skip require libs already included in window
    // do not include them in `external: []`
    hypothetical({
      allowFallthrough: true,
      files: {
        'form-data': `
          export default window.FormData;
        `,
        xhr2: `
          export default window.XMLHttpRequest;
        `,
        process: `
          export default window;
        `
      }
    }),
    resolve(),
    commonJS({
      include: 'node_modules/**'
    })
  ]
}];
