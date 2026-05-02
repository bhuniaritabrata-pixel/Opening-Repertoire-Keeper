'use strict';
// Stub for react-native/src/private/components/virtualview/VirtualViewExperimentalNativeComponent
// Same issue as VirtualViewNativeComponent — interfaceOnly codegen file that
// @react-native/babel-plugin-codegen@0.83.6 cannot parse due to inline Flow types.
const { requireNativeComponent } = require('react-native');
const VirtualViewExperimentalNativeComponent = requireNativeComponent('VirtualViewExperimental');
module.exports = VirtualViewExperimentalNativeComponent;
module.exports.default = VirtualViewExperimentalNativeComponent;
