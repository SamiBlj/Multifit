import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useNutritionStore } from '../../store/nutritionStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useRecommendationsStore } from '../../store/recommendationsStore';
import { GOAL_META } from '../../constants/goalMeta';

export default function ProfileScreen() {
  const { profile, clearProfile }    = useUserStore();
  const { logout }                   = useAuthStore();
  const { calendar }                 = useNutritionStore();
  const { plan }                     = useWorkoutStore();
  const { recommendations }          = useRecommendationsStore();
  const goalMeta = GOAL_META[profile?.goal ?? 'maintain'];
  const targets  = recommendations?.dailyTargets;

  const stats = profile ? [
    { label: 'Age',       value: `${profile.age} yrs` },
    { label: 'Height',    value: `${profile.heightCm} cm` },
    { label: 'Weight',    value: `${profile.weightKg} kg` },
    { label: 'Cook time', value: `${profile.cookingTimeMinutes} min` },
  ] : [];

  const macroStats = targets ? [
    { label: 'Calories', value: `${targets.calories}`, unit: 'kcal', color: Colors.primary },
    { label: 'Protein',  value: `${targets.proteinG}`, unit: 'g',    color: Colors.accent },
    { label: 'Carbs',    value: `${targets.carbsG}`,   unit: 'g',    color: Colors.bulk },
    { label: 'Fat',      value: `${targets.fatG}`,     unit: 'g',    color: Colors.cut },
  ] : [];

  async function handleLogout() {
    await logout();
    clearProfile();
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Profile</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{profile?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={styles.profileName}>{profile?.name ?? 'Athlete'}</Text>
          <Text style={styles.profileEmail}>{useAuthStore.getState().user?.email ?? ''}</Text>
          <View style={[styles.goalBadge, { backgroundColor: `${goalMeta.color}22`, borderColor: goalMeta.color }]}>
            <Text style={[styles.goalText, { color: goalMeta.color }]}>{goalMeta.emoji}  {goalMeta.label}</Text>
          </View>
        </View>

        {/* Physical stats */}
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Daily targets */}
        {targets && (
          <>
            <Text style={styles.sectionTitle}>Daily Targets</Text>
            <View style={styles.statsGrid}>
              {macroStats.map((s) => (
                <View key={s.label} style={[styles.statCard, { borderColor: `${s.color}44` }]}>
                  <View style={styles.targetValueRow}>
                    <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                    <Text style={[styles.targetUnit, { color: s.color }]}>{s.unit}</Text>
                  </View>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Dietary restrictions */}
        {profile && (profile.allergies.length > 0 || profile.intolerances.length > 0) && (
          <>
            <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
            <View style={styles.chipRow}>
              {[...profile.allergies, ...profile.intolerances].map((a) => (
                <View key={a} style={styles.chip}>
                  <Text style={styles.chipText}>{a}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Plan summary */}
        <Text style={styles.sectionTitle}>Your Plans</Text>
        <View style={styles.card}>
          <View style={styles.planRow}>
            <Ionicons name="restaurant-outline" size={20} color={Colors.primary} />
            <View style={styles.planInfo}>
              <Text style={styles.planLabel}>Meal Plan</Text>
              <Text style={styles.planValue}>
                {calendar ? `${calendar.days.length} days · from ${calendar.weekStartDate}` : 'Not generated yet'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.planRow}>
            <Ionicons name="barbell-outline" size={20} color={Colors.primary} />
            <View style={styles.planInfo}>
              <Text style={styles.planLabel}>Workout Programme</Text>
              <Text style={styles.planValue}>
                {plan ? `${plan.weeksTotal} weeks · ${plan.days.length} sessions` : 'Not generated yet'}
              </Text>
            </View>
          </View>
        </View>

        {/* Pro upgrade card */}
        {!(profile as any)?.isPremium ? (
          <TouchableOpacity style={styles.proCard} onPress={() => router.push('/paywall')} activeOpacity={0.9}>
            <View style={styles.proLeft}>
              <Text style={styles.proEmoji}>👑</Text>
              <View>
                <Text style={styles.proTitle}>Upgrade to Pro</Text>
                <Text style={styles.proSub}>AI plans · unlimited logging · advanced stats</Text>
              </View>
            </View>
            <View style={styles.proChevron}>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.proBadgeCard}>
            <Text style={styles.proEmoji}>👑</Text>
            <View>
              <Text style={[styles.proTitle, { color: Colors.primary }]}>MultiFit Pro</Text>
              <Text style={[styles.proSub, { color: Colors.textMuted }]}>Active · {(profile as any).premiumPlan ?? 'annual'} plan</Text>
            </View>
            <View style={styles.proActiveBadge}>
              <Text style={styles.proActiveBadgeText}>ACTIVE</Text>
            </View>
          </View>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.card}>
          {[
            { icon: 'settings-outline' as const,  label: 'Settings & Notifications',  onPress: () => router.push('/settings') },
            { icon: 'refresh-outline' as const,   label: 'Regenerate My Plans',       onPress: () => router.replace('/onboarding') },
          ].map((item, i) => (
            <View key={item.label}>
              {i > 0 && <View style={styles.divider} />}
              <TouchableOpacity style={styles.actionRow} onPress={item.onPress}>
                <Ionicons name={item.icon} size={20} color={Colors.textSecondary} />
                <Text style={styles.actionLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: Colors.background },
  scroll:          { padding: Spacing.xl, paddingBottom: 80 },
  headerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  pageTitle:       { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  settingsBtn:     { padding: 6 },
  avatarSection:   { alignItems: 'center', marginBottom: Spacing.xl },
  avatar:          { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  avatarInitial:   { fontSize: 36, fontWeight: FontWeight.bold, color: Colors.white },
  profileName:     { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  profileEmail:    { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2, marginBottom: Spacing.sm },
  goalBadge:       { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1, marginTop: Spacing.xs },
  goalText:        { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  sectionTitle:    { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.lg },
  statsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  statCard:        { flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: 'center' },
  statValue:       { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  targetValueRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  targetUnit:      { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  statLabel:       { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  chip:            { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: `${Colors.error}22`, borderWidth: 1, borderColor: Colors.error },
  chipText:        { color: Colors.error, fontSize: FontSize.sm },
  card:            { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: Spacing.sm },
  planRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  planInfo:        { flex: 1 },
  planLabel:       { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  planValue:       { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  divider:         { height: 1, backgroundColor: Colors.border },
  actionRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  actionLabel:     { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  logoutBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.error },
  logoutText:      { color: Colors.error, fontSize: FontSize.md, fontWeight: FontWeight.medium },

  // Pro cards
  proCard:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md },
  proBadgeCard:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: `${Colors.primary}15`, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: `${Colors.primary}44` },
  proLeft:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  proEmoji:        { fontSize: 28 },
  proTitle:        { fontSize: FontSize.md, fontWeight: FontWeight.black, color: Colors.white },
  proSub:          { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  proChevron:      { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  proActiveBadge:  { marginLeft: 'auto', backgroundColor: `${Colors.primary}33`, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.primary },
  proActiveBadgeText: { fontSize: 10, fontWeight: FontWeight.black, color: Colors.primary, letterSpacing: 0.8 },
});
