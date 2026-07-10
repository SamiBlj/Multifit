import { useLocalSearchParams, router } from 'expo-router';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, Alert, Vibration, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { GOAL_META } from '../../constants/goalMeta';
import { startWorkoutSession, endWorkoutSession } from '../../services/supabase/database';
import type { Exercise } from '../../types';

const { width, height } = Dimensions.get('window');

// ─── Muscle colour map ────────────────────────────────────────────────────────
const MUSCLE_COLORS: Record<string, string> = {
  chest: '#FF6B35', back: '#00E5FF', shoulders: '#FFB800', legs: '#7C4DFF',
  arms: '#00C853', core: '#FF4D4D', biceps: '#00C853', triceps: '#FF6B35',
  glutes: '#FFB800', hamstrings: '#7C4DFF', quads: '#FF4D4D', calves: '#00E5FF',
  'upper back': '#00E5FF', 'lower back': '#00B0CC', abs: '#FF4D4D',
  'hip flexors': '#A78BFA', forearms: '#FFB800',
};
function muscleCol(m: string) { return MUSCLE_COLORS[m.toLowerCase()] ?? Colors.primary; }

// ─── Exercise category ────────────────────────────────────────────────────────
type ExCategory = 'press' | 'squat' | 'pull' | 'hinge' | 'curl' | 'core' | 'cardio' | 'shoulder';
function getCategory(name: string): ExCategory {
  if (/bench|chest press|push.?up|fly|dip|tricep/i.test(name)) return 'press';
  if (/squat|lunge|leg press|leg extension/i.test(name))        return 'squat';
  if (/deadlift|rdl|romanian|hip hinge|good morning/i.test(name)) return 'hinge';
  if (/pull.?up|chin.?up|lat pulldown|row|pull.?down/i.test(name)) return 'pull';
  if (/curl|bicep/i.test(name))                                  return 'curl';
  if (/plank|ab|core|crunch|sit.?up|leg raise/i.test(name))     return 'core';
  if (/run|sprint|jog|jump|burpee|cardio|bike|cycle/i.test(name)) return 'cardio';
  if (/shoulder press|overhead|ohp|lateral raise|face pull|shrug/i.test(name)) return 'shoulder';
  return 'press';
}

