import { registerRootComponent } from 'expo';
import React from 'react';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { SongWidget } from './src/widget/SongWidget';

registerWidgetTaskHandler(async (props) => {
  const { widgetInfo, renderWidget } = props;
  renderWidget(
    React.createElement(SongWidget)
  );
});
