import { useLocalSearchParams, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { MEAL_CATALOG } from '../../services/recommendation/mealCatalog';
import { useRecommendationsStore } from '../../store/recommendationsStore';
import { useAuthStore } from '../../store/authStore';
import { logMeal } from '../../services/supabase/database';

const { width } = Dimensions.get('window');

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#FF6B35',
  lunch:     '#FFB800',
  dinner:    '#7C4DFF',
  snack:     '#00C853',
};
const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎',
};

// Map cooking action keywords → illustrative emoji
const STEP_EMOJI_MAP: [RegExp, string][] = [
  [/heat|preheat|warm|oven/i,          '🔥'],
  [/boil|simmer|poach/i,               '♨️'],
  [/fry|sauté|sear|pan/i,              '🍳'],
  [/grill|bbq|barbecue/i,              '🥩'],
  [/bake|roast/i,                      '🫕'],
  [/steam/i,                           '💨'],
  [/mix|stir|whisk|combine|blend/i,    '🥄'],
  [/chop|slice|dice|cut|mince/i,       '🔪'],
  [/marinate|season|spice|salt|pepper/i,'🧂'],
  [/serve|plate|garnish|top/i,         '🍽️'],
  [/wash|rinse|drain/i,                '🚿'],
  [/peel|grate|zest/i,                 '🧅'],
  [/add|pour|drizzle/i,                '🫙'],
  [/rest|stand|let/i,                  '⏱️'],
  [/refrigerat|chill|cool/i,           '❄️'],
  [/toast|brown/i,                     '🍞'],
  [/squeeze|juice/i,                   '🍋'],
  [/boil.*egg|egg/i,                   '🥚'],
  [/sauce|glaze/i,                     '🥣'],
  [/wrap|roll/i,                       '🌯'],
];

function stepEmoji(step: string): string {
  for (const [re, emoji] of STEP_EMOJI_MAP) {
    if (re.test(step)) return emoji;
  }
  return '👨‍🍳';
}

// Map ingredient keywords → emoji
const ING_EMOJI_MAP: [RegExp, string][] = [
  [/chicken|turkey|poultry/i, '🍗'],
  [/beef|steak|mince|ground/i,'🥩'],
  [/fish|salmon|tuna|cod|prawn|shrimp/i,'🐟'],
  [/egg/i,                    '🥚'],
  [/milk|cream|yogurt|cheese/i,'🥛'],
  [/rice|quinoa|grain/i,      '🍚'],
  [/pasta|noodle|spaghetti/i, '🍝'],
  [/bread|toast/i,            '🍞'],
  [/potato/i,                 '🥔'],
  [/tomato/i,                 '🍅'],
  [/onion|garlic|leek/i,      '🧅'],
  [/pepper|capsicum/i,        '🫑'],
  [/carrot/i,                 '🥕'],
  [/broccoli|spinach|kale|lettuce|salad|greens/i,'🥦'],
  [/mushroom/i,               '🍄'],
  [/avocado/i,                '🥑'],
  [/lemon|lime/i,             '🍋'],
  [/olive oil|oil/i,          '🫒'],
  [/butter/i,                 '🧈'],
  [/salt|pepper|spice|herb|cumin|paprika|turmeric|coriander/i,'🧂'],
  [/sugar|honey/i,            '🍯'],
  [/sauce|soy|teriyaki/i,     '🫙'],
  [/bean|lentil|chickpea/i,   '🫘'],
  [/nut|almond|cashew|walnut/i,'🥜'],
  [/fruit|apple|banana|berry/i,'🍓'],
  [/oat/i,                    '🌾'],
  [/flour/i,                  '🌾'],
  [/tofu/i,                   '🧊'],
];

function ingEmoji(name: string): string {
  for (const [re, emoji] of ING_EMOJI_MAP) {
    if (re.test(name)) return emoji;
  }
  return '🥗';
}

