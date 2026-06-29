import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { Exercise } from '../../types';

interface Props {
  exercise: Exercise;
}

export function ExerciseRow({ exercise }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={styles.muscles}>{exercise.muscleGroups.join(', ')}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.sets}>{exercise.sets} × {exercise.reps}</Text>
        <Text style={styles.rest}>Rest {exercise.restSeconds}s</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  left: { flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  muscles: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  right: { alignItems: 'flex-end' },
  sets: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary },
  rest: { fontSize: FontSize.xs, color: Colors.textMuted },
});
