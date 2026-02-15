// ============================================================
// YUMI — Restaurant utility helpers
// ============================================================

import type { OperatingHours, DaySchedule, ThemeColor } from '@/types/database';
import { restaurantThemes, business } from '@/config/tokens';

const DAY_KEYS: (keyof OperatingHours)[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

/**
 * Get today's schedule for a restaurant
 */
export function getTodaySchedule(hours: OperatingHours): DaySchedule {
  const now = new Date();
  // JS: 0=Sunday. Our schema: 0=Monday
  const jsDay = now.getDay(); // 0=Sun, 1=Mon...
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1; // Convert: Mon=0, Sun=6
  return hours[DAY_KEYS[dayIndex]];
}

/**
 * Get day name in Spanish
 */
export function getDayNameES(hours: OperatingHours): string {
  const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const jsDay = new Date().getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
  return names[dayIndex];
}

/**
 * Check if restaurant is currently within operating hours
 */
export function isWithinOperatingHours(hours: OperatingHours): boolean {
  const schedule = getTodaySchedule(hours);
  if (schedule.closed) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = schedule.open.split(':').map(Number);
  const [closeH, closeM] = schedule.close.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

/**
 * Format operating hours for display: "8:00 AM - 10:00 PM"
 */
export function formatSchedule(schedule: DaySchedule): string {
  if (schedule.closed) return 'Cerrado hoy';
  return `${formatTimeStr(schedule.open)} - ${formatTimeStr(schedule.close)}`;
}

function formatTimeStr(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get theme colors for a restaurant's theme_color
 */
export function getRestaurantTheme(themeColor: ThemeColor) {
  return restaurantThemes[themeColor] || restaurantThemes.orange;
}

/**
 * Format currency from cents to display string
 */
export function formatPrice(cents: number): string {
  return `${business.currencySymbol} ${(cents / 100).toFixed(2)}`;
}

/**
 * Format rating for display
 */
export function formatRating(rating: number): string {
  return rating > 0 ? rating.toFixed(1) : 'Nuevo';
}