// Difficulty heuristic based on instruction count + keywords
function difficulty(instructions: string[]): { label: string; color: string; stars: number } {
  const n = instructions.length;
  const hard = instructions.join(' ').match(/marinate|overnight|rest|deglaze|reduce|caramelise/i);
  if (n <= 3 && !hard) return { label: 'Easy', color: '#00C853', stars: 1 };
  if (n <= 6 && !hard) return { label: 'Medium', color: '#FFB800', stars: 2 };
  return { label: 'Advanced', color: '#FF6B35', stars: 3 };
}

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recommendations } = useRecommendationsStore();
  const { user } = useAuthStore();

  const [showLogModal, setShowLogModal] = useState(false);
  const [servings, setServings]         = useState('1');

  const meal = useMemo(() => {
    const fromCatalog = MEAL_CATALOG.find(m => m.id === id);
    if (fromCatalog) return fromCatalog as any;
    if (!recommendations) return null;
    const all = [
      ...recommendations.breakfast, ...recommendations.lunch,
      ...recommendations.dinner,    ...recommendations.snack,
    ];
    return all.find((m: any) => m.id === id) ?? null;
  }, [id, recommendations]);

  if (!meal) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.notFound}>
          <Text style={{ fontSize: 48 }}>🍽️</Text>
          <Text style={s.notFoundText}>Meal not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const col   = MEAL_COLORS[meal.type] ?? Colors.primary;
  const diff  = difficulty(meal.instructions ?? []);
  const s_val = parseFloat(servings) || 1;

  async function handleLog() {
    if (!user?.uid) return;
    await logMeal(user.uid, {
      mealType: meal.type, name: meal.name,
      calories: Math.round(meal.calories * s_val),
      proteinG: Math.round(meal.protein  * s_val),
      carbsG:   Math.round(meal.carbs    * s_val),
      fatG:     Math.round(meal.fat      * s_val),
      servings: s_val, catalogId: meal.id,
    }).catch(() => {});
    setShowLogModal(false);
    router.back();
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero illustration ──────────────────────────────────────────── */}
        <View style={[s.hero, { backgroundColor: `${col}22` }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          {/* Big food emoji as the "hero image" */}
          <View style={[s.heroPlate, { borderColor: `${col}55`, shadowColor: col }]}>
            <Text style={s.heroEmoji}>
              {meal.type === 'breakfast' ? '🍳'
               : meal.type === 'lunch'  ? '🥗'
               : meal.type === 'dinner' ? '🍲'
               : '🍎'}
            </Text>
          </View>

          <View style={[s.mealTypeBadge, { backgroundColor: col }]}>
            <Text style={s.mealTypeIcon}>{MEAL_ICONS[meal.type]}</Text>
            <Text style={s.mealTypeTxt}>{meal.type.toUpperCase()}</Text>
          </View>
          <Text style={s.heroName}>{meal.name}</Text>
          {meal.description ? (
            <Text style={s.heroDesc}>{meal.description}</Text>
          ) : null}

          {/* Meta pills */}
          <View style={s.metaRow}>
            {meal.prepTimeMinutes != null && (
              <View style={s.metaPill}>
                <Text style={s.metaPillEmoji}>⏱️</Text>
                <Text style={s.metaPillText}>{meal.prepTimeMinutes} min</Text>
              </View>
            )}
            <View style={[s.metaPill, { borderColor: diff.color }]}>
              <Text style={s.metaPillEmoji}>{'⭐'.repeat(diff.stars)}</Text>
              <Text style={[s.metaPillText, { color: diff.color }]}>{diff.label}</Text>
            </View>
            {meal.servingSize && (
              <View style={s.metaPill}>
                <Text style={s.metaPillEmoji}>🥣</Text>
                <Text style={s.metaPillText}>{meal.servingSize}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Macro strip ────────────────────────────────────────────────── */}
        <View style={s.macroStrip}>
          {[
            { label: 'Calories', value: meal.calories, unit: 'kcal', color: Colors.primary,   emoji: '🔥' },
            { label: 'Protein',  value: meal.protein,  unit: 'g',    color: Colors.accent,    emoji: '💪' },
            { label: 'Carbs',    value: meal.carbs,    unit: 'g',    color: Colors.bulk,      emoji: '⚡' },
            { label: 'Fat',      value: meal.fat,      unit: 'g',    color: '#A78BFA',        emoji: '🥑' },
          ].map(m => (
            <View key={m.label} style={[s.macroChip, { borderBottomColor: m.color, borderBottomWidth: 3 }]}>
              <Text style={s.macroEmoji}>{m.emoji}</Text>
              <Text style={[s.macroVal, { color: m.color }]}>{m.value}</Text>
              <Text style={s.macroUnit}>{m.unit}</Text>
              <Text style={s.macroLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Tags ───────────────────────────────────────────────────────── */}
        {meal.tags?.length > 0 && (
          <View style={s.tagRow}>
            {meal.tags.map((tag: string) => (
              <View key={tag} style={[s.tag, { borderColor: `${col}55` }]}>
                <Text style={[s.tagText, { color: col }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Ingredients – visual grid ───────────────────────────────────── */}
        {meal.ingredients?.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Ingredients</Text>
              <Text style={s.sectionCount}>{meal.ingredients.length} items</Text>
            </View>
            <View style={s.ingGrid}>
              {meal.ingredients.map((ing: any, i: number) => (
                <View key={i} style={[s.ingCard, { borderTopColor: col, borderTopWidth: 2 }]}>
                  <View style={[s.ingIconWrap, { backgroundColor: `${col}18` }]}>
                    <Text style={s.ingIcon}>{ingEmoji(ing.name)}</Text>
                  </View>
                  <Text style={s.ingName} numberOfLines={2}>{ing.name}</Text>
                  <Text style={[s.ingAmount, { color: col }]}>{ing.amount}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Cooking steps – visual cards ────────────────────────────────── */}
        {meal.instructions?.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>How to Cook</Text>
              <Text style={s.sectionCount}>{meal.instructions.length} steps</Text>
            </View>
            {meal.instructions.map((step: string, i: number) => {
              const emoji = stepEmoji(step);
              const isLast = i === meal.instructions.length - 1;
              return (
                <View key={i} style={s.stepWrap}>
                  {/* connector line */}
                  {!isLast && <View style={[s.stepLine, { backgroundColor: `${col}33` }]} />}

                  <View style={[s.stepCard, { borderLeftColor: col, borderLeftWidth: 3 }]}>
                    {/* Step number + emoji */}
                    <View style={s.stepTop}>
                      <View style={[s.stepNumBadge, { backgroundColor: col }]}>
                        <Text style={s.stepNumText}>{i + 1}</Text>
                      </View>
                      <View style={[s.stepIconWrap, { backgroundColor: `${col}15` }]}>
                        <Text style={s.stepIcon}>{emoji}</Text>
                      </View>
                    </View>
                    <Text style={s.stepText}>{step}</Text>
                  </View>
                </View>
              );
            })}

            {/* Done card */}
            <View style={[s.doneCard, { backgroundColor: `${col}18`, borderColor: `${col}44` }]}>
              <Text style={s.doneEmoji}>🎉</Text>
              <Text style={[s.doneTxt, { color: col }]}>Ready to eat!</Text>
            </View>
          </View>
        )}

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* ── Sticky log button ──────────────────────────────────────────────── */}
      <View style={s.stickyBar}>
        <TouchableOpacity
          style={[s.logBtn, { backgroundColor: col }]}
          onPress={() => setShowLogModal(true)}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={s.logBtnText}>I ate this</Text>
        </TouchableOpacity>
      </View>

      {/* ── Servings modal ─────────────────────────────────────────────────── */}
      <Modal visible={showLogModal} transparent animationType="slide" onRequestClose={() => setShowLogModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Log Meal</Text>
            <Text style={s.sheetSub}>{meal.name}</Text>

            <View style={s.previewRow}>
              {[
                { l: 'Cal',  v: Math.round(meal.calories * s_val), c: Colors.primary },
                { l: 'Pro',  v: Math.round(meal.protein  * s_val), c: Colors.accent  },
                { l: 'Carb', v: Math.round(meal.carbs    * s_val), c: Colors.bulk    },
                { l: 'Fat',  v: Math.round(meal.fat      * s_val), c: '#A78BFA'      },
              ].map(m => (
                <View key={m.l} style={[s.previewChip, { borderTopColor: m.c, borderTopWidth: 2 }]}>
                  <Text style={[s.previewVal, { color: m.c }]}>{m.v}</Text>
                  <Text style={s.previewLbl}>{m.l}</Text>
                </View>
              ))}
            </View>

            <Text style={s.fieldLabel}>Servings</Text>
            <View style={s.presetRow}>
              {['0.5','1','1.5','2'].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[s.preset, servings === v && { backgroundColor: col, borderColor: col }]}
                  onPress={() => setServings(v)}
                >
                  <Text style={[s.presetText, servings === v && { color: '#fff' }]}>{v}×</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={s.input}
              value={servings}
              onChangeText={setServings}
              keyboardType="decimal-pad"
              placeholder="Custom servings"
              placeholderTextColor={Colors.textMuted}
            />
            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowLogModal(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: col }]} onPress={handleLog}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={s.confirmText}>Log it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const CARD_W = (width - Spacing.xl * 2 - Spacing.sm * 2) / 3;

const s = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: Colors.background },
  scroll:         { paddingBottom: 20 },
  notFound:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  notFoundText:   { color: Colors.textMuted, fontSize: FontSize.md },

  // Back button
  backBtn:        { padding: Spacing.md },

  // Hero
  hero:           { paddingBottom: Spacing.xl, paddingHorizontal: Spacing.xl },
  heroPlate:      {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 3,
    marginBottom: Spacing.md,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  heroEmoji:      { fontSize: 72 },
  mealTypeBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 5, marginBottom: Spacing.sm },
  mealTypeIcon:   { fontSize: 13 },
  mealTypeTxt:    { fontSize: 11, color: '#fff', fontWeight: FontWeight.black, letterSpacing: 1 },
  heroName:       { fontSize: 26, fontWeight: FontWeight.black, color: Colors.textPrimary, textAlign: 'center', lineHeight: 32, marginBottom: Spacing.sm },
  heroDesc:       { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.md },
  metaRow:        { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  metaPill:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  metaPillEmoji:  { fontSize: 13 },
  metaPillText:   { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.semibold },

  // Macros
  macroStrip:     { flexDirection: 'row', marginHorizontal: Spacing.xl, marginTop: Spacing.lg, gap: Spacing.sm },
  macroChip:      { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', paddingVertical: Spacing.md, gap: 2 },
  macroEmoji:     { fontSize: 16, marginBottom: 2 },
  macroVal:       { fontSize: FontSize.lg, fontWeight: FontWeight.black },
  macroUnit:      { fontSize: 9, color: Colors.textMuted },
  macroLabel:     { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Tags
  tagRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Spacing.xl, marginTop: Spacing.md },
  tag:            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, backgroundColor: Colors.surface },
  tagText:        { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  // Section
  section:        { marginTop: Spacing.xl, paddingHorizontal: Spacing.xl },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle:   { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.textPrimary },
  sectionCount:   { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },

  // Ingredient grid
  ingGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  ingCard:        { width: CARD_W, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm, alignItems: 'center', gap: 6 },
  ingIconWrap:    { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  ingIcon:        { fontSize: 28 },
  ingName:        { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', fontWeight: FontWeight.medium, lineHeight: 15 },
  ingAmount:      { fontSize: 11, fontWeight: FontWeight.black },

  // Cooking steps
  stepWrap:       { position: 'relative', marginBottom: Spacing.sm },
  stepLine:       { position: 'absolute', left: 16, top: 72, bottom: -Spacing.sm, width: 2 },
  stepCard:       { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm },
  stepTop:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  stepNumBadge:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepNumText:    { fontSize: FontSize.sm, fontWeight: FontWeight.black, color: '#fff' },
  stepIconWrap:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stepIcon:       { fontSize: 24 },
  stepText:       { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },

  // Done card
  doneCard:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg, marginTop: Spacing.sm },
  doneEmoji:      { fontSize: 28 },
  doneTxt:        { fontSize: FontSize.lg, fontWeight: FontWeight.black },

  // Sticky bar
  stickyBar:      { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, paddingBottom: 36, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  logBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingVertical: 16 },
  logBtnText:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#fff' },

  // Modal
  overlay:        { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet:          { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, paddingBottom: 48 },
  sheetHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.lg },
  sheetTitle:     { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.textPrimary, marginBottom: 4 },
  sheetSub:       { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.lg },
  previewRow:     { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  previewChip:    { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', gap: 2 },
  previewVal:     { fontSize: FontSize.lg, fontWeight: FontWeight.black },
  previewLbl:     { fontSize: 10, color: Colors.textMuted },
  fieldLabel:     { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  presetRow:      { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  preset:         { flex: 1, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surfaceElevated },
  presetText:     { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  input:          { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.md, marginTop: Spacing.sm, marginBottom: Spacing.lg },
  sheetActions:   { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn:      { flex: 1, paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText:     { color: Colors.textSecondary, fontWeight: FontWeight.medium },
  confirmBtn:     { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: Radius.lg },
  confirmText:    { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.md },
});
