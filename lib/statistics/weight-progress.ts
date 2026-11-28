import { getLocalDateString, toUtcDateOnly, diffInCalendarDays } from "../community/dates";

export type WeightRange = 7 | 30 | 90 | "all";
export type WeightEntry = { date: string; weight: number };
export type DailyWeight = { date: string; weight: number };
export const DAY_MS = 86400000;
export function shiftDay(date: string, days: number) {
  return new Date(toUtcDateOnly(date).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}
export function dayDistance(from: string, to: string) {
  return diffInCalendarDays(toUtcDateOnly(from), toUtcDateOnly(to));
}
export function dailyWeights(logs: WeightEntry[], timezone?: string, now = new Date()): DailyWeight[] {
  const today = getLocalDateString(now, timezone);
  const byDay = new Map<string, number>();
  logs.map(log => ({ ...log, timestamp: Date.parse(log.date) }))
    .filter(log => Number.isFinite(log.timestamp) && Number.isFinite(log.weight) && log.weight > 0 && log.timestamp <= now.getTime())
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach(log => {
      const day = getLocalDateString(new Date(log.timestamp), timezone);
      if (day <= today) byDay.set(day, log.weight);
    });
  return Array.from(byDay, ([date, weight]) => ({ date, weight }));
}
export function rangeWeights(points: DailyWeight[], range: WeightRange, today: string) {
  const start = range === "all" ? points[0]?.date ?? today : shiftDay(today, 1 - range);
  return { start, end: today, points: points.filter(p => p.date >= start && p.date <= today) };
}
/** Signed change per seven elapsed calendar days, only for distinct dates. */
export function weeklyChange(points: DailyWeight[]): number | null {
  const first = points[0], last = points[points.length - 1];
  if (!first || !last) return null;
  const days = dayDistance(first.date, last.date);
  return days > 0 ? (last.weight - first.weight) * 7 / days : null;
}
export function loggingStreak(points: DailyWeight[], today: string) {
  let run = 0, best = 0, previous: string | undefined;
  for (const point of points) {
    run = previous && dayDistance(previous, point.date) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = point.date;
  }
  const current = previous && dayDistance(previous, today) <= 1 ? run : 0;
  const days = Array.from({length:7}, (_, i) => shiftDay(today, i - 6));
  const dates = new Set(points.map(p => p.date));
  return { current, best, recent: days.map(date => ({ date, logged: dates.has(date) })) };
}
/** Projection, not a target or promise. Require a week of measurements in the right direction. */
export function estimateGoal(points: DailyWeight[], target?: number) {
  const first = points[0], last = points[points.length - 1];
  if (!first || !last || target == null || !Number.isFinite(target) || target <= 0) return null;
  const weekly = weeklyChange(points);
  if (dayDistance(first.date, last.date) < 7 || weekly === null || weekly === 0) return null;
  const days = (target - last.weight) * 7 / weekly;
  return days > 0 && days <= 730 ? shiftDay(last.date, Math.ceil(days)) : null;
}
export function weightMilestones(points: DailyWeight[], start?: number, target?: number) {
  const initial = start ?? points[0]?.weight;
  if (initial == null || target == null || !Number.isFinite(initial) || !Number.isFinite(target) || initial <= 0 || target <= 0 || initial === target) return [];
  const direction = Math.sign(target - initial), distance = Math.abs(target - initial);
  return [0.2, 0.4, 0.6, 0.8, 1].map(fraction => {
    const amount = distance * fraction;
    const threshold = initial + direction * amount;
    const reached = points.find(p => direction * (p.weight - threshold) >= -1e-8);
    return { fraction, amount, direction, date: reached?.date ?? null };
  });
}
