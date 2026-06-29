import { useLocalSearchParams, router } from 'expo-router';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, Vibration, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { GOAL_META } from '../../constants/goalMeta';
import { startWorkoutSession, endWorkoutSession } from '../../services/supabase/database';
import type { WorkoutDay, Exercise } from '../../types';

const { width } = Dimensions.get('window');

// ── Muscle → colour ────────────────────────────────────────────────────────────
const MUSCLE_COLORS: Record<string, string> = {
  chest: '#FF6B35', back: '#00E5FF', shoulders: '#FFB800', legs: '#7C4DFF',
  arms: '#00C853', core: '#FF4D4D', biceps: '#00C853', triceps: '#FF6B35',
  glutes: '#FFB800', hamstrings: '#7C4DFF', quads: '#FF4D4D', calves: '#00E5FF',
  'upper back': '#00E5FF', 'lower back': '#00B0CC', abs: '#FF4D4D',
  'hip flexors': '#A78BFA', forearms: '#FFB800',
};
function muscleCol(m: string) { return MUSCLE_COLORS[m.toLowerCase()] ?? Colors.primary; }

// ── Exercise name → illustrative emoji ────────────────────────────────────────
const EX_EMOJI_MAP: [RegExp, string][] = [
  [/bench|chest press|push.?up|fly/i,          '🏋️'],
  [/squat|leg press|lunge|leg extension/i,      '🦵'],
  [/deadlift|romanian|rdl|hip hinge/i,          '🏗️'],
  [/pull.?up|chin.?up|lat pulldown/i,           '🤸'],
  [/row|cable row|seated row/i,                 '🚣'],
  [/shoulder press|overhead press|ohp/i,        '💪'],
  [/curl|bicep/i,                               '💪'],
  [/tricep|dip|pushdown|skull/i,                '🔱'],
  [/plank|ab|core|crunch|sit.?up/i,             '🧘'],
  [/run|sprint|jog|treadmill|cardio/i,          '🏃'],
  [/bike|cycle|cycling/i,                       '🚴'],
  [/jump|box jump|burpee|hiit/i,                '⚡'],
  [/calf|calf raise/i,                          '🦶'],
  [/face pull|rear delt/i,                      '🎯'],
  [/lateral raise|side raise/i,                 '🦅'],
  [/hip thrust|glute bridge/i,                  '🍑'],
  [/leg curl|hamstring/i,                       '🦵'],
  [/shrug|trap/i,                               '🗻'],
  [/stretch|mobility|warm|cool/i,               '🧘'],
  [/farmer|carry/i,                             '🧺'],
];
function exEmoji(name: string): string {
  for (const [re, e] of EX_EMOJI_MAP) if (re.test(name)) return e;
  return '🏋️';
}

// ── Muscle group → body area emoji ────────────────────────────────────────────
const MUSCLE_EMOJI: Record<string, string> = {
  chest: '🫁', back: '🔙', 'upper back': '🔙', 'lower back': '🔙',
  shoulders: '🦴', legs: '🦵', quads: '🦵', hamstrings: '🦵', calves: '🦶',
  glutes: '🍑', arms: '💪', biceps: '💪', triceps: '💪', forearms: '🤜',
  core: '🧘', abs: '🧘', 'hip flexors': '🦴',
};
function muscleEmoji(m: string) { return MUSCLE_EMOJI[m.toLowerCase()] ?? '🏋️'; }

// ── Rep range → intensity label ────────────────────────────────────────────────
function intensityFromReps(reps: string | number): { label: string; color: string; emoji: string } {
  const n = parseInt(String(reps));
  if (n <= 5)  return { label: 'Strength',    color: '#FF4D4D', emoji: '⚡' };
  if (n <= 10) return { label: 'Hypertrophy', color: '#FF6B35', emoji: '💪' };
  if (n <= 15) return { label: 'Endurance',   color: '#FFB800', emoji: '🏃' };
  return         { label: 'Conditioning',  color: '#00C853', emoji: '🔥' };
}

