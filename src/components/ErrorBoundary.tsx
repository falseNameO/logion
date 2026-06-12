import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors, Fonts } from '../theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Catches unhandled JS errors anywhere in the subtree and shows a
 * user-friendly recovery screen instead of a blank crash.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }

  handleRestart = () => {
    // Reset boundary state — the app will re-render from the top.
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          The app hit an unexpected error. Your study progress is safe.
        </Text>
        <Text style={styles.detail} numberOfLines={4}>
          {this.state.errorMessage}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={this.handleRestart}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Restart App</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontFamily: Fonts.sansBold,
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  detail: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textFaint,
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 8,
  },
  button: {
    marginTop: 12,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  buttonText: {
    fontFamily: Fonts.sansBold,
    fontSize: 16,
    color: Colors.textDark,
    fontWeight: '700',
  },
});
