import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, FlatList, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useNutritionStore } from '../../store/nutritionStore';
import { useRecommendationsStore } from '../../store/recommendationsStore';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { logMeal, logWater } from '../../services/supabase/database';
import { recommendMeals } from '../../services/recommendation/mealRecommender';
import { calcDailyTargets } from '../../services/recommendation/calorieCalculator';
import { MEAL_CATALOG, CatalogMeal } from '../../services/recommendation/mealCatalog';
import type { Meal } from '../../types';
import type { RecommendedMeal } from '../../services/recommendation/mealRecommender';

// Water goal: 35ml per kg of bodyweight, clamped to 2000–3500ml
function calcWaterGoalMl(weightKg?: number): number {
  if (!weightKg) return 2500;
  return Math.min(3500, Math.max(2000, Math.round(weightKg * 35 / 100) * 100));
}

const { width } = Dimensions.get('window');
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
const MEAL_COLORS: Record<string, string> = {
  breakfast: '#FF6B35', lunch: '#FFB800', dinner: '#7C4DFF', snack: '#00C853',
};
const TABS = ['Recommended', 'Browse', 'Diary'] as const;
type Tab = typeof TABS[number];

type LoggableMeal = (Meal | RecommendedMeal | CatalogMeal) & { score?: number };

export default function NutritionScreen() {
  const { calendar }        = useNutritionStore();
  const { recommendations } = useRecommendationsStore();
  const { user }            = useAuthStore();
  const { profile }         = useUserStore();

  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const [activeTab, setActiveTab]           = useState<Tab>('Recommended');
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [logModalMeal, setLogModalMeal]     = useState<LoggableMeal | null>(null);
  const [servings, setServings]             = useState('1');
  const [waterLogging, setWaterLogging]     = useState(false);
  const [waterMl, setWaterMl]              = useState('');
  const [waterTotalMl, setWaterTotalMl]    = useState(0);
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterType, setFilterType]         = useState<string | null>(null);
  const [filterTag, setFilterTag]           = useState<string | null>(null);
  const [diaryLog, setDiaryLog]             = useState<{ meal: LoggableMeal; servings: number; time: string }[]>([]);

  const liveRecs   = recommendations ?? (profile ? recommendMeals(profile) : null);
  const selectedDay = calendar?.days[selectedDayIndex] ?? null;

  // Always use exact calculated targets, not the cached recommender snapshot
  const targets     = profile ? calcDailyTargets(profile) : liveRecs?.dailyTargets;
  const waterGoalMl = calcWaterGoalMl(profile?.weightKg);

  // ── Browse filtering ────────────────────────────────────────────────────────
  const filteredCatalog = useMemo(() => {
    let results = MEAL_CATALOG;
    if (filterType) results = results.filter(m => m.type === filterType);
    if (filterTag)  results = results.filter(m => m.tags.includes(filterTag));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.tags.some(t => t.includes(q)) ||
        m.ingredients.some(i => i.name.toLowerCase().includes(q))
      );
    }
    return results;
  }, [filterType, filterTag, searchQuery]);

  // ── Macro totals ─────────────────────────────────────────────────────────
  const diaryTotals = useMemo(() => diaryLog.reduce(
    (a, e) => ({
      cal:  a.cal  + Math.round(e.meal.calories * e.servings),
      pro:  a.pro  + Math.round((e.meal as any).protein * e.servings),
      carb: a.carb + Math.round((e.meal as any).carbs   * e.servings),
      fat:  a.fat  + Math.round((e.meal as any).fat     * e.servings),
    }),
    { cal: 0, pro: 0, carb: 0, fat: 0 }
  ), [diaryLog]);

  async function handleLogMeal() {
    if (!logModalMeal) return;
    const s       = parseFloat(servings) || 1;
    const m       = logModalMeal as any;
    const snapshot = logModalMeal; // capture before any state mutation
    const time    = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    setLogModalMeal(null);
    setServings('1');
    setDiaryLog(prev => [...prev, { meal: snapshot, servings: s, time }]);
    setActiveTab('Diary'); // immediately show diary with new entry

    if (user?.uid) {
      logMeal(user.uid, {
        mealType: m.type, name: m.name,
        calories: Math.round(m.calories * s), proteinG: Math.round(m.protein * s),
        carbsG:   Math.round(m.carbs * s),   fatG: Math.round(m.fat * s), servings: s,
      }).catch(() => {}); // fire-and-forget; diary is already updated locally
    }
  }

  async function handleLogWater() {
    if (!user?.uid) return;
    const ml = parseInt(waterMl) || 250;
    await logWater(user.uid, ml);
    setWaterTotalMl(prev => prev + ml);
    setWaterMl('');
    setWaterLogging(false);
    Alert.alert('💧 Logged!', `${ml}ml added · ${waterTotalMl + ml}ml today`);
  }

  function openLog(meal: LoggableMeal) {
    setLogModalMeal(meal);
    setServings('1');
  }

  // ── Progress bar ───────────────────────────────────────────────────────────
  function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
    return (
      <View style={pb.track}>
        <View style={[pb.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Nutrition</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <TouchableOpacity style={styles.waterFab} onPress={() => setWaterLogging(true)}>
          <Ionicons name="water" size={16} color={Colors.accent} />
          <Text style={styles.waterFabText}>Log Water</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: RECOMMENDED
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'Recommended' && (
        <>
          {/* Day selector */}
          {calendar && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
              {calendar.days.map((_, i) => {
                const isToday = i === todayIndex;
                const isSel   = i === selectedDayIndex;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayPill, isSel && styles.dayPillActive, isToday && !isSel && styles.dayPillToday]}
                    onPress={() => setSelectedDayIndex(i)}
                  >
                    <Text style={[styles.dayNum, isSel && styles.dayTextActive]}>{i + 1}</Text>
                    <Text style={[styles.dayLbl, isSel && styles.dayTextActive]}>{DAY_LABELS[i]}</Text>
                    {isToday && <View style={[styles.todayDot, isSel && { backgroundColor: Colors.white }]} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Day macro bar */}
            {selectedDay && (
              <View style={styles.macroBar}>
                {[
                  { l: 'Calories', v: selectedDay.meals.reduce((a,m)=>a+m.calories,0), c: Colors.primary, u: 'kcal' },
                  { l: 'Protein',  v: selectedDay.meals.reduce((a,m)=>a+(m as any).protein,0), c: Colors.accent, u: 'g' },
                  { l: 'Carbs',    v: selectedDay.meals.reduce((a,m)=>a+(m as any).carbs,0),   c: Colors.bulk,   u: 'g' },
                  { l: 'Fat',      v: selectedDay.meals.reduce((a,m)=>a+(m as any).fat,0),     c: '#A78BFA',     u: 'g' },
                ].map(m => (
                  <View key={m.l} style={styles.macroChip}>
                    <Text style={[styles.macroVal, { color: m.c }]}>{m.v}</Text>
                    <Text style={styles.macroUnit}>{m.u}</Text>
                    <Text style={styles.macroLbl}>{m.l}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Meals */}
            {selectedDay ? (
              selectedDay.meals.map(meal => (
                <MealBlock key={meal.id} meal={meal as any} expanded={expandedMealId===meal.id}
                  onToggle={() => router.push(`/meal/${(meal as any).id}`)}
                  onLog={() => openLog(meal as any)} />
              ))
            ) : liveRecs ? (
              <>
                <View style={styles.recBanner}>
                  <Ionicons name="sparkles" size={14} color={Colors.primary} />
                  <Text style={styles.recBannerText}>Personalised picks matched to your goal & macros</Text>
                </View>
                {(['breakfast','lunch','dinner','snack'] as const).map(type => {
                  const meals = liveRecs[type].slice(0, 4);
                  if (!meals.length) return null;
                  return (
                    <View key={type}>
                      <View style={styles.typeHeaderRow}>
                        <Text style={styles.typeEmoji}>{MEAL_ICONS[type]}</Text>
                        <Text style={[styles.typeHeader, { color: MEAL_COLORS[type] }]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </View>
                      {meals.map(meal => (
                        <MealBlock key={meal.id} meal={meal as any} expanded={false}
                          onToggle={() => router.push(`/meal/${(meal as any).id}`)}
                          onLog={() => openLog(meal as any)} showScore accentColor={MEAL_COLORS[type]} />
                      ))}
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🍽️</Text>
                <Text style={styles.emptyTitle}>No plan yet</Text>
                <Text style={styles.emptyText}>Complete onboarding to get personalised meal recommendations.</Text>
              </View>
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: BROWSE
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'Browse' && (
        <View style={{ flex: 1 }}>
          {/* Search bar */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search meals, ingredients…"
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter rows — meal type */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Meal type</Text>
            <View style={styles.filterRow}>
              {(['all','breakfast','lunch','dinner','snack'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.filterChip,
                    t !== 'all' && filterType===t && { backgroundColor: MEAL_COLORS[t], borderColor: MEAL_COLORS[t] },
                    t === 'all' && !filterType && { backgroundColor: Colors.primary, borderColor: Colors.primary },
                  ]}
                  onPress={() => setFilterType(t === 'all' ? null : (filterType===t ? null : t))}
                >
                  <Text style={styles.filterEmoji}>
                    {t === 'all' ? '🍽️' : MEAL_ICONS[t]}
                  </Text>
                  <Text style={[
                    styles.filterChipText,
                    ((t !== 'all' && filterType===t) || (t === 'all' && !filterType)) && { color: Colors.white },
                  ]}>
                    {t === 'all' ? 'All' : t.charAt(0).toUpperCase()+t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Filter rows — tags */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Filter by</Text>
            <View style={styles.filterRow}>
              {['high-protein','low-carb','vegan','quick','meal-prep','gluten-free','dairy-free'].map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.filterChip, filterTag===tag && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
                  onPress={() => setFilterTag(filterTag===tag ? null : tag)}
                >
                  <Text style={[styles.filterChipText, filterTag===tag && { color: Colors.white }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Result count */}
          <Text style={styles.resultCount}>{filteredCatalog.length} meals</Text>

          <FlatList
            data={filteredCatalog}
            keyExtractor={m => m.id}
            contentContainerStyle={styles.browseScroll}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: meal }) => (
              <MealBlock meal={meal as any} expanded={expandedMealId===meal.id}
                onToggle={() => setExpandedMealId(expandedMealId===meal.id ? null : meal.id)}
                onLog={() => openLog(meal as any)}
                accentColor={MEAL_COLORS[meal.type]} />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>No results</Text>
                <Text style={styles.emptyText}>Try a different search or clear the filters.</Text>
              </View>
            }
          />
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: DIARY
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'Diary' && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Daily progress */}
          {targets && (
            <View style={styles.diaryProgressCard}>
              <Text style={styles.diaryProgressTitle}>Today's Progress</Text>
              {[
                { l: 'Calories', v: diaryTotals.cal,  t: targets.calories,  c: Colors.primary,  u: 'kcal' },
                { l: 'Protein',  v: diaryTotals.pro,  t: targets.proteinG,  c: Colors.accent,   u: 'g' },
                { l: 'Carbs',    v: diaryTotals.carb, t: targets.carbsG,    c: Colors.bulk,     u: 'g' },
                { l: 'Fat',      v: diaryTotals.fat,  t: targets.fatG,      c: '#A78BFA',       u: 'g' },
              ].map(m => (
                <View key={m.l} style={styles.progressRow}>
                  <View style={styles.progressLabelRow}>
                    <Text style={[styles.progressLabel, { color: m.c }]}>{m.l}</Text>
                    <Text style={styles.progressValues}>
                      <Text style={{ color: m.c, fontWeight: FontWeight.bold }}>{m.v}</Text>
                      <Text style={styles.progressOf}> / {m.t} {m.u}</Text>
                    </Text>
                  </View>
                  <ProgressBar value={m.v} max={m.t} color={m.c} />
                </View>
              ))}

              {/* Water goal row */}
              <View style={[styles.progressRow, styles.waterRow]}>
                <View style={styles.progressLabelRow}>
                  <View style={styles.waterLabelRow}>
                    <Ionicons name="water" size={14} color={Colors.accent} />
                    <Text style={[styles.progressLabel, { color: Colors.accent }]}>Water</Text>
                  </View>
                  <View style={styles.waterRightRow}>
                    <Text style={styles.progressValues}>
                      <Text style={{ color: Colors.accent, fontWeight: FontWeight.bold }}>
                        {waterTotalMl >= 1000
                          ? `${(waterTotalMl / 1000).toFixed(1)}L`
                          : `${waterTotalMl}ml`}
                      </Text>
                      <Text style={styles.progressOf}>
                        {' '}/ {waterGoalMl >= 1000
                          ? `${(waterGoalMl / 1000).toFixed(1)}L`
                          : `${waterGoalMl}ml`}
                      </Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.waterAddBtn}
                      onPress={() => setWaterLogging(true)}
                    >
                      <Ionicons name="add" size={12} color={Colors.accent} />
                      <Text style={styles.waterAddText}>Log</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <ProgressBar value={waterTotalMl} max={waterGoalMl} color={Colors.accent} />
              </View>
            </View>
          )}

          {/* Logged meals */}
          {diaryLog.length > 0 ? (
            <>
              <Text style={styles.diarySectionTitle}>Logged Today</Text>
              {diaryLog.map((entry, i) => {
                const m = entry.meal as any;
                return (
                  <View key={i} style={styles.diaryEntry}>
                    <View style={[styles.diaryTypeIcon, { backgroundColor: `${MEAL_COLORS[m.type]}22` }]}>
                      <Text style={{ fontSize: 18 }}>{MEAL_ICONS[m.type]}</Text>
                    </View>
                    <View style={styles.diaryEntryBody}>
                      <Text style={styles.diaryEntryName}>{m.name}</Text>
                      <Text style={styles.diaryEntryMeta}>
                        {entry.servings}× serving · {entry.time}
                      </Text>
                    </View>
                    <View style={styles.diaryEntryMacros}>
                      <Text style={[styles.diaryEntryCal, { color: Colors.primary }]}>
                        {Math.round(m.calories * entry.servings)} kcal
                      </Text>
                      <Text style={styles.diaryEntryPro}>
                        P {Math.round(m.protein * entry.servings)}g
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>Diary is empty</Text>
              <Text style={styles.emptyText}>
                Log meals from the Recommended or Browse tabs to track your daily intake.
              </Text>
            </View>
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* ── Water Modal ─────────────────────────────────────────────────────── */}
      <Modal visible={waterLogging} transparent animationType="fade" onRequestClose={() => setWaterLogging(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>💧 Log Water</Text>
            <Text style={styles.sheetSub}>How much did you drink?</Text>
            <View style={styles.presetRow}>
              {['150','250','330','500'].map(v => (
                <TouchableOpacity key={v}
                  style={[styles.preset, waterMl===v && styles.presetActive]}
                  onPress={() => setWaterMl(v)}>
                  <Text style={[styles.presetText, waterMl===v && { color: Colors.white }]}>{v}ml</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.sheetInput} value={waterMl} onChangeText={setWaterMl}
              keyboardType="numeric" placeholder="Custom amount (ml)" placeholderTextColor={Colors.textMuted} />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setWaterLogging(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleLogWater}>
                <Text style={styles.confirmText}>Log it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Log Meal Modal ──────────────────────────────────────────────────── */}
      <Modal visible={!!logModalMeal} transparent animationType="slide" onRequestClose={() => setLogModalMeal(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: 48 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Log Meal</Text>
            <Text style={styles.sheetSub}>{(logModalMeal as any)?.name}</Text>

            {/* Live macro preview */}
            <View style={styles.macroPreviewRow}>
              {logModalMeal && [
                { l:'Cal',  v: Math.round((logModalMeal as any).calories*(parseFloat(servings)||1)), c: Colors.primary },
                { l:'Pro',  v: Math.round((logModalMeal as any).protein *(parseFloat(servings)||1)), c: Colors.accent },
                { l:'Carb', v: Math.round((logModalMeal as any).carbs   *(parseFloat(servings)||1)), c: Colors.bulk },
                { l:'Fat',  v: Math.round((logModalMeal as any).fat     *(parseFloat(servings)||1)), c: '#A78BFA' },
              ].map(m => (
                <View key={m.l} style={[styles.macroPreviewChip, { borderTopColor: m.c, borderTopWidth: 2 }]}>
                  <Text style={[styles.macroPreviewVal, { color: m.c }]}>{m.v}</Text>
                  <Text style={styles.macroPreviewLbl}>{m.l}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Servings</Text>
            <View style={styles.presetRow}>
              {['0.5','1','1.5','2'].map(v => (
                <TouchableOpacity key={v}
                  style={[styles.preset, servings===v && styles.presetActive]}
                  onPress={() => setServings(v)}>
                  <Text style={[styles.presetText, servings===v && { color: Colors.white }]}>{v}×</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.sheetInput} value={servings} onChangeText={setServings}
              keyboardType="decimal-pad" placeholder="Custom servings"
              placeholderTextColor={Colors.textMuted} />

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setLogModalMeal(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleLogMeal}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.white} />
                <Text style={styles.confirmText}>Log it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Meal Block Component ─────────────────────────────────────────────────────

function MealBlock({
  meal, expanded, onToggle, onLog, showScore, accentColor,
}: {
  meal: (Meal | RecommendedMeal | CatalogMeal) & { score?: number };
  expanded: boolean;
  onToggle: () => void;
  onLog: () => void;
  showScore?: boolean;
  accentColor?: string;
}) {
  const m   = meal as any;
  const col = accentColor ?? MEAL_COLORS[m.type] ?? Colors.primary;

  return (
    <View style={[mb.card, expanded && { borderColor: col }]}>
      {/* Left accent bar */}
      <View style={[mb.accentBar, { backgroundColor: col }]} />

      <TouchableOpacity style={mb.header} onPress={onToggle} activeOpacity={0.8}>
        <View style={mb.headerLeft}>
          <View style={mb.topRow}>
            <Text style={mb.typeEmoji}>{MEAL_ICONS[m.type] ?? '🍽️'}</Text>
            <Text style={[mb.typeLabel, { color: col }]}>{m.type.toUpperCase()}</Text>
            {showScore && m.score !== undefined && (
              <View style={[mb.scoreBadge, { backgroundColor: `${col}22` }]}>
                <Text style={[mb.scoreText, { color: col }]}>★ {(m.score*100).toFixed(0)}%</Text>
              </View>
            )}
          </View>
          <Text style={mb.name}>{m.name}</Text>
          <View style={mb.pills}>
            <Pill label={`🔥 ${m.calories}`} color={Colors.primary} />
            <Pill label={`💪 ${m.protein}g`} color={Colors.accent} />
            <Pill label={`⚡ ${m.carbs}g`}   color={Colors.bulk} />
            <Pill label={`🥑 ${m.fat}g`}     color="#A78BFA" />
          </View>
        </View>
        <View style={mb.headerRight}>
          <View style={mb.timeBadge}>
            <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
            <Text style={mb.timeText}>{m.prepTimeMinutes}m</Text>
          </View>
          {/* Quick-log button always visible on the card */}
          <TouchableOpacity
            style={[mb.quickLogBtn, { backgroundColor: col }]}
            onPress={(e) => { e.stopPropagation?.(); onLog(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={mb.quickLogText}>Log</Text>
          </TouchableOpacity>
          <Ionicons
            name={expanded ? 'chevron-up-circle' : 'chevron-down-circle'}
            size={22} color={expanded ? col : Colors.border} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={mb.body}>
          {m.description ? <Text style={mb.desc}>{m.description}</Text> : null}

          {/* Tags */}
          {m.tags?.length > 0 && (
            <View style={mb.tagRow}>
              {m.tags.map((tag: string) => (
                <View key={tag} style={mb.tag}>
                  <Text style={mb.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {m.ingredients?.length > 0 && (
            <>
              <Text style={mb.subTitle}>🛒 Ingredients</Text>
              <View style={mb.ingredientList}>
                {m.ingredients.map((ing: any, i: number) => (
                  <View key={i} style={mb.ingredientRow}>
                    <View style={[mb.dot, { backgroundColor: col }]} />
                    <Text style={mb.ingredient}>{ing.name}</Text>
                    <Text style={mb.amount}>{ing.amount}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {m.instructions?.length > 0 && (
            <>
              <Text style={mb.subTitle}>👨‍🍳 Method</Text>
              {m.instructions.map((step: string, i: number) => (
                <View key={i} style={mb.stepRow}>
                  <View style={[mb.stepNum, { backgroundColor: `${col}22` }]}>
                    <Text style={[mb.stepNumText, { color: col }]}>{i + 1}</Text>
                  </View>
                  <Text style={mb.step}>{step}</Text>
                </View>
              ))}
            </>
          )}

          <TouchableOpacity style={[mb.logBtn, { backgroundColor: col }]} onPress={onLog}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
            <Text style={mb.logBtnText}>I ate this</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[mb.pill, { backgroundColor: `${color}18` }]}>
      <Text style={[mb.pillText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: Colors.background },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title:           { fontSize: FontSize.xxl, fontWeight: FontWeight.black, color: Colors.textPrimary },
  subtitle:        { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  waterFab:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${Colors.accent}15`, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: `${Colors.accent}44` },
  waterFabText:    { fontSize: FontSize.sm, color: Colors.accent, fontWeight: FontWeight.semibold },

  // Tabs
  tabBar:          { flexDirection: 'row', marginHorizontal: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 3, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  tabItem:         { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.md },
  tabItemActive:   { backgroundColor: Colors.primary },
  tabText:         { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.semibold },
  tabTextActive:   { color: Colors.white, fontWeight: FontWeight.bold },

  // Day strip
  dayStrip:        { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, gap: Spacing.sm },
  dayPill:         { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, minWidth: 50 },
  dayPillActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayPillToday:    { borderColor: Colors.primary },
  dayNum:          { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textMuted },
  dayLbl:          { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  dayTextActive:   { color: Colors.white },
  todayDot:        { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: 2 },

  scroll:          { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm },
  browseScroll:    { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: 200 },

  // Macro bar
  macroBar:        { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, overflow: 'hidden' },
  macroChip:       { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 2 },
  macroVal:        { fontSize: FontSize.lg, fontWeight: FontWeight.black },
  macroUnit:       { fontSize: 9, color: Colors.textMuted },
  macroLbl:        { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Rec banner
  recBanner:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: `${Colors.primary}10`, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: `${Colors.primary}25` },
  recBannerText:   { flex: 1, fontSize: FontSize.sm, color: Colors.primary },
  typeHeaderRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  typeEmoji:       { fontSize: 20 },
  typeHeader:      { fontSize: FontSize.md, fontWeight: FontWeight.black, textTransform: 'uppercase', letterSpacing: 0.8 },

  // Browse
  searchRow:       { paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
  searchBox:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  searchInput:     { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm },
  filterSection:   { paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
  filterLabel:     { fontSize: 10, fontWeight: FontWeight.black, color: Colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  filterRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterEmoji:     { fontSize: 13 },
  filterChipText:  { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  resultCount:     { fontSize: FontSize.xs, color: Colors.textMuted, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },

  // Diary
  diaryProgressCard:  { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, marginBottom: Spacing.lg },
  diaryProgressTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  progressRow:        { marginBottom: Spacing.md },
  progressLabelRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressLabel:      { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  progressValues:     { fontSize: FontSize.sm },
  progressOf:         { color: Colors.textMuted, fontWeight: FontWeight.regular },
  waterRow:           { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, marginTop: Spacing.xs },
  waterLabelRow:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  waterRightRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  waterAddBtn:        { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${Colors.accent}15`, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: `${Colors.accent}44` },
  waterAddText:       { fontSize: 10, color: Colors.accent, fontWeight: FontWeight.semibold },
  diarySectionTitle:  { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  diaryEntry:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  diaryTypeIcon:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  diaryEntryBody:     { flex: 1 },
  diaryEntryName:     { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  diaryEntryMeta:     { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  diaryEntryMacros:   { alignItems: 'flex-end' },
  diaryEntryCal:      { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  diaryEntryPro:      { fontSize: FontSize.xs, color: Colors.textMuted },

  // Empty
  empty:           { alignItems: 'center', marginTop: 60, gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyEmoji:      { fontSize: 52 },
  emptyTitle:      { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  emptyText:       { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  // Modals
  overlay:         { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet:           { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl },
  sheetHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.lg },
  sheetTitle:      { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.textPrimary, marginBottom: 4 },
  sheetSub:        { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.lg },
  presetRow:       { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  preset:          { flex: 1, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surfaceElevated },
  presetActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  presetText:      { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  sheetInput:      { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.md, marginTop: Spacing.sm, marginBottom: Spacing.lg },
  sheetActions:    { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn:       { flex: 1, paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText:      { color: Colors.textSecondary, fontWeight: FontWeight.medium },
  confirmBtn:      { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: Radius.lg, backgroundColor: Colors.primary },
  confirmText:     { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  fieldLabel:      { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  macroPreviewRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  macroPreviewChip:{ flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', gap: 2 },
  macroPreviewVal: { fontSize: FontSize.lg, fontWeight: FontWeight.black },
  macroPreviewLbl: { fontSize: 10, color: Colors.textMuted },
});

const pb = StyleSheet.create({
  track: { height: 6, backgroundColor: Colors.surfaceElevated, borderRadius: 3, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 3 },
});

const mb = StyleSheet.create({
  card:         { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, overflow: 'hidden' },
  accentBar:    { width: 4, position: 'absolute', top: 0, bottom: 0, left: 0 },
  header:       { flexDirection: 'row', padding: Spacing.md, paddingLeft: Spacing.md + 4 + 8 },
  headerLeft:   { flex: 1 },
  headerRight:  { alignItems: 'flex-end', gap: 8, paddingTop: 2 },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  typeEmoji:    { fontSize: 13 },
  typeLabel:    { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  scoreBadge:   { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  scoreText:    { fontSize: 10, fontWeight: FontWeight.bold },
  name:         { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 8, lineHeight: 20 },
  pills:        { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pill:         { paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full },
  pillText:     { fontSize: 10, fontWeight: FontWeight.semibold },
  timeBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3 },
  timeText:     { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.medium },
  quickLogBtn:  { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  quickLogText: { fontSize: 11, color: '#fff', fontWeight: FontWeight.bold },
  body:         { borderTopWidth: 1, borderTopColor: Colors.border, padding: Spacing.md, paddingLeft: Spacing.md + 4 + 8, gap: Spacing.sm },
  desc:         { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  tagRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  tagText:      { fontSize: 10, color: Colors.textMuted },
  subTitle:     { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: Spacing.sm },
  ingredientList:{ gap: 6 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot:          { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  ingredient:   { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  amount:       { fontSize: FontSize.sm, color: Colors.textMuted },
  stepRow:      { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  stepNum:      { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepNumText:  { fontSize: 11, fontWeight: FontWeight.black },
  step:         { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  logBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingVertical: 12, marginTop: Spacing.sm },
  logBtnText:   { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.md },
});
