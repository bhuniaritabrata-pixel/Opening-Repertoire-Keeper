'use strict';
// Stub for react-native/src/private/components/virtualview/VirtualViewNativeComponent
// The real file uses Flow types that @react-native/babel-plugin-codegen@0.83.6
// cannot parse (NativeModeChangeEvent inline type). Since the component is
// declared interfaceOnly=true, no codegen output is needed — we just reference
// the already-registered native view directly.
const { requireNativeComponent } = require('react-native');
const VirtualViewNativeComponent = requireNativeComponent('VirtualView');
module.exports = VirtualViewNativeComponent;
module.exports.default = VirtualViewNativeComponent;
