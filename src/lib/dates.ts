import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  parseISO,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { DEFAULT_TIMEZONE } from "@/lib/constants";

/** "2h ago"-style relative time for feed cards. */
export function relativeTime(iso: string): string {
  const then = parseISO(iso);
  const now = new Date();
  const minutes = differenceInMinutes(now, then);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = differenceInHours(now, then);
  if (hours < 24) return `${hours}h ago`;
  const days = differenceInDays(now, then);
  if (days < 30) return `${days}d ago`;
  return formatInTimeZone(then, DEFAULT_TIMEZONE, "d MMM yyyy");
}

/** Long date in the community's default timezone (Asia/Dubai). */
export function formatDate(iso: string): string {
  return formatInTimeZone(parseISO(iso), DEFAULT_TIMEZONE, "d MMMM yyyy");
}

/** Event date rendered in the event's own timezone. */
export function formatEventDate(date: string, timezone: string): string {
  return formatInTimeZone(parseISO(date), timezone, "EEEE d MMMM yyyy");
}

/** Month + year, for member-since. */
export function formatMonthYear(iso: string): string {
  return formatInTimeZone(parseISO(iso), DEFAULT_TIMEZONE, "MMMM yyyy");
}

/** Time-of-day-aware greeting in Asia/Dubai. */
export function greeting(): string {
  const hour = Number(formatInTimeZone(new Date(), DEFAULT_TIMEZONE, "H"));
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
