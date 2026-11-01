export interface Activity { id: string; title: string; start_time: string; end_time: string; weekdays: number[]; category: string }
export interface Task {
  id: string; title: string; notes: string; recurrence: "once" | "daily" | "weekly" | "biweekly" | "monthly";
  weekdays: number[]; month_day: number | null; anchor_date: string; time: string | null; priority: "normal" | "high";
  label: string; dueToday: boolean; occurrence: string | null; done: boolean; next: string | null; overdue: boolean;
}
interface HabitBase { id: string; name: string; per_week: number; time: string | null; reason: string; triggers: string; replacement: string; start_date: string }
export interface GoodHabit extends HabitBase { kind: "good" | "desired"; doneToday: boolean; streak: number; week: { date: string; done: boolean }[]; weekCount: number; goalDays: number | null }
export interface BadHabit extends HabitBase { kind: "bad"; cleanDays: number; record: number; relapses: number; resistedToday: number }
export type Habit = GoodHabit | BadHabit;
export interface Reminder { id: string; text: string; remind_at: string; repeat: string; done_at: string | null }
export interface Note { id: string; title: string; body: string; tag: string; pinned: boolean; updated_at: string }
export interface TodayData { today: string; routine: Activity[]; tasks: Task[]; habits: Habit[]; reminders: Reminder[] }
