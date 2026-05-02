'use strict';
// Custom Metro Babel transformer that intercepts react-native's private
// codegen files before @react-native/babel-plugin-codegen can fail on them.
//
// Root cause: @react-native/babel-plugin-codegen@0.83.6 (used by
// @expo/metro-config@54) cannot parse inline Flow types like NativeModeChangeEvent
// inside react-native/src/private files, throwing "Unable to determine event
// arguments". Since every affected file uses interfaceOnly=true (no real native
// code is generated), we replace those files with a plain requireNativeComponent
// stub before Babel runs — identical runtime behaviour, zero codegen.

const defaultTransformer = require('@expo/metro-config/build/babel-transformer');

const PRIVATE_PATH_RE = /react-native[/\\]src[/\\]private/;
const CODEGEN_CALL_RE = /codegenNativeComponent(?:<[^>]*>)?\s*\(\s*['"]([^'"]+)['"]/;

function makeStub(viewName) {
  // requireNativeComponent returns a string (the view name) in some RN versions.
  // We must NOT try to assign .default onto a primitive, so we wrap in an
  // object with __esModule:true so Babel's interopRequireDefault picks up
  // the .default property correctly.
  return [
    "'use strict';",
    "const { requireNativeComponent } = require('react-native');",
    `const __C = requireNativeComponent('${viewName}');`,
    'module.exports = { __esModule: true, default: __C };',
  ].join('\n');
}

module.exports = {
  ...defaultTransformer,
  transform(params) {
    const { filename, src } = params;
    if (
      filename &&
      PRIVATE_PATH_RE.test(filename) &&
      src &&
      src.includes('codegenNativeComponent')
    ) {
      const match = src.match(CODEGEN_CALL_RE);
      const stub = makeStub(match ? match[1] : 'Unknown');
      return defaultTransformer.transform({ ...params, src: stub });
    }
    return defaultTransformer.transform(params);
  },
};
