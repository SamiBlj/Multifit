import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing } from '../constants/theme';
import { getDailyQuote } from '../constants/motivationQuotes';

// Pure splash screen — all navigation is handled by _layout.tsx auth listener.
// This screen shows briefly while Firebase checks the auth state.
export default function SplashGate() {
  const quote = getDailyQuote();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>MULTI</Text>
        <Text style={[styles.logoText, { color: Colors.primary }]}>FIT</Text>
      </View>

      <View style={styles.quoteContainer}>
        <Text style={styles.quoteText}>"{quote.text}"</Text>
        <Text style={styles.quoteAuthor}>— {quote.author}</Text>
      </View>

      <ActivityIndicator color={Colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logoContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.xxl,
  },
  logoText: {
    fontSize: 48,
    fontWeight: FontWeight.black,
    color: Colors.textPrimary,
    letterSpacing: 4,
  },
  quoteContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.md,
  },
  quoteText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  quoteAuthor: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  loader: {
    position: 'absolute',
    bottom: 60,
  },
});
