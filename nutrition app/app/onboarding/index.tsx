/**
 * Onboarding Step 1 — Welcome screen
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';

export default function WelcomeScreen() {
  return (
    <LinearGradient colors={[Colors.background, '#1A0A00']} style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>MULTI</Text>
          <Text style={[styles.logoText, { color: Colors.primary }]}>FIT</Text>
        </View>

        <Text style={styles.tagline}>Your personal nutritionist{'\n'}and trainer. In one app.</Text>

        {/* Feature bullets */}
        <View style={styles.features}>
          {[
            { icon: '🥗', label: 'AI-generated daily meal plans' },
            { icon: '🏋️', label: 'Goal-matched workout programmes' },
            { icon: '⚡', label: 'Built entirely around you' },
          ].map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.cta} onPress={() => router.push('/onboarding/basicStats')}>
        <Text style={styles.ctaText}>Get Started</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  logoRow: { flexDirection: 'row', marginBottom: Spacing.lg },
  logoText: { fontSize: 48, fontWeight: FontWeight.black, color: Colors.textPrimary, letterSpacing: 4 },
  tagline: { fontSize: FontSize.xl, color: Colors.textSecondary, lineHeight: 32, marginBottom: Spacing.xxl },
  features: { gap: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureIcon: { fontSize: 24 },
  featureLabel: { fontSize: FontSize.md, color: Colors.textSecondary },
  cta: {
    margin: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
});