// ─── Animated Exercise Demo ────────────────────────────────────────────────────
function ExerciseAnimation({ category, color }: { category: ExCategory; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation;
    const duration = category === 'cardio' ? 400 : category === 'core' ? 1800 : 900;

    loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true, easing: t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true, easing: t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [category]);

  const UP   = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -38] });
  const DOWN = anim.interpolate({ inputRange: [0, 1], outputRange: [0,  38] });
  const ROT  = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '30deg'] });
  const RROT = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-30deg'] });
  const SCL  = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const LEAN = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-28deg'] });

  const bg = `${color}18`;

  // Shared body parts
  const Head = <View style={[a.head, { backgroundColor: color }]} />;
  const Torso = (style?: any) => <View style={[a.torso, { backgroundColor: `${color}CC` }, style]} />;

  if (category === 'press') {
    // Bench press: bar goes up and down from chest
    return (
      <View style={[a.scene, { backgroundColor: bg }]}>
        {/* Bench */}
        <View style={[a.bench, { backgroundColor: Colors.border }]} />
        {/* Body lying */}
        <View style={a.lyingBody}>
          {Head}
          <View style={[a.lyingTorso, { backgroundColor: `${color}CC` }]} />
        </View>
        {/* Bar moving up/down */}
        <Animated.View style={[a.barWrap, { transform: [{ translateY: UP }] }]}>
          <View style={[a.bar, { backgroundColor: Colors.textPrimary }]} />
          <View style={[a.plate, { backgroundColor: color, left: -16 }]} />
          <View style={[a.plate, { backgroundColor: color, right: -16 }]} />
        </Animated.View>
        <Text style={[a.label, { color }]}>Push up · Extend arms</Text>
      </View>
    );
  }

  if (category === 'squat') {
    return (
      <View style={[a.scene, { backgroundColor: bg }]}>
        {/* Bar on shoulders */}
        <Animated.View style={[a.squatFigure, { transform: [{ translateY: DOWN }] }]}>
          <View style={[a.bar, { backgroundColor: Colors.textPrimary, marginBottom: 4 }]} />
          <View style={[a.plate, { backgroundColor: color, position: 'absolute', left: -16, top: 0 }]} />
          <View style={[a.plate, { backgroundColor: color, position: 'absolute', right: -16, top: 0 }]} />
          {Head}
          {Torso()}
          {/* Legs */}
          <View style={a.legsRow}>
            <Animated.View style={[a.leg, { backgroundColor: `${color}AA`, transform: [{ rotate: anim.interpolate({ inputRange: [0,1], outputRange: ['0deg','40deg'] }) }], transformOrigin: 'top' }]} />
            <Animated.View style={[a.leg, { backgroundColor: `${color}AA`, transform: [{ rotate: anim.interpolate({ inputRange: [0,1], outputRange: ['0deg','-40deg'] }) }], transformOrigin: 'top' }]} />
          </View>
        </Animated.View>
        <Text style={[a.label, { color }]}>Drive through heels · Keep chest up</Text>
      </View>
    );
  }

  if (category === 'pull') {
    return (
      <View style={[a.scene, { backgroundColor: bg }]}>
        {/* Pulldown bar at top */}
        <View style={[a.pullBar, { backgroundColor: Colors.textPrimary }]} />
        <View style={[a.plate, { backgroundColor: color, position: 'absolute', top: 28, left: width * 0.15 }]} />
        <View style={[a.plate, { backgroundColor: color, position: 'absolute', top: 28, right: width * 0.15 }]} />
        {/* Arms moving down */}
        <Animated.View style={[a.pullFigure, { transform: [{ translateY: DOWN }] }]}>
          <View style={a.armsUp}>
            <Animated.View style={[a.arm, { backgroundColor: `${color}AA`, transform: [{ rotate: RROT }] }]} />
            <Animated.View style={[a.arm, { backgroundColor: `${color}AA`, transform: [{ rotate: ROT }] }]} />
          </View>
          {Head}
          {Torso()}
        </Animated.View>
        <Text style={[a.label, { color }]}>Pull elbows down · Squeeze lats</Text>
      </View>
    );
  }

  if (category === 'hinge') {
    return (
      <View style={[a.scene, { backgroundColor: bg }]}>
        <Animated.View style={[a.hingeFigure, { transform: [{ rotate: LEAN }], transformOrigin: 'bottom center' }]}>
          {Head}
          {Torso({ height: 70 })}
          <View style={[a.bar, { backgroundColor: Colors.textPrimary, marginTop: 4 }]} />
          <View style={[a.plate, { backgroundColor: color, position: 'absolute', bottom: 0, left: -16 }]} />
          <View style={[a.plate, { backgroundColor: color, position: 'absolute', bottom: 0, right: -16 }]} />
        </Animated.View>
        <View style={[a.floor, { backgroundColor: Colors.border }]} />
        <Text style={[a.label, { color }]}>Hinge at hips · Neutral spine</Text>
      </View>
    );
  }

  if (category === 'curl') {
    return (
      <View style={[a.scene, { backgroundColor: bg }]}>
        {Head}
        {Torso()}
        {/* Arms curling */}
        <View style={a.curlArms}>
          <Animated.View style={[a.forearm, { backgroundColor: `${color}AA`, transform: [{ rotate: anim.interpolate({ inputRange: [0,1], outputRange: ['0deg','-110deg'] }) }], transformOrigin: 'top' }]} />
          <Animated.View style={[a.forearm, { backgroundColor: `${color}AA`, transform: [{ rotate: anim.interpolate({ inputRange: [0,1], outputRange: ['0deg','110deg'] }) }], transformOrigin: 'top' }]} />
        </View>
        <Text style={[a.label, { color }]}>Curl up · Squeeze bicep · Lower slow</Text>
      </View>
    );
  }

  if (category === 'core') {
    return (
      <View style={[a.scene, { backgroundColor: bg }]}>
        <Animated.View style={{ transform: [{ scale: SCL }], alignItems: 'center' }}>
          {/* Plank position */}
          <View style={[a.plankBody, { backgroundColor: `${color}CC` }]}>
            <View style={[a.head, { backgroundColor: color, position: 'absolute', right: -22, top: -10 }]} />
          </View>
          <View style={a.plankArms}>
            <View style={[a.plankArm, { backgroundColor: `${color}AA` }]} />
            <View style={[a.plankArm, { backgroundColor: `${color}AA` }]} />
          </View>
        </Animated.View>
        <View style={[a.floor, { backgroundColor: Colors.border }]} />
        <Text style={[a.label, { color }]}>Brace core · Keep hips level</Text>
      </View>
    );
  }

  if (category === 'cardio') {
    return (
      <View style={[a.scene, { backgroundColor: bg }]}>
        <Animated.View style={[a.runFigure, { transform: [{ translateY: UP }] }]}>
          {Head}
          {Torso({ transform: [{ rotate: '5deg' }] })}
          <View style={a.runLegs}>
            <Animated.View style={[a.leg, { backgroundColor: `${color}AA`, transform: [{ rotate: ROT }] }]} />
            <Animated.View style={[a.leg, { backgroundColor: `${color}AA`, transform: [{ rotate: RROT }] }]} />
          </View>
        </Animated.View>
        <View style={[a.floor, { backgroundColor: Colors.border }]} />
        <Text style={[a.label, { color }]}>Keep pace · Breathe steady</Text>
      </View>
    );
  }

  // shoulder
  return (
    <View style={[a.scene, { backgroundColor: bg }]}>
      {Head}
      {Torso()}
      <View style={a.shoulderArms}>
        <Animated.View style={[a.arm, { backgroundColor: `${color}AA`, transform: [{ rotate: anim.interpolate({ inputRange: [0,1], outputRange: ['-20deg','-160deg'] }) }], transformOrigin: 'top' }]} />
        <Animated.View style={[a.arm, { backgroundColor: `${color}AA`, transform: [{ rotate: anim.interpolate({ inputRange: [0,1], outputRange: ['20deg','160deg'] }) }], transformOrigin: 'top' }]} />
      </View>
      <Text style={[a.label, { color }]}>Press overhead · Lock out at top</Text>
    </View>
  );
}

