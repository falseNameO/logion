import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types';
import { Fonts } from '../theme';
import { useTheme } from '../ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import ModeSelectScreen from '../screens/ModeSelectScreen';
import SettingsScreen from '../screens/SettingsScreen';

import BibleChapterScopeScreen from '../screens/scope/BibleChapterScopeScreen';
import TextbookScopeScreen from '../screens/scope/TextbookScopeScreen';
import FrequencyScopeScreen from '../screens/scope/FrequencyScopeScreen';

import VocabListScreen from '../screens/study/VocabListScreen';
import OverviewScreen from '../screens/study/OverviewScreen';
import LearnScreen from '../screens/study/LearnScreen';

import RetrievalDashScreen from '../screens/retrieval/RetrievalDashScreen';
import RetrievalQuizScreen from '../screens/retrieval/RetrievalQuizScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const c = useTheme();
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.textPrimary,
          headerTitleStyle: {
            fontFamily: Fonts.sansBold,
            fontSize: 17,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.bg },
          animation: 'fade_from_bottom',
          animationDuration: 240,
          headerBlurEffect: undefined,
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Logion', animation: 'fade', headerShown: false }}
        />
        <Stack.Screen
          name="BibleChapterScope"
          component={BibleChapterScopeScreen}
          options={{ title: 'Bible Chapter' }}
        />
        <Stack.Screen
          name="TextbookScope"
          component={TextbookScopeScreen}
          options={{ title: 'Textbook' }}
        />
        <Stack.Screen
          name="FrequencyScope"
          component={FrequencyScopeScreen}
          options={{ title: 'Frequency Range' }}
        />
        <Stack.Screen
          name="ModeSelect"
          component={ModeSelectScreen}
          options={{ title: 'Choose Mode' }}
        />
        <Stack.Screen
          name="VocabList"
          component={VocabListScreen}
          options={{ title: 'Vocabulary' }}
        />
        <Stack.Screen
          name="Overview"
          component={OverviewScreen}
          options={{ title: 'Overview' }}
        />
        <Stack.Screen
          name="Learn"
          component={LearnScreen}
          options={{ title: 'Learn', animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="RetrievalDash"
          component={RetrievalDashScreen}
          options={{ title: 'Retrieval' }}
        />
        <Stack.Screen
          name="RetrievalQuiz"
          component={RetrievalQuizScreen}
          options={{ title: 'Quiz', animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings', animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
