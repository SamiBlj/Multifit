import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';

const ACCENT_COLORS = [
  { label: 'Blaze',   color: '#FF6B35', id: 'blaze' },
  { label: 'Cyan',    color: '#00E5FF', id: 'cyan' },
  { label: 'Volt',    color: '#C6FF00', id: 'volt' },
  { label: 'Violet',  color: '#7C4DFF', id: 'violet' },
  { label: 'Rose',    color: '#FF4081', id: 'rose' },
  { label: 'Gold',    color: '#FFB800', id: 'gold' },
];
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { useRecommendationsStore } from '../store/recommendationsStore';
import { saveBodyMetric } from '../services/supabase/database';
import { supabase } from '../services/supabase/client';
import { recommendMeals } from '../services/recommendation/mealRecommender';

// ─── Settings shape stored in Firestore ───────────────────────────────────────
interface AppSettings {
  units: 'metric' | 'imperial';
  notificationsEnabled: boolean;
  mealReminders: boolean;
  workoutReminders: boolean;
  weeklyReport: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  units: 'metric',
  notificationsEnabled: true,
  mealReminders: true,
  workoutReminders: true,
  weeklyReport: true,
};

export default function SettingsScreen() {
  const { profile, updateProfile } = useUserStore();
  const { user }                   = useAuthStore();
  const { setRecommendations }     = useRecommendationsStore();

  const [settings, setSettings]       = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving]           = useState(false);
  const [accentId, setAccentId]       = useState('blaze');
  const [weightInput, setWeightInput] = useState('');
  const [editingWeight, setEditingWeight] = useState(false);

  // Profile edit fields
  const [cookingTime, setCookingTime] = useState(String(profile?.cookingTimeMinutes ?? 30));
  const [age, setAge]                 = useState(String(profile?.age ?? ''));

  useEffect(() => {
    if (!user?.uid) return;
    supabase.from('profiles').select('settings').eq('id', user.uid).single().then(({ data }) => {
      if (data?.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    });
  }, [user?.uid]);

  async function saveSetting(key: keyof AppSettings, value: boolean | string) {
    if (!user?.uid) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await supabase.from('profiles').upsert({ id: user.uid, settings: updated, updated_at: new Date().toISOString() });
  }

  async function saveProfileChanges() {
    if (!user?.uid || !profile) return;
    setSaving(true);
    try {
      const fields: any = {};
      if (cookingTime && Number(cookingTime) !== profile.cookingTimeMinutes)
        fields.cookingTimeMinutes = Number(cookingTime);
      if (age && Number(age) !== profile.age)
        fields.age = Number(age);

      if (Object.keys(fields).length > 0) {
        await updateProfile(user.uid, fields);
        // Recompute recommendations with updated profile
        const updated = { ...profile, ...fields };
        setRecommendations(recommendMeals(updated));
        Alert.alert('Saved', 'Profile updated and recommendations recalculated.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function logBodyWeight() {
    if (!user?.uid || !weightInput) return;
    const kg = Number(weightInput);
    if (isNaN(kg) || kg < 20 || kg > 300) {
      Alert.alert('Invalid', 'Enter a weight between 20 and 300 kg.');
      return;
    }
    await saveBodyMetric(user.uid, { weightKg: kg });
    // Also update profile weight so recommender recalculates
    if (profile) {
      await updateProfile(user.uid, { weightKg: kg });
      setRecommendations(recommendMeals({ ...profile, weightKg: kg }));
    }
    setWeightInput('');
    setEditingWeight(false);
    Alert.alert('Logged', `Weight ${kg} kg saved.`);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Back button ──────────────────────────────────────────────────── */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* ── Branded logo hero ─────────────────────────────────────────────── */}
        <View style={styles.logoHero}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoMulti}>MULTI</Text>
            <Text style={[styles.logoFit, { color: Colors.primary }]}>FIT</Text>
          </View>
          <View style={styles.logoDivider} />
          <Text style={styles.logoTagline}>Train smarter. Eat better. Live stronger.</Text>
          <View style={styles.versionRow}>
            <View style={styles.versionBadge}>
              <Ionicons name="flash" size={11} color={Colors.primary} />
              <Text style={styles.versionText}>Version 1.0.0</Text>
            </View>
            {(profile as any)?.isPremium && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>👑 PRO</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Appearance ────────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.appearanceHeader}>
            <Ionicons name="color-palette-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.appearanceTitle}>Accent Colour</Text>
          </View>
          <View style={styles.colorGrid}>
            {ACCENT_COLORS.map((ac) => (
              <TouchableOpacity
                key={ac.id}
                style={[styles.colorSwatch, { backgroundColor: ac.color }, accentId === ac.id && styles.colorSwatchActive]}
                onPress={() => setAccentId(ac.id)}
                activeOpacity={0.8}
              >
                {accentId === ac.id && (
                  <Ionicons name="checkmark" size={18} color="#000" />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.colorLabelRow}>
            {ACCENT_COLORS.map((ac) => (
              <Text key={ac.id} style={[styles.colorLabel, accentId === ac.id && { color: ac.color }]}>
                {ac.label}
              </Text>
            ))}
          </View>
          <View style={styles.darkModeRow}>
            <View style={styles.darkModeLeft}>
              <Ionicons name="moon" size={18} color={Colors.accent} />
              <Text style={styles.darkModeLabel}>Dark Mode</Text>
            </View>
            <View style={styles.darkModeBadge}>
              <Text style={styles.darkModeBadgeText}>ACTIVE</Text>
            </View>
          </View>
        </View>

        {/* ── Profile Info ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          <Row label="Name" value={profile?.name ?? '—'} />
          <Divider />
          <Row label="Goal" value={profile?.goal ?? '—'} />
          <Divider />
          <Row label="Activity" value={profile?.activityLevel ?? '—'} />
        </View>

        {/* Editable profile fields */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Age</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholder="Your age"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>Max cooking time (min/day)</Text>
          <TextInput
            style={styles.input}
            value={cookingTime}
            onChangeText={setCookingTime}
            keyboardType="numeric"
            placeholder="e.g. 45"
            placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={saveProfileChanges}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Text style={styles.saveBtnText}>Save Changes & Recalculate</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Log Body Weight ───────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Body Weight</Text>
        <View style={styles.card}>
          <Row label="Current weight" value={`${profile?.weightKg ?? '—'} kg`} />
          {editingWeight ? (
            <View style={styles.weightRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                placeholder="e.g. 74.5"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
              <TouchableOpacity style={styles.logBtn} onPress={logBodyWeight}>
                <Text style={styles.logBtnText}>Log</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingWeight(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addWeightBtn} onPress={() => setEditingWeight(true)}>
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.addWeightText}>Log today's weight</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Notifications ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <ToggleRow
            label="Enable notifications"
            value={settings.notificationsEnabled}
            onChange={(v) => saveSetting('notificationsEnabled', v)}
          />
          <Divider />
          <ToggleRow
            label="Meal reminders"
            value={settings.mealReminders}
            onChange={(v) => saveSetting('mealReminders', v)}
            disabled={!settings.notificationsEnabled}
          />
          <Divider />
          <ToggleRow
            label="Workout reminders"
            value={settings.workoutReminders}
            onChange={(v) => saveSetting('workoutReminders', v)}
            disabled={!settings.notificationsEnabled}
          />
          <Divider />
          <ToggleRow
            label="Weekly progress report"
            value={settings.weeklyReport}
            onChange={(v) => saveSetting('weeklyReport', v)}
            disabled={!settings.notificationsEnabled}
          />
        </View>

        {/* ── Units ─────────────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Units</Text>
        <View style={styles.card}>
          {(['metric', 'imperial'] as const).map((u) => (
            <TouchableOpacity
              key={u}
              style={styles.unitRow}
              onPress={() => saveSetting('units', u)}
            >
              <Text style={styles.unitLabel}>{u === 'metric' ? 'Metric (kg, cm)' : 'Imperial (lb, ft)'}</Text>
              <View style={[styles.radio, settings.units === u && styles.radioActive]}>
                {settings.units === u && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Danger Zone ───────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.dangerRow}
            onPress={() =>
              Alert.alert(
                'Re-onboard',
                'This will take you back through the setup process and regenerate your plans.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Continue', onPress: () => router.replace('/onboarding') },
                ],
              )
            }
          >
            <Ionicons name="refresh-outline" size={18} color={Colors.warning} />
            <Text style={[styles.dangerText, { color: Colors.warning }]}>Regenerate my plan</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function ToggleRow({
  label, value, onChange, disabled = false,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, disabled && { opacity: 0.4 }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: Colors.border, true: `${Colors.primary}88` }}
        thumbColor={value ? Colors.primary : Colors.textMuted}
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: Colors.background },
  scroll:          { padding: Spacing.xl, paddingBottom: 80 },

  // Back button
  backBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.xl },
  backText:        { fontSize: FontSize.md, color: Colors.textPrimary },

  // Logo hero
  logoHero:        { alignItems: 'center', marginBottom: Spacing.xl, paddingVertical: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border },
  logoWrap:        { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.md },
  logoMulti:       { fontSize: 36, fontWeight: FontWeight.black, color: Colors.textPrimary, letterSpacing: 3 },
  logoFit:         { fontSize: 36, fontWeight: FontWeight.black, letterSpacing: 3 },
  logoDivider:     { width: 40, height: 2, backgroundColor: Colors.primary, borderRadius: 1, marginBottom: Spacing.md },
  logoTagline:     { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', fontStyle: 'italic', marginBottom: Spacing.md },
  versionRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  versionBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.primary}18`, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: `${Colors.primary}33` },
  versionText:     { fontSize: 11, color: Colors.primary, fontWeight: FontWeight.semibold },
  proBadge:        { backgroundColor: `${Colors.primary}22`, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary },
  proBadgeText:    { fontSize: 11, color: Colors.primary, fontWeight: FontWeight.black },

  // Appearance
  appearanceHeader:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  appearanceTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  colorGrid:       { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
  colorSwatch:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  colorSwatchActive:{ borderWidth: 3, borderColor: Colors.white },
  colorLabelRow:   { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  colorLabel:      { width: 40, fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  darkModeRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  darkModeLeft:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  darkModeLabel:   { fontSize: FontSize.md, color: Colors.textPrimary },
  darkModeBadge:   { backgroundColor: `${Colors.accent}18`, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: `${Colors.accent}44` },
  darkModeBadgeText:{ fontSize: 10, color: Colors.accent, fontWeight: FontWeight.black, letterSpacing: 0.8 },

  sectionTitle:    { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.lg },
  card:            { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: Spacing.sm },
  row:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14 },
  rowLabel:        { fontSize: FontSize.md, color: Colors.textPrimary },
  rowValue:        { fontSize: FontSize.md, color: Colors.textMuted, textTransform: 'capitalize' },
  divider:         { height: 1, backgroundColor: Colors.border },
  fieldLabel:      { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs, paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  input:           { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  saveBtn:         { margin: Spacing.md, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText:     { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  weightRow:       { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, alignItems: 'center' },
  logBtn:          { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12 },
  logBtnText:      { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  cancelBtn:       { paddingHorizontal: Spacing.sm, paddingVertical: 12 },
  cancelBtnText:   { color: Colors.textMuted, fontSize: FontSize.sm },
  addWeightBtn:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  addWeightText:   { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  unitRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14 },
  unitLabel:       { fontSize: FontSize.md, color: Colors.textPrimary, textTransform: 'capitalize' },
  radio:           { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive:     { borderColor: Colors.primary },
  radioDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  dangerRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  dangerText:      { fontSize: FontSize.md, fontWeight: FontWeight.medium },
});
