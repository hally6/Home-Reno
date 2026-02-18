import 'react-native-gesture-handler/jestSetup';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  function IconMock() {
    return React.createElement(Text, null);
  }

  return new Proxy(
    {},
    {
      get: () => IconMock
    }
  );
});
