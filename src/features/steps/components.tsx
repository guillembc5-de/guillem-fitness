import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Icon, Stat, colors, radii, spacing } from '@/design';
import { formatNumber } from '@/domain/format';
import type { LocalDate } from '@/domain/localDay';
import { compliance, monthGrid, type Compliance } from '@/domain/steps';
import type { StepDay } from '@/domain/stepTypes';

import { formatLongDay, formatMonthTitle, SOURCE_LABELS, WEEKDAY_INITIALS } from './labels';

const CELL_STYLE: Record<Compliance, { bg: string; text: 'text' | 'bg' | 'textSecondary'; border?: string }> = {
  none: { bg: 'transparent', text: 'textSecondary', border: colors.border },
  low: { bg: colors.surfaceRaised, text: 'text' },
  mid: { bg: colors.warmupSoft, text: 'text' },
  done: { bg: colors.success, text: 'bg' },
};

const COMPLIANCE_TEXT: Record<Compliance, string> = {
  none: 'sin datos',
  low: 'menos de la mitad del objetivo',
  mid: 'más de la mitad del objetivo',
  done: 'objetivo cumplido',
};

type CalendarProps = {
  year: number;
  month: number;
  days: ReadonlyMap<LocalDate, StepDay>;
  today: LocalDate;
  defaultGoal: number;
  onPrev: () => void;
  onNext: () => void;
  canNext: boolean;
  onSelectDay: (date: LocalDate) => void;
};

/** Calendario mensual (semana desde el lunes) coloreado por cumplimiento. */
export function MonthCalendar({ year, month, days, today, defaultGoal, onPrev, onNext, canNext, onSelectDay }: CalendarProps) {
  const grid = monthGrid(year, month);
  return (
    <View style={styles.calendar}>
      <PeriodHeader title={formatMonthTitle(year, month)} onPrev={onPrev} onNext={onNext} canNext={canNext} />
      <View style={styles.weekRow}>
        {WEEKDAY_INITIALS.map((d) => (
          <AppText key={d} variant="caption" color="textSecondary" align="center" style={styles.weekday}>
            {d}
          </AppText>
        ))}
      </View>
      <View style={styles.grid}>
        {grid.map((cell) => {
          if (!cell.inMonth) return <View key={cell.localDate} style={styles.cell} />;
          const day = days.get(cell.localDate);
          const future = cell.localDate > today;
          const level = future ? 'none' : compliance(day ? day.steps : null, day?.goalSnapshot ?? defaultGoal);
          const style = CELL_STYLE[level];
          const dayNumber = Number(cell.localDate.slice(8));
          return (
            <View key={cell.localDate} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${formatLongDay(cell.localDate)}: ${day ? `${formatNumber(day.steps)} pasos, ` : ''}${COMPLIANCE_TEXT[level]}`}
                disabled={future}
                onPress={() => onSelectDay(cell.localDate)}
                style={[
                  styles.dayCircle,
                  { backgroundColor: style.bg, borderColor: style.border ?? 'transparent', borderWidth: style.border ? 1 : 0 },
                  cell.localDate === today ? styles.today : null,
                  future ? styles.future : null,
                ]}
              >
                <AppText variant="bodyStrong" color={style.text} style={styles.tabular}>
                  {dayNumber}
                </AppText>
              </Pressable>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <Legend color={colors.success} label="Cumplido" />
        <Legend color={colors.warmupSoft} label="50–99 %" />
        <Legend color={colors.surfaceRaised} label="< 50 %" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

export function PeriodHeader({ title, onPrev, onNext, canNext }: { title: string; onPrev: () => void; onNext: () => void; canNext: boolean }) {
  return (
    <View style={styles.periodHeader}>
      <Pressable accessibilityRole="button" accessibilityLabel="Anterior" onPress={onPrev} style={styles.arrow}>
        <Icon name="chevron-back" />
      </Pressable>
      <AppText variant="headline" align="center" accessibilityRole="header">
        {title}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Siguiente"
        accessibilityState={{ disabled: !canNext }}
        disabled={!canNext}
        onPress={onNext}
        style={[styles.arrow, !canNext ? styles.disabled : null]}
      >
        <Icon name="chevron-forward" />
      </Pressable>
    </View>
  );
}

type SheetProps = {
  date: LocalDate | null;
  day: StepDay | null;
  defaultGoal: number;
  onClose: () => void;
};

/** Detalle de un día (hoja inferior). */
export function DayDetailSheet({ date, day, defaultGoal, onClose }: SheetProps) {
  const insets = useSafeAreaInsets();
  const goal = day?.goalSnapshot ?? defaultGoal;
  const pct = day ? Math.round((day.steps / goal) * 100) : 0;
  return (
    <Modal visible={date !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar detalle" accessibilityRole="button">
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]} onStartShouldSetResponder={() => true}>
          {date ? (
            <>
              <AppText variant="headline" style={styles.capitalize}>
                {formatLongDay(date)}
              </AppText>
              {day ? (
                <>
                  <View style={styles.bigRow}>
                    <AppText variant="numberXL">{formatNumber(day.steps)}</AppText>
                    <AppText variant="body" color="textSecondary">
                      de {formatNumber(goal)} · {pct} %
                    </AppText>
                  </View>
                  <View style={styles.stats}>
                    <Stat label="Distancia" value={formatNumber(day.distanceM / 1000, { maxDecimals: 1 })} unit="km" />
                    <Stat label="Calorías" value={formatNumber(day.kcal)} unit="kcal" />
                    <Stat label="Fuente" value={SOURCE_LABELS[day.source]} />
                  </View>
                  <AppText variant="caption" color={day.steps >= goal ? 'success' : 'textSecondary'}>
                    {day.steps >= goal ? 'Objetivo cumplido' : `Faltaron ${formatNumber(goal - day.steps)} pasos`}
                  </AppText>
                </>
              ) : (
                <AppText variant="body" color="textSecondary">
                  No hay pasos registrados este día.
                </AppText>
              )}
              <Button title="Cerrar" variant="secondary" onPress={onClose} />
            </>
          ) : null}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  calendar: { gap: spacing.sm },
  periodHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  weekRow: { flexDirection: 'row' },
  weekday: { width: `${100 / 7}%` },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 2, borderColor: colors.text },
  future: { opacity: 0.35 },
  tabular: { fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, paddingTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  capitalize: { textTransform: 'capitalize' },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  stats: { flexDirection: 'row', gap: spacing.sm },
});
