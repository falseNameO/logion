import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

// Pre-register react-native-screens direct events into the Fabric event registry.
// The global @react-native/babel-plugin-codegen (0.76.7) used by babel-preset-expo
// silently dropped all events from *NativeComponent.ts files that use the
// `CodegenTypes as CT` namespace alias (TSQualifiedName), leaving `topHeaderHeightChange`
// and other events unregistered. We register them here as a reliable fallback so
// that Fabric can dispatch them before the view config lazy-loads.
try {
  const registry = require('react-native/Libraries/Renderer/shims/ReactNativeViewConfigRegistry');
  const directEvents = registry.customDirectEventTypes;
  const screenEvents = {
    // ScreenNativeComponent + ModalScreenNativeComponent
    topAppear: 'onAppear',
    topDisappear: 'onDisappear',
    topWillAppear: 'onWillAppear',
    topWillDisappear: 'onWillDisappear',
    topDismissed: 'onDismissed',
    topNativeDismissCancelled: 'onNativeDismissCancelled',
    topHeaderHeightChange: 'onHeaderHeightChange',
    topTransitionProgress: 'onTransitionProgress',
    topGestureCancel: 'onGestureCancel',
    topHeaderBackButtonClicked: 'onHeaderBackButtonClicked',
    topSheetDetentChanged: 'onSheetDetentChanged',
    // ScreenStackNativeComponent
    topFinishTransitioning: 'onFinishTransitioning',
    // ScreenStackHeaderConfigNativeComponent
    topAttached: 'onAttached',
    topDetached: 'onDetached',
    topPressHeaderBarButtonItem: 'onPressHeaderBarButtonItem',
    topPressHeaderBarButtonMenuItem: 'onPressHeaderBarButtonMenuItem',
    // SearchBarNativeComponent
    topSearchFocus: 'onSearchFocus',
    topSearchBlur: 'onSearchBlur',
    topSearchButtonPress: 'onSearchButtonPress',
    topCancelButtonPress: 'onCancelButtonPress',
    topChangeText: 'onChangeText',
    topClose: 'onClose',
    topOpen: 'onOpen',
    // TabsHostIOSNativeComponent + TabsHostAndroidNativeComponent
    topTabSelected: 'onTabSelected',
    topTabSelectionRejected: 'onTabSelectionRejected',
    topTabSelectionPrevented: 'onTabSelectionPrevented',
    topMoreTabSelected: 'onMoreTabSelected',
    // TabsBottomAccessoryNativeComponent
    topEnvironmentChange: 'onEnvironmentChange',
    // SplitHostNativeComponent
    topCollapse: 'onCollapse',
    topDisplayModeWillChange: 'onDisplayModeWillChange',
    topExpand: 'onExpand',
    topInspectorHide: 'onInspectorHide',
    // SplitScreenNativeComponent + StackScreenNativeComponent + TabsScreen*
    topDidAppear: 'onDidAppear',
    topDidDisappear: 'onDidDisappear',
    topDismiss: 'onDismiss',
    topNativeDismissPrevented: 'onNativeDismissPrevented',
  };
  Object.entries(screenEvents).forEach(([topName, registrationName]) => {
    if (!directEvents[topName]) {
      directEvents[topName] = { registrationName };
    }
  });
} catch (_) {
  // Registry unavailable — events will be registered lazily via view config instead
}

// Suppress known React Native 0.79 codegen warning for internal VirtualView component
LogBox.ignoreLogs(['Unable to determine event arguments']);

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