const a = StyleSheet.create({
  scene:       { width: '100%', height: 220, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.xl, marginBottom: Spacing.lg, overflow: 'hidden', position: 'relative' },
  label:       { position: 'absolute', bottom: 12, fontSize: 11, fontWeight: FontWeight.semibold, opacity: 0.9 },
  head:        { width: 32, height: 32, borderRadius: 16, marginBottom: 4 },
  torso:       { width: 28, height: 50, borderRadius: 8, marginBottom: 4 },
  arm:         { width: 10, height: 42, borderRadius: 5 },
  forearm:     { width: 10, height: 38, borderRadius: 5 },
  leg:         { width: 12, height: 46, borderRadius: 6 },
  legsRow:     { flexDirection: 'row', gap: 8, marginTop: 2 },
  armsUp:      { flexDirection: 'row', gap: 28, marginBottom: 4 },
  curlArms:    { flexDirection: 'row', gap: 40, marginTop: 4 },
  shoulderArms:{ flexDirection: 'row', gap: 28, marginTop: 4 },
  runLegs:     { flexDirection: 'row', gap: 8 },
  runFigure:   { alignItems: 'center' },
  bar:         { width: 130, height: 10, borderRadius: 5 },
  plate:       { width: 14, height: 28, borderRadius: 4, position: 'absolute', top: 0 },
  bench:       { width: 160, height: 16, borderRadius: 8, position: 'absolute', bottom: 60 },
  lyingBody:   { flexDirection: 'row', alignItems: 'center', gap: 8, position: 'absolute', bottom: 70 },
  lyingTorso:  { width: 80, height: 24, borderRadius: 8 },
  barWrap:     { alignItems: 'center', position: 'absolute', top: 40 },
  squatFigure: { alignItems: 'center' },
  pullBar:     { width: 180, height: 10, borderRadius: 5, position: 'absolute', top: 24 },
  pullFigure:  { alignItems: 'center', position: 'absolute', top: 38 },
  hingeFigure: { alignItems: 'center' },
  floor:       { position: 'absolute', bottom: 20, width: '80%', height: 3, borderRadius: 2 },
  plankBody:   { width: 100, height: 22, borderRadius: 10, position: 'relative' },
  plankArms:   { flexDirection: 'row', gap: 60, marginTop: 2 },
  plankArm:    { width: 10, height: 28, borderRadius: 5 },
});

