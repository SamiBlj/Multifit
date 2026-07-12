import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, Link } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  const { login, isLoading, error, clearError } = useAuthStore();

  useEffect(() => { clearError(); }, []);

  async function handleLogin() {
    clearError();
    if (!email || !password) return;
    try {
      await login(email.trim().toLowerCase(), password);
      // _layout auth listener will detect sign-in and load profile;
      // route is handled there via onboarding_complete flag
    } catch {
      // error already set in store
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>MULTI</Text>
          <Text style={[styles.logoText, { color: Colors.primary }]}>FIT</Text>
        </View>
        <Text style={styles.title}>Welcome back</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@email.com"
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={Colors.textMuted}
        />

        <TouchableOpacity
          style={[styles.cta, isLoading && styles.ctaDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.ctaText}>Log In</Text>}
        </TouchableOpacity>

        <Link href="/auth/register" asChild>
          <TouchableOpacity style={styles.switchLink}>
            <Text style={styles.switchText}>
              No account? <Text style={{ color: Colors.primary }}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: Colors.background },
  content:      { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  logoRow:      { flexDirection: 'row', marginBottom: Spacing.xl },
  logoText:     { fontSize: 40, fontWeight: FontWeight.black, color: Colors.textPrimary, letterSpacing: 4 },
  title:        { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xl },
  label:        { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md, fontWeight: FontWeight.medium },
  input:        { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.md },
  errorText:    { color: Colors.error, fontSize: FontSize.sm, marginBottom: Spacing.sm },
  cta:          { marginTop: Spacing.xl, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  ctaDisabled:  { opacity: 0.5 },
  ctaText:      { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
  switchLink:   { marginTop: Spacing.lg, alignItems: 'center' },
  switchText:   { color: Colors.textMuted, fontSize: FontSize.md },
});
