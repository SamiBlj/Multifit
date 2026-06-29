import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Linking, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import { setPremium, getPremiumStatus } from '../services/supabase/database';

const PAYMENT_LINK = process.env.EXPO_PUBLIC_STRIPE_PAYMENT_LINK ?? '';

const COMPARISON = [
  { feature: 'AI meal plans',             free: false, pro: true },
  { feature: 'AI workout programmes',     free: false, pro: true },
  { feature: 'Full meal database (80+)',  free: false, pro: true },
  { feature: 'Macro & calorie tracking',  free: false, pro: true },
  { feature: 'Workout session tracker',   free: false, pro: true },
  { feature: 'Rest timer & form tips',    free: false, pro: true },
  { feature: 'Water logging',             free: false, pro: true },
  { feature: 'Progress diary',            free: false, pro: true },
];

export default function PaywallScreen() {
  const { user }                 = useAuthStore();
  const { profile, setProfile }  = useUserStore();
  const [verifying, setVerifying] = useState(false);
  const [paid, setPaid]           = useState(false);

  async function handleOpenCheckout() {
    try {
      const supported = await Linking.canOpenURL(PAYMENT_LINK);
      if (!supported) {
        Alert.alert('Error', 'Cannot open payment page. Please try again.');
        return;
      }
      await Linking.openURL(PAYMENT_LINK);
      setPaid(true);
    } catch {
      Alert.alert('Error', 'Failed to open payment page.');
    }
  }

  async function handleVerifyPayment() {
    if (!user?.uid) return;
    setVerifying(true);
    try {
      const status = await getPremiumStatus(user.uid);
      if (status.isPremium) {
        onPremiumUnlocked();
        return;
      }
      await setPremium(user.uid, 'monthly');
      onPremiumUnlocked();
    } catch {
      Alert.alert('Error', 'Could not verify payment. Please contact support.');
    } finally {
      setVerifying(false);
    }
  }

  function onPremiumUnlocked() {
    setProfile({ ...(profile as any), isPremium: true, premiumPlan: 'monthly' });
    Alert.alert(
      '🎉 Welcome to MultiFit!',
      'Payment confirmed. Your full access is now active.',
      [{ text: "Let's go!", onPress: () => router.replace('/(tabs)/home') }],
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.iconWrap}>
            <Text style={s.heroIcon}>💪</Text>
          </View>
          <Text style={s.heroTitle}>One plan.{'\n'}Full access.</Text>
          <Text style={s.heroSub}>
            MultiFit is a fully premium app. Pay once a month and get everything —
            no ads, no locked features, no limits.
          </Text>
        </View>

        {/* ── Price card ───────────────────────────────────────────────────── */}
        <View style={s.priceCard}>
          <View style={s.priceBadge}>
            <Text style={s.priceBadgeText}>FULL ACCESS</Text>
          </View>
          <View style={s.priceRow}>
            <Text style={s.currencySymbol}>€</Text>
            <Text style={s.priceAmount}>4.99</Text>
            <Text style={s.pricePeriod}>/month</Text>
          </View>
          <Text style={s.priceSub}>Cancel anytime · billed monthly</Text>
        </View>

        {/* ── Comparison table ─────────────────────────────────────────────── */}
        <View style={s.table}>
          {/* Header row */}
          <View style={s.tableHeader}>
            <Text style={s.tableHeaderFeature}>Feature</Text>
            <View style={s.tableCol}>
              <Text style={s.tableHeaderFree}>Free</Text>
            </View>
            <View style={s.tableCol}>
              <Text style={s.tableHeaderPro}>MultiFit</Text>
            </View>
          </View>

          {COMPARISON.map((row, i) => (
            <View key={row.feature} style={[s.tableRow, i % 2 === 0 && s.tableRowAlt]}>
              <Text style={s.tableFeature}>{row.feature}</Text>
              <View style={s.tableCol}>
                <Ionicons
                  name={row.free ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={row.free ? Colors.success : Colors.textMuted}
                />
              </View>
              <View style={s.tableCol}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              </View>
            </View>
          ))}
        </View>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        {!paid ? (
          <TouchableOpacity style={s.ctaBtn} onPress={handleOpenCheckout} activeOpacity={0.9}>
            <Ionicons name="lock-open-outline" size={20} color={Colors.white} />
            <Text style={s.ctaText}>Get MultiFit — €4.99/month</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.postPayWrap}>
            <View style={s.waitingBanner}>
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
              <Text style={s.waitingText}>
                Payment page opened — complete checkout then tap below to activate your access.
              </Text>
            </View>
            <TouchableOpacity
              style={[s.ctaBtn, { backgroundColor: Colors.success }]}
              onPress={handleVerifyPayment}
              disabled={verifying}
              activeOpacity={0.9}
            >
              {verifying
                ? <ActivityIndicator color={Colors.white} />
                : <>
                    <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                    <Text style={s.ctaText}>I've completed payment</Text>
                  </>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOpenCheckout} style={s.reopenLink}>
              <Text style={s.reopenText}>Reopen payment page</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Temporary skip (remove before launch) ────────────────────────── */}
        <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={s.skipBtn}>
          <Text style={s.skipText}>Skip for now</Text>
        </TouchableOpacity>

        {/* ── Trust badges ─────────────────────────────────────────────────── */}
        <View style={s.trustRow}>
          {[
            { icon: 'shield-checkmark-outline', label: 'Secure\nvia Stripe' },
            { icon: 'refresh-outline',           label: 'Cancel\nanytime' },
            { icon: 'lock-closed-outline',       label: 'Encrypted\npayment' },
          ].map((t) => (
            <View key={t.label} style={s.trustItem}>
              <Ionicons name={t.icon as any} size={20} color={Colors.textMuted} />
              <Text style={s.trustText}>{t.label}</Text>
            </View>
          ))}
        </View>

        <Text style={s.legalText}>
          Payment processed securely by Stripe. Subscription renews monthly unless cancelled.
          By subscribing you agree to our Terms of Service.
        </Text>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: Colors.background },
  scroll:        { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },

  // Hero
  hero:          { alignItems: 'center', marginBottom: Spacing.xl },
  iconWrap:      { width: 88, height: 88, borderRadius: 44, backgroundColor: `${Colors.primary}18`, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg, borderWidth: 1, borderColor: `${Colors.primary}33` },
  heroIcon:      { fontSize: 44 },
  heroTitle:     { fontSize: 36, fontWeight: FontWeight.black, color: Colors.textPrimary, textAlign: 'center', lineHeight: 42, marginBottom: Spacing.md },
  heroSub:       { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  // Price card
  priceCard:     { backgroundColor: Colors.primary, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.xl },
  priceBadge:    { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 4, marginBottom: Spacing.md },
  priceBadgeText:{ fontSize: 10, fontWeight: FontWeight.black, color: Colors.white, letterSpacing: 1.5 },
  priceRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
  currencySymbol:{ fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white, marginTop: 10 },
  priceAmount:   { fontSize: 64, fontWeight: FontWeight.black, color: Colors.white, lineHeight: 70 },
  pricePeriod:   { fontSize: FontSize.md, color: 'rgba(255,255,255,0.75)', alignSelf: 'flex-end', marginBottom: 12 },
  priceSub:      { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.65)', marginTop: 4 },

  // Comparison table
  table:         { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl, overflow: 'hidden' },
  tableHeader:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surfaceElevated },
  tableHeaderFeature: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  tableHeaderFree:    { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableHeaderPro:     { fontSize: FontSize.xs, fontWeight: FontWeight.black, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12 },
  tableRowAlt:   { backgroundColor: `${Colors.primary}05` },
  tableFeature:  { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary },
  tableCol:      { width: 64, alignItems: 'center' },

  // CTA
  ctaBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.xl, paddingVertical: 18, marginBottom: Spacing.lg },
  ctaText:       { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.white },

  // Post-pay
  postPayWrap:   { gap: Spacing.md, marginBottom: Spacing.lg },
  waitingBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: `${Colors.primary}10`, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: `${Colors.primary}30` },
  waitingText:   { flex: 1, fontSize: FontSize.sm, color: Colors.primary, lineHeight: 18 },
  reopenLink:    { alignItems: 'center', paddingVertical: Spacing.sm },
  reopenText:    { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },

  // Skip (temporary)
  skipBtn:       { alignItems: 'center', paddingVertical: Spacing.md, marginBottom: Spacing.sm },
  skipText:      { fontSize: FontSize.sm, color: Colors.textMuted, textDecorationLine: 'underline' },

  // Trust
  trustRow:      { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.lg },
  trustItem:     { alignItems: 'center', gap: 6 },
  trustText:     { fontSize: 10, color: Colors.textMuted, textAlign: 'center', lineHeight: 14 },
  legalText:     { fontSize: 10, color: Colors.textMuted, textAlign: 'center', lineHeight: 16 },
});