// ─── Timer helper ─────────────────────────────────────────────────────────────
function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkoutDetailScreen() {
  const { dayIndex }  = useLocalSearchParams<{ dayIndex: string }>();
  const { plan }      = useWorkoutStore();
  const { profile }   = useUserStore();
  const { user }      = useAuthStore();

  const idx      = parseInt(dayIndex ?? '0');
  const day      = plan?.days[idx] ?? null;
  const goalMeta = GOAL_META[profile?.goal ?? 'maintain'];
  const col      = goalMeta.color;

  const [started, setStarted]       = useState(false);
  const [exIdx, setExIdx]           = useState(0);
  const [completedSets, setCompleted] = useState<Record<string, number>>({});  // exId -> sets done
  const [sessionId, setSessionId]   = useState<string | null>(null);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [restSecs, setRestSecs]     = useState(0);
  const [restTarget, setRestTarget] = useState(0);
  const [resting, setResting]       = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const sessionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimer    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session timer
  useEffect(() => {
    if (started) {
      sessionTimer.current = setInterval(() => setSessionSecs(s => s + 1), 1000);
    } else {
      if (sessionTimer.current) clearInterval(sessionTimer.current);
      setSessionSecs(0);
    }
    return () => { if (sessionTimer.current) clearInterval(sessionTimer.current); };
  }, [started]);

  const startRest = useCallback((seconds: number) => {
    if (restTimer.current) clearInterval(restTimer.current);
    setRestTarget(seconds); setRestSecs(seconds); setResting(true);
    restTimer.current = setInterval(() => {
      setRestSecs(prev => {
        if (prev <= 1) {
          clearInterval(restTimer.current!);
          setResting(false);
          Vibration.vibrate([0, 200, 100, 200]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  function skipRest() {
    if (restTimer.current) clearInterval(restTimer.current);
    setResting(false); setRestSecs(0);
  }

  async function handleStart() {
    if (!user?.uid || !day) return;
    const sid = await startWorkoutSession(user.uid, day.dayLabel);
    setSessionId(sid);
    setStarted(true);
    setExIdx(0);
    setCompleted({});
  }

  function handleLogSet(ex: Exercise) {
    const done = (completedSets[ex.id] ?? 0) + 1;
    setCompleted(p => ({ ...p, [ex.id]: done }));
    if (done < ex.sets) {
      startRest(ex.restSeconds);
    } else {
      // All sets done — move to next exercise after a beat
      startRest(ex.restSeconds);
      if (exIdx < (day?.exercises.length ?? 1) - 1) {
        setTimeout(() => navigateTo(exIdx + 1), (ex.restSeconds + 0.5) * 1000);
      }
    }
  }

  function navigateTo(next: number) {
    const dir = next > exIdx ? 1 : -1;
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -dir * width, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir * width,  duration: 0,   useNativeDriver: true }),
    ]).start(() => {
      setExIdx(next);
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    });
  }

  async function handleFinish() {
    if (!user?.uid || !sessionId) return;
    if (restTimer.current) clearInterval(restTimer.current);
    const sets = Object.entries(completedSets).map(([id, n]) => ({ exerciseId: id, setsCompleted: n }));
    await endWorkoutSession(user.uid, sessionId, sets);
    setStarted(false); setResting(false);
    Alert.alert('🎉 Workout Complete!', `Great work! ${fmtTime(sessionSecs)} session.`);
    router.back();
  }

  if (!day) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: Colors.textMuted, fontSize: FontSize.md }}>Workout not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ex          = day.exercises[exIdx];
  const category    = getCategory(ex?.name ?? '');
  const doneSets    = completedSets[ex?.id] ?? 0;
  const totalExDone = day.exercises.filter(e => (completedSets[e.id] ?? 0) >= e.sets).length;
  const overallPct  = (totalExDone / day.exercises.length) * 100;
  const restPct     = restTarget > 0 ? ((restTarget - restSecs) / restTarget) * 100 : 0;
  const primaryMuscle = ex?.muscleGroups?.[0] ?? '';
  const exColor     = muscleCol(primaryMuscle) || col;

  // ── Pre-workout overview ───────────────────────────────────────────────────
  if (!started) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <ScrollView contentContainerStyle={s.overviewScroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          {/* Hero */}
          <View style={[s.overviewHero, { backgroundColor: `${col}18` }]}>
            <View style={[s.goalBadge, { backgroundColor: col }]}>
              <Text style={s.goalBadgeTxt}>{goalMeta.emoji} {goalMeta.label.toUpperCase()}</Text>
            </View>
            <Text style={s.overviewDay}>{day.dayLabel}</Text>
            <Text style={s.overviewFocus}>{day.focus}</Text>
            <View style={s.overviewMeta}>
              <View style={s.metaPill}>
                <Ionicons name="time-outline" size={14} color={col} />
                <Text style={[s.metaPillTxt, { color: col }]}>{day.durationMinutes} min</Text>
              </View>
              <View style={s.metaPill}>
                <Ionicons name="barbell-outline" size={14} color={col} />
                <Text style={[s.metaPillTxt, { color: col }]}>{day.exercises.length} exercises</Text>
              </View>
            </View>
          </View>

          {/* Exercise list preview */}
          <Text style={s.previewTitle}>Today's Exercises</Text>
          {day.exercises.map((e, i) => {
            const mc = muscleCol(e.muscleGroups?.[0] ?? '');
            return (
              <View key={e.id} style={s.previewRow}>
                <View style={[s.previewNum, { backgroundColor: `${mc}20` }]}>
                  <Text style={[s.previewNumTxt, { color: mc }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.previewName}>{e.name}</Text>
                  <Text style={s.previewMeta}>{e.sets} sets · {e.reps} reps · {e.restSeconds}s rest</Text>
                </View>
                <View style={[s.previewChip, { backgroundColor: `${mc}18` }]}>
                  <Text style={[s.previewChipTxt, { color: mc }]}>{e.muscleGroups[0]}</Text>
                </View>
              </View>
            );
          })}

          <View style={{ height: 120 }} />
        </ScrollView>

        <View style={s.stickyBar}>
          <TouchableOpacity style={[s.startBtn, { backgroundColor: col }]} onPress={handleStart}>
            <Ionicons name="play-circle" size={22} color="#fff" />
            <Text style={s.startBtnTxt}>Start Workout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Active workout ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>

      {/* Header */}
      <View style={s.sessionHeader}>
        <TouchableOpacity onPress={() =>
          Alert.alert('End workout?', 'Progress will be saved.', [
            { text: 'Keep going', style: 'cancel' },
            { text: 'Finish', onPress: handleFinish },
          ])
        }>
          <Ionicons name="close" size={24} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={s.sessionDayTxt}>{day.dayLabel}</Text>
          <Text style={s.sessionFocusTxt}>{day.focus}</Text>
        </View>

        <View style={[s.timerBadge, { borderColor: `${col}44` }]}>
          <Ionicons name="timer-outline" size={12} color={col} />
          <Text style={[s.timerTxt, { color: col }]}>{fmtTime(sessionSecs)}</Text>
        </View>
      </View>

      {/* Overall progress bar */}
      <View style={s.overallTrack}>
        <Animated.View style={[s.overallFill, { width: `${overallPct}%`, backgroundColor: col }]} />
      </View>
      <View style={s.progressLabelRow}>
        <Text style={s.progressLbl}>Exercise {exIdx + 1} of {day.exercises.length}</Text>
        <Text style={s.progressLbl}>{totalExDone} complete</Text>
      </View>

      {/* Exercise navigator dots */}
      <View style={s.dotsRow}>
        {day.exercises.map((e, i) => {
          const done = (completedSets[e.id] ?? 0) >= e.sets;
          return (
            <TouchableOpacity key={e.id} onPress={() => navigateTo(i)}>
              <View style={[
                s.dot,
                i === exIdx && { backgroundColor: col, width: 20 },
                done && { backgroundColor: Colors.success },
              ]} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Exercise card with slide animation */}
      <Animated.View style={[s.exCard, { transform: [{ translateX: slideAnim }] }]}>

        {/* Animation area */}
        <ExerciseAnimation category={category} color={exColor} />

        {/* Exercise info */}
        <Text style={s.exName}>{ex.name}</Text>

        <View style={s.muscleRow}>
          {ex.muscleGroups.map(m => (
            <View key={m} style={[s.muscleChip, { backgroundColor: `${muscleCol(m)}18` }]}>
              <Text style={[s.muscleChipTxt, { color: muscleCol(m) }]}>{m}</Text>
            </View>
          ))}
        </View>

        {/* Sets grid */}
        <View style={s.setsInfo}>
          <View style={[s.statBox, { borderColor: exColor }]}>
            <Text style={[s.statNum, { color: exColor }]}>{ex.sets}</Text>
            <Text style={s.statLbl}>SETS</Text>
          </View>
          <View style={s.statDivider} />
          <View style={[s.statBox, { borderColor: Colors.accent }]}>
            <Text style={[s.statNum, { color: Colors.accent }]}>{ex.reps}</Text>
            <Text style={s.statLbl}>REPS</Text>
          </View>
          <View style={s.statDivider} />
          <View style={[s.statBox, { borderColor: Colors.textMuted }]}>
            <Text style={[s.statNum, { color: Colors.textMuted }]}>{ex.restSeconds}s</Text>
            <Text style={s.statLbl}>REST</Text>
          </View>
        </View>

        {/* Set tap buttons */}
        <View style={s.setsRow}>
          {Array.from({ length: ex.sets }, (_, i) => {
            const done = i < doneSets;
            const next = i === doneSets;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  s.setBtn,
                  done && { backgroundColor: Colors.success, borderColor: Colors.success },
                  next && { borderColor: exColor, borderWidth: 2 },
                  resting && next && { opacity: 0.5 },
                ]}
                onPress={() => !done && !resting && handleLogSet(ex)}
                disabled={done || resting}
              >
                {done
                  ? <Ionicons name="checkmark" size={22} color="#fff" />
                  : <Text style={[s.setBtnTxt, next && { color: exColor }]}>
                      {`Set ${i + 1}`}
                    </Text>
                }
              </TouchableOpacity>
            );
          })}
        </View>

        {ex.notes ? (
          <View style={s.formTip}>
            <Ionicons name="bulb-outline" size={13} color={Colors.accent} />
            <Text style={s.formTipTxt}>{ex.notes}</Text>
          </View>
        ) : null}
      </Animated.View>

      {/* Rest timer banner */}
      {resting && (
        <View style={[s.restBanner, { borderColor: `${col}44` }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.restLabel}>REST · {fmtTime(restSecs)}</Text>
            <View style={s.restTrack}>
              <Animated.View style={[s.restFill, { width: `${restPct}%`, backgroundColor: col }]} />
            </View>
          </View>
          <TouchableOpacity style={[s.skipBtn, { backgroundColor: `${col}22` }]} onPress={skipRest}>
            <Text style={[s.skipTxt, { color: col }]}>Skip →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom nav */}
      <View style={s.bottomNav}>
        <TouchableOpacity
          style={[s.navBtn, exIdx === 0 && s.navBtnDisabled]}
          onPress={() => exIdx > 0 && navigateTo(exIdx - 1)}
          disabled={exIdx === 0}
        >
          <Ionicons name="chevron-back" size={20} color={exIdx === 0 ? Colors.border : Colors.textPrimary} />
          <Text style={[s.navBtnTxt, exIdx === 0 && { color: Colors.border }]}>Prev</Text>
        </TouchableOpacity>

        {exIdx === day.exercises.length - 1 ? (
          <TouchableOpacity style={[s.finishBtn, { backgroundColor: col }]} onPress={handleFinish}>
            <Ionicons name="trophy-outline" size={18} color="#fff" />
            <Text style={s.finishBtnTxt}>Finish</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.finishBtn, { backgroundColor: `${col}22`, borderWidth: 1, borderColor: `${col}55` }]} onPress={() => navigateTo(exIdx + 1)}>
            <Text style={[s.finishBtnTxt, { color: col }]}>Next</Text>
            <Ionicons name="chevron-forward" size={18} color={col} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: Colors.background },

  // Back button
  backBtn:         { padding: Spacing.md },

  // Overview (pre-start)
  overviewScroll:  { padding: Spacing.xl, paddingTop: Spacing.sm },
  overviewHero:    { borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.xl },
  goalBadge:       { borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 5, marginBottom: Spacing.md },
  goalBadgeTxt:    { color: '#fff', fontSize: 11, fontWeight: FontWeight.black, letterSpacing: 1 },
  overviewDay:     { fontSize: 28, fontWeight: FontWeight.black, color: Colors.textPrimary, textAlign: 'center' },
  overviewFocus:   { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: Spacing.md },
  overviewMeta:    { flexDirection: 'row', gap: Spacing.sm },
  metaPill:        { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  metaPillTxt:     { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  previewTitle:    { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.textPrimary, marginBottom: Spacing.md },
  previewRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  previewNum:      { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  previewNumTxt:   { fontSize: FontSize.md, fontWeight: FontWeight.black },
  previewName:     { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  previewMeta:     { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  previewChip:     { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  previewChipTxt:  { fontSize: 10, fontWeight: FontWeight.bold, textTransform: 'capitalize' },

  // Sticky start bar
  stickyBar:       { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, paddingBottom: 36, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  startBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingVertical: 16 },
  startBtnTxt:     { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: '#fff' },

  // Active session header
  sessionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  sessionDayTxt:   { fontSize: FontSize.md, fontWeight: FontWeight.black, color: Colors.textPrimary },
  sessionFocusTxt: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
  timerBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  timerTxt:        { fontSize: FontSize.sm, fontWeight: FontWeight.black },

  // Progress
  overallTrack:    { height: 3, backgroundColor: Colors.border, marginHorizontal: Spacing.xl, borderRadius: 2, overflow: 'hidden' },
  overallFill:     { height: '100%', borderRadius: 2 },
  progressLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, marginTop: 4 },
  progressLbl:     { fontSize: 10, color: Colors.textMuted },

  // Dots
  dotsRow:         { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md },
  dot:             { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },

  // Exercise card
  exCard:          { flex: 1, paddingHorizontal: Spacing.xl },
  exName:          { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.textPrimary, marginBottom: Spacing.sm },
  muscleRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  muscleChip:      { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  muscleChipTxt:   { fontSize: 10, fontWeight: FontWeight.bold, textTransform: 'capitalize' },

  // Stats
  setsInfo:        { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: Spacing.lg },
  statBox:         { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 3 },
  statNum:         { fontSize: FontSize.xl, fontWeight: FontWeight.black },
  statLbl:         { fontSize: 9, color: Colors.textMuted, fontWeight: FontWeight.black, letterSpacing: 0.8, marginTop: 2 },
  statDivider:     { width: 1, backgroundColor: Colors.border },

  // Set buttons
  setsRow:         { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginBottom: Spacing.md },
  setBtn:          { flex: 1, minWidth: 70, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingVertical: 14 },
  setBtnTxt:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textMuted },

  // Form tip
  formTip:         { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: `${Colors.accent}10`, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: `${Colors.accent}25` },
  formTipTxt:      { flex: 1, fontSize: FontSize.xs, color: Colors.accent, lineHeight: 18 },

  // Rest banner
  restBanner:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.md },
  restLabel:       { fontSize: FontSize.md, fontWeight: FontWeight.black, color: Colors.textPrimary, marginBottom: 6 },
  restTrack:       { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  restFill:        { height: '100%', borderRadius: 3 },
  skipBtn:         { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  skipTxt:         { fontSize: FontSize.sm, fontWeight: FontWeight.black },

  // Bottom nav
  bottomNav:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border },
  navBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: Spacing.md },
  navBtnDisabled:  { opacity: 0.3 },
  navBtnTxt:       { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  finishBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.lg, paddingVertical: 12, paddingHorizontal: Spacing.xl },
  finishBtnTxt:    { fontSize: FontSize.md, fontWeight: FontWeight.black, color: '#fff' },
});
