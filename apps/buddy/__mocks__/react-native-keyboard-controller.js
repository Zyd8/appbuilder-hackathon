/**
 * Jest manual mock for react-native-keyboard-controller.
 *
 * The library's bindings are a native module, so importing the real package in the jest
 * environment throws before any test can run. A manual mock in `__mocks__` next to
 * node_modules is picked up automatically for node_modules packages, which avoids
 * overriding jest-expo's own setupFiles.
 */
const React = require('react');

function passthrough(name) {
  return function Mock({ children, ...props }) {
    return React.createElement(require('react-native')[name], props, children);
  };
}

module.exports = {
  KeyboardProvider: ({ children }) => children,
  KeyboardAvoidingView: passthrough('View'),
  KeyboardStickyView: passthrough('View'),
  KeyboardAwareScrollView: passthrough('ScrollView'),
  KeyboardChatScrollView: passthrough('ScrollView'),
  KeyboardToolbar: () => null,
  DefaultKeyboardToolbarTheme: {},
};
