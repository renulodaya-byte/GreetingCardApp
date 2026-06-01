/**
 * Greeting Card Creator — App Entry Point
 *
 * Wires up React Navigation with a native stack navigator
 * and configures the 4-screen flow:
 *
 * CategorySelect → PhotoSelect → Customize → Preview
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootStackParamList } from './src/types';

// Screens
import { CategorySelectScreen } from './src/screens/CategorySelectScreen';
import { PhotoSelectScreen } from './src/screens/PhotoSelectScreen';
import { CustomizeScreen } from './src/screens/CustomizeScreen';
import { PreviewScreen } from './src/screens/PreviewScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Dark theme for navigation
const AppTheme = {
  dark: true,
  colors: {
    primary: '#FFFFFF',
    background: '#0D0D12',
    card: '#0D0D12',
    text: '#FFFFFF',
    border: 'rgba(255,255,255,0.08)',
    notification: '#E8497F',
  },
};

// Shared screen options — minimal chrome, dark bg
const screenOptions = {
  headerStyle: {
    backgroundColor: '#0D0D12',
  },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: {
    fontWeight: '600' as const,
    fontSize: 17,
  },
  headerShadowVisible: false,
  contentStyle: {
    backgroundColor: '#0D0D12',
  },
  animation: 'slide_from_right' as const,
};

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0D0D12"
        translucent={false}
      />
      <NavigationContainer theme={AppTheme}>
        <Stack.Navigator
          initialRouteName="CategorySelect"
          screenOptions={screenOptions}
        >
          <Stack.Screen
            name="CategorySelect"
            component={CategorySelectScreen}
            options={{
              headerShown: false, // Full-screen home
            }}
          />

          <Stack.Screen
            name="PhotoSelect"
            component={PhotoSelectScreen}
            options={{
              title: 'Select Photo',
              headerBackTitle: 'Back',
            }}
          />

          <Stack.Screen
            name="Customize"
            component={CustomizeScreen}
            options={{
              title: 'Customize',
              headerBackTitle: 'Photo',
            }}
          />

          <Stack.Screen
            name="Preview"
            component={PreviewScreen}
            options={{
              title: 'Preview',
              headerBackTitle: 'Edit',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default App;