interface LoggedSet {
  exerciseId: string; exerciseName: string;
  setNumber: number; repsCompleted: string; weightKg: string;
}
function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function WorkoutDetailScreen() {
  const { dayIndex } = useLocalSearchParams<{ dayIndex: string }>();
  const { plan }     = useWorkoutStore();
  const { profile }  = useUserStore();
  const { user }     = useAuthStore();

  const idx  = parseInt(dayIndex ?? '0');
  const day  = plan?.days[idx] ?? null;
  const goalMeta = GOAL_META[profile?.goal ?? 'maintain'];
  const col  = goalMeta.color;

  // ── Active session state ────────────────────────────────────────────────────
  const [activeSession, setActiveSession] = useState<{ day: WorkoutDay; sessionId: string } | null>(null);
  const [loggedSets, setLoggedSets]       = useState<LoggedSet[]>([]);
  const [setInputs, setSetInputs]         = useState<Record<string, { weight: string }>>({});
  const [sessionSecs, setSessionSecs]     = useState(0);
  const [restSecs, setRestSecs]           = useState(0);
  const [restTarget, setRestTarget]       = useState(0);
  const [restActive, setRestActive]       = useState(false);
  const sessionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimer    = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeSession) {
      sessionTimer.current = setInterval(() => setSessionSecs(s => s + 1), 1000);
    } else {
      if (sessionTimer.current) clearInterval(sessionTimer.current);
      setSessionSecs(0);
    }
    return () => { if (sessionTimer.current) clearInterval(sessionTimer.current); };
  }, [!!activeSession]);

  const startRest = useCallback((seconds: number) => {
    if (restTimer.current) clearInterval(restTimer.current);
    setRestTarget(seconds); setRestSecs(seconds); setRestActive(true);
    restTimer.current = setInterval(() => {
      setRestSecs(prev => {
        if (prev <= 1) {
          clearInterval(restTimer.current!);
          setRestActive(false);
          Vibration.vibrate([0, 200, 100, 200]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  function skipRest() {
    if (restTimer.current) clearInterval(restTimer.current);
    setRestActive(false); setRestSecs(0);
  }

  async function handleStart() {
    if (!user?.uid || !day) return;
    const sessionId = await startWorkoutSession(user.uid, day.dayLabel);
    setActiveSession({ day, sessionId });
    setLoggedSets([]); setSetInputs({});
  }

  function logSet(exercise: Exercise, setNumber: number) {
    const key   = `${exercise.id}-${setNumber}`;
    const input = setInputs[key] ?? { weight: '' };
    setLoggedSets(prev => {
      const entry: LoggedSet = {
        exerciseId: exercise.id, exerciseName: exercise.name,
        setNumber, repsCompleted: String(exercise.reps), weightKg: input.weight,
      };
      const idx = prev.findIndex(s => s.exerciseId === exercise.id && s.setNumber === setNumber);
      if (idx >= 0) { const n = [...prev]; n[idx] = entry; return n; }
      return [...prev, entry];
    });
    startRest(exercise.restSeconds);
  }

  function isLogged(exId: string, setNum: number) {
    return loggedSets.some(s => s.exerciseId === exId && s.setNumber === setNum);
  }

  async function handleFinish() {
    if (!user?.uid || !activeSession) return;
    if (restTimer.current) clearInterval(restTimer.current);
    await endWorkoutSession(user.uid, activeSession.sessionId, loggedSets);
    setActiveSession(null); setRestActive(false);
    Alert.alert('🎉 Workout Complete!', `${loggedSets.length} sets logged · ${fmtTime(sessionSecs)}`);
  }

  const totalSets = activeSession?.day.exercises.reduce((a, e) => a + e.sets, 0) ?? 0;
  const doneSets  = loggedSets.length;
  const pct       = totalSets ? (doneSets / totalSets) * 100 : 0;
  const restPct   = restTarget > 0 ? ((restTarget - restSecs) / restTarget) * 100 : 0;

  if (!day) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.notFound}>
          <Text style={{ fontSize: 48 }}>🏋️</Text>
          <Text style={s.notFoundTxt}>Workout not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const uniqueMuscles = Array.from(new Set(day.exercises.flatMap(e => e.muscleGroups)));
  const totalVolume   = day.exercises.reduce((a, e) => a + e.sets * parseInt(String(e.reps)), 0);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <View style={[s.hero, { backgroundColor: `${col}18` }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          {/* Big emoji illustration */}
          <View style={[s.heroPlate, { borderColor: `${col}55`, shadowColor: col }]}>
            <Text style={s.heroEmoji}>
              {day.focus.match(/chest|push/i)   ? '🏋️'
               : day.focus.match(/back|pull/i)  ? '🚣'
               : day.focus.match(/leg|squat/i)  ? '🦵'
               : day.focus.match(/cardio|hiit/i)? '🏃'
               : day.focus.match(/core|abs/i)   ? '🧘'
               : '💪'}
            </Text>
          </View>

          <View style={[s.goalBadge, { backgroundColor: col }]}>
            <Text style={s.goalEmoji}>{goalMeta.emoji}</Text>
            <Text style={s.goalTxt}>{goalMeta.label.toUpperCase()}</Text>
          </View>

          <Text style={s.heroDay}>{day.dayLabel}</Text>
          <Text style={s.heroFocus}>{day.focus}</Text>

          {/* Meta pills */}
          <View style={s.metaRow}>
            <View style={s.metaPill}>
              <Text style={s.metaEmoji}>⏱️</Text>
              <Text style={s.metaTxt}>{day.durationMinutes} min</Text>
            </View>
            <View style={s.metaPill}>
              <Text style={s.metaEmoji}>🎯</Text>
              <Text style={s.metaTxt}>{day.exercises.length} exercises</Text>
            </View>
            <View style={s.metaPill}>
              <Text style={s.metaEmoji}>📊</Text>
              <Text style={s.metaTxt}>~{totalVolume} total reps</Text>
            </View>
          </View>
        </View>

        {/* ── Muscles targeted visual strip ─────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Muscles Targeted</Text>
          <View style={s.muscleGrid}>
            {uniqueMuscles.map(m => (
              <View key={m} style={[s.muscleCard, { borderTopColor: muscleCol(m), borderTopWidth: 3 }]}>
                <View style={[s.muscleIconWrap, { backgroundColor: `${muscleCol(m)}18` }]}>
                  <Text style={s.muscleIcon}>{muscleEmoji(m)}</Text>
                </View>
                <Text style={[s.muscleName, { color: muscleCol(m) }]}>{m}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Exercise cards ─────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Exercises</Text>
          {day.exercises.map((ex, i) => {
            const intensity = intensityFromReps(ex.reps);
            const isLast    = i === day.exercises.length - 1;
            return (
              <View key={ex.id} style={s.exWrap}>
                {/* Connector line */}
                {!isLast && <View style={[s.exLine, { backgroundColor: `${col}33` }]} />}

                <View style={[s.exCard, { borderLeftColor: col, borderLeftWidth: 3 }]}>
                  {/* Top row: number + emoji + intensity */}
                  <View style={s.exTop}>
                    <View style={[s.exNumBadge, { backgroundColor: col }]}>
                      <Text style={s.exNumText}>{i + 1}</Text>
                    </View>
                    <View style={[s.exIconWrap, { backgroundColor: `${col}15` }]}>
                      <Text style={s.exIcon}>{exEmoji(ex.name)}</Text>
                    </View>
                    <View style={[s.intensityBadge, { backgroundColor: `${intensity.color}18`, borderColor: `${intensity.color}44` }]}>
                      <Text style={s.intensityEmoji}>{intensity.emoji}</Text>
                      <Text style={[s.intensityLabel, { color: intensity.color }]}>{intensity.label}</Text>
                    </View>
                  </View>

                  {/* Exercise name */}
                  <Text style={s.exName}>{ex.name}</Text>

                  {/* Sets × Reps × Rest visual grid */}
                  <View style={s.statsGrid}>
                    <View style={[s.statBox, { borderColor: Colors.primary }]}>
                      <Text style={[s.statNum, { color: Colors.primary }]}>{ex.sets}</Text>
                      <Text style={s.statLbl}>SETS</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={[s.statBox, { borderColor: Colors.accent }]}>
                      <Text style={[s.statNum, { color: Colors.accent }]}>{ex.reps}</Text>
                      <Text style={s.statLbl}>REPS</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={[s.statBox, { borderColor: Colors.bulk }]}>
                      <Text style={[s.statNum, { color: Colors.bulk }]}>{ex.restSeconds}s</Text>
                      <Text style={s.statLbl}>REST</Text>
                    </View>
                  </View>

                  {/* Muscle group chips */}
                  <View style={s.exMuscleRow}>
                    {ex.muscleGroups.map(m => (
                      <View key={m} style={[s.exMuscleChip, { backgroundColor: `${muscleCol(m)}18` }]}>
                        <Text style={s.exMuscleEmoji}>{muscleEmoji(m)}</Text>
                        <Text style={[s.exMuscleTxt, { color: muscleCol(m) }]}>{m}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Form tip */}
                  {ex.notes ? (
                    <View style={s.formTip}>
                      <Ionicons name="bulb-outline" size={14} color={Colors.accent} />
                      <Text style={s.formTipTxt}>{ex.notes}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}

          {/* Ready card */}
          <View style={[s.readyCard, { backgroundColor: `${col}18`, borderColor: `${col}44` }]}>
            <Text style={s.readyEmoji}>💪</Text>
            <Text style={[s.readyTxt, { color: col }]}>Ready to crush it?</Text>
          </View>
        </View>

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* ── Sticky Start button ────────────────────────────────────────────────── */}
      <View style={s.stickyBar}>
        <TouchableOpacity style={[s.startBtn, { backgroundColor: col }]} onPress={handleStart}>
          <Ionicons name="play-circle" size={22} color="#fff" />
          <Text style={s.startBtnTxt}>Start Workout</Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════════════════════════════════════
          ACTIVE SESSION MODAL
      ══════════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!activeSession}
        animationType="slide"
        onRequestClose={() =>
          Alert.alert('End workout?', 'Your progress will be saved.', [
            { text: 'Keep going', style: 'cancel' },
            { text: 'Finish', onPress: handleFinish },
          ])
        }
      >
        <SafeAreaView style={s.sessionScreen} edges={['top', 'bottom']}>

          {/* Session header */}
          <View style={s.sessionHeader}>
            <View>
              <Text style={s.sessionDay}>{activeSession?.day.dayLabel}</Text>
              <Text style={s.sessionFocus}>{activeSession?.day.focus}</Text>
            </View>
            <View style={s.sessionRight}>
              <View style={s.timerBadge}>
                <Ionicons name="timer-outline" size={14} color={Colors.primary} />
                <Text style={s.timerTxt}>{fmtTime(sessionSecs)}</Text>
              </View>
              <TouchableOpacity style={s.finishBtn} onPress={handleFinish}>
                <Text style={s.finishTxt}>Finish</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress bar */}
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={s.progressLbl}>{doneSets} / {totalSets} sets complete</Text>

          {/* Rest timer */}
          {restActive && (
            <View style={s.restBanner}>
              <View style={s.restLeft}>
                <Text style={s.restLabel}>REST</Text>
                <Text style={s.restTime}>{fmtTime(restSecs)}</Text>
              </View>
              <View style={s.restBarTrack}>
                <View style={[s.restBarFill, { width: `${restPct}%` }]} />
              </View>
              <TouchableOpacity style={s.skipBtn} onPress={skipRest}>
                <Text style={s.skipTxt}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView contentContainerStyle={s.sessionScroll}>
            {activeSession?.day.exercises.map((ex, exIdx) => {
              const allDone = Array.from({ length: ex.sets }, (_, i) => i + 1).every(n => isLogged(ex.id, n));
              return (
                <View key={ex.id} style={[s.sessionExCard, allDone && s.sessionExDone]}>
                  <View style={s.sessionExHeader}>
                    <View style={[s.sessionExNum, allDone && { backgroundColor: Colors.success }]}>
                      {allDone
                        ? <Ionicons name="checkmark" size={14} color={Colors.white} />
                        : <Text style={s.sessionExNumTxt}>{exIdx + 1}</Text>
                      }
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sessionExName}>{ex.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        <ExBadge label={`${ex.sets} × ${ex.reps}`} color={Colors.primary} />
                        <ExBadge label={`${ex.restSeconds}s rest`}  color={Colors.accent}  />
                      </View>
                    </View>
                    <Text style={s.sessionExEmoji}>{exEmoji(ex.name)}</Text>
                  </View>

                  {ex.notes && (
                    <View style={s.formNote}>
                      <Ionicons name="bulb-outline" size={14} color={Colors.accent} />
                      <Text style={s.formNoteTxt}>{ex.notes}</Text>
                    </View>
                  )}

                  <View style={s.setHeader}>
                    <Text style={[s.setHeaderTxt, { width: 36 }]}>SET</Text>
                    <Text style={[s.setHeaderTxt, { width: 60 }]}>REPS</Text>
                    <Text style={[s.setHeaderTxt, { flex: 1 }]}>WEIGHT (kg)</Text>
                    <Text style={[s.setHeaderTxt, { width: 44 }]}>DONE</Text>
                  </View>

                  {Array.from({ length: ex.sets }, (_, i) => {
                    const setNum = i + 1;
                    const key    = `${ex.id}-${setNum}`;
                    const done   = isLogged(ex.id, setNum);
                    return (
                      <View key={setNum} style={[s.setRow, done && s.setRowDone]}>
                        <View style={[s.setNumBubble, done && { backgroundColor: Colors.success }]}>
                          <Text style={[s.setNumTxt, done && { color: '#fff' }]}>{setNum}</Text>
                        </View>
                        {/* Reps shown as static target — not editable */}
                        <View style={[s.repsDisplay, done && { borderColor: `${Colors.success}44` }]}>
                          <Text style={[s.repsText, done && { color: Colors.success }]}>
                            {String(ex.reps).replace(/\D.*/, '')}
                          </Text>
                        </View>
                        <TextInput
                          style={[s.setInput, done && s.setInputDone]}
                          placeholder="0"
                          placeholderTextColor={Colors.textMuted}
                          keyboardType="decimal-pad"
                          value={setInputs[key]?.weight ?? ''}
                          onChangeText={v => setSetInputs(p => ({ ...p, [key]: { weight: v } }))}
                          editable={!done}
                        />
                        <TouchableOpacity style={s.checkBtn} onPress={() => logSet(ex, setNum)} disabled={done}>
                          <Ionicons
                            name={done ? 'checkmark-circle' : 'checkmark-circle-outline'}
                            size={32} color={done ? Colors.success : Colors.border}
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              );
            })}
            <View style={{ height: 60 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function ExBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[xb.badge, { backgroundColor: `${color}18` }]}>
      <Text style={[xb.txt, { color }]}>{label}</Text>
    </View>
  );
}
const xb = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  txt:   { fontSize: 10, fontWeight: FontWeight.bold },
});

const CARD_W = (width - Spacing.xl * 2 - Spacing.sm * 3) / 4;

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: Colors.background },
  scroll:       { paddingBottom: 20 },
  backBtn:      { padding: Spacing.md },
  notFound:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  notFoundTxt:  { color: Colors.textMuted, fontSize: FontSize.md },

  // Hero
  hero:         { paddingBottom: Spacing.xl, paddingHorizontal: Spacing.xl },
  heroPlate:    {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', borderWidth: 3, marginBottom: Spacing.md,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 12,
  },
  heroEmoji:    { fontSize: 72 },
  goalBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 5, marginBottom: Spacing.sm },
  goalEmoji:    { fontSize: 13 },
  goalTxt:      { fontSize: 11, color: '#fff', fontWeight: FontWeight.black, letterSpacing: 1 },
  heroDay:      { fontSize: 26, fontWeight: FontWeight.black, color: Colors.textPrimary, textAlign: 'center', lineHeight: 32, marginBottom: 4 },
  heroFocus:    { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md },
  metaRow:      { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  metaPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  metaEmoji:    { fontSize: 13 },
  metaTxt:      { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.semibold },

  // Section
  section:      { marginTop: Spacing.xl, paddingHorizontal: Spacing.xl },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.textPrimary, marginBottom: Spacing.md },

  // Muscle grid
  muscleGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  muscleCard:   { width: CARD_W, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', padding: Spacing.sm, gap: 6 },
  muscleIconWrap:{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  muscleIcon:   { fontSize: 22 },
  muscleName:   { fontSize: 10, fontWeight: FontWeight.bold, textTransform: 'capitalize', textAlign: 'center' },

  // Exercise cards
  exWrap:       { position: 'relative', marginBottom: Spacing.sm },
  exLine:       { position: 'absolute', left: 16, top: 72, bottom: -Spacing.sm, width: 2 },
  exCard:       { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm },
  exTop:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  exNumBadge:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  exNumText:    { fontSize: FontSize.sm, fontWeight: FontWeight.black, color: '#fff' },
  exIconWrap:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  exIcon:       { fontSize: 24 },
  intensityBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, marginLeft: 'auto' },
  intensityEmoji:{ fontSize: 12 },
  intensityLabel:{ fontSize: 10, fontWeight: FontWeight.bold },
  exName:       { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.textPrimary, lineHeight: 24 },

  // Stats grid
  statsGrid:    { flexDirection: 'row', backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginVertical: Spacing.sm },
  statBox:      { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 3 },
  statNum:      { fontSize: FontSize.xl, fontWeight: FontWeight.black },
  statLbl:      { fontSize: 9, color: Colors.textMuted, fontWeight: FontWeight.black, letterSpacing: 0.8, marginTop: 2 },
  statDivider:  { width: 1, backgroundColor: Colors.border },

  // Muscle chips on exercise
  exMuscleRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  exMuscleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  exMuscleEmoji:{ fontSize: 11 },
  exMuscleTxt:  { fontSize: 10, fontWeight: FontWeight.semibold, textTransform: 'capitalize' },

  // Form tip
  formTip:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: `${Colors.accent}10`, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: `${Colors.accent}25` },
  formTipTxt:   { flex: 1, fontSize: FontSize.xs, color: Colors.accent, lineHeight: 18 },

  // Ready card
  readyCard:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg, marginTop: Spacing.sm },
  readyEmoji:   { fontSize: 28 },
  readyTxt:     { fontSize: FontSize.lg, fontWeight: FontWeight.black },

  // Sticky bar
  stickyBar:    { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, paddingBottom: 36, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  startBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingVertical: 16 },
  startBtnTxt:  { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: '#fff', letterSpacing: 0.5 },

  // Session modal
  sessionScreen:  { flex: 1, backgroundColor: Colors.background },
  sessionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sessionDay:     { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.textPrimary },
  sessionFocus:   { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  sessionRight:   { alignItems: 'flex-end', gap: Spacing.sm },
  timerBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.primary}18`, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  timerTxt:       { fontSize: FontSize.md, fontWeight: FontWeight.black, color: Colors.primary },
  finishBtn:      { backgroundColor: Colors.success, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: 10 },
  finishTxt:      { color: '#fff', fontWeight: FontWeight.black, fontSize: FontSize.md },
  progressTrack:  { height: 4, backgroundColor: Colors.border, marginHorizontal: Spacing.xl, marginTop: Spacing.sm, borderRadius: 2, overflow: 'hidden' },
  progressFill:   { height: '100%', backgroundColor: Colors.success, borderRadius: 2 },
  progressLbl:    { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right', paddingHorizontal: Spacing.xl, marginTop: 4 },
  restBanner:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, margin: Spacing.xl, marginBottom: 0, backgroundColor: `${Colors.accent}12`, borderRadius: Radius.xl, borderWidth: 1, borderColor: `${Colors.accent}44`, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  restLeft:       { alignItems: 'center', width: 52 },
  restLabel:      { fontSize: 9, fontWeight: FontWeight.black, color: Colors.accent, letterSpacing: 1 },
  restTime:       { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.accent },
  restBarTrack:   { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  restBarFill:    { height: '100%', backgroundColor: Colors.accent, borderRadius: 4 },
  skipBtn:        { backgroundColor: `${Colors.accent}22`, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  skipTxt:        { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.bold },
  sessionScroll:  { padding: Spacing.xl, paddingTop: Spacing.md },
  sessionExCard:  { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.md },
  sessionExDone:  { borderColor: `${Colors.success}55`, backgroundColor: `${Colors.success}06` },
  sessionExHeader:{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.sm },
  sessionExNum:   { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sessionExNumTxt:{ fontSize: FontSize.sm, fontWeight: FontWeight.black, color: Colors.textMuted },
  sessionExName:  { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sessionExEmoji: { fontSize: 28 },
  formNote:       { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: `${Colors.accent}10`, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: `${Colors.accent}25` },
  formNoteTxt:    { flex: 1, fontSize: FontSize.xs, color: Colors.accent, lineHeight: 16 },
  setHeader:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 8, gap: Spacing.sm },
  setHeaderTxt:   { fontSize: 9, fontWeight: FontWeight.black, color: Colors.textMuted, letterSpacing: 0.8, textAlign: 'center' },
  setRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6, paddingHorizontal: 4, borderRadius: Radius.md, marginBottom: 4 },
  setRowDone:     { backgroundColor: `${Colors.success}10` },
  setNumBubble:   { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  setNumTxt:      { fontSize: 11, fontWeight: FontWeight.bold, color: Colors.textMuted },
  repsDisplay:    { width: 60, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  repsText:       { fontSize: FontSize.md, fontWeight: FontWeight.black, color: Colors.textPrimary },
  setInput:       { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, paddingVertical: 9, color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, textAlign: 'center' },
  setInputDone:   { borderColor: `${Colors.success}44`, backgroundColor: `${Colors.success}10`, color: Colors.success },
  checkBtn:       { width: 44, alignItems: 'center' },
});
