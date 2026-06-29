import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, Link } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';

export default function RegisterScreen() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  const { register, isLoading, error, clearError } = useAuthStore();

  async function handleRegister() {
    clearError();
    if (password.length < 8) return;
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      router.replace('/onboarding');
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
        <Text style={styles.title}>Create your account</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {[
          { label: 'Name',     value: name,     set: setName,     placeholder: 'Alex',            secure: false, keyboard: 'default' as const },
          { label: 'Email',    value: email,    set: setEmail,    placeholder: 'you@email.com',   secure: false, keyboard: 'email-address' as const },
          { label: 'Password', value: password, set: setPassword, placeholder: '8+ characters',   secure: true,  keyboard: 'default' as const },
        ].map((f) => (
          <View key={f.label}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={styles.input}
              value={f.value}
              onChangeText={f.set}
              secureTextEntry={f.secure}
              keyboardType={f.keyboard}
              autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'words'}
              placeholder={f.placeholder}
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.cta, (isLoading || password.length < 8 || !name || !email) && styles.ctaDisabled]}
          onPress={handleRegister}
          disabled={isLoading || password.length < 8 || !name || !email}
        >
          {isLoading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.ctaText}>Create Account</Text>}
        </TouchableOpacity>

        <Link href="/auth/login" asChild>
          <TouchableOpacity style={styles.switchLink}>
            <Text style={styles.switchText}>
              Already have an account? <Text style={{ color: Colors.primary }}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: Colors.background },
  content:     { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  logoRow:     { flexDirection: 'row', marginBottom: Spacing.xl },
  logoText:    { fontSize: 40, fontWeight: FontWeight.black, color: Colors.textPrimary, letterSpacing: 4 },
  title:       { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xl },
  label:       { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md, fontWeight: FontWeight.medium },
  input:       { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.md },
  errorText:   { color: Colors.error, fontSize: FontSize.sm, marginBottom: Spacing.sm },
  cta:         { marginTop: Spacing.xl, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  ctaDisabled: { opacity: 0.4 },
  ctaText:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
  switchLink:  { marginTop: Spacing.lg, alignItems: 'center' },
  switchText:  { color: Colors.textMuted, fontSize: FontSize.md },
});
