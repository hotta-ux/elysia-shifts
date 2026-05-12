/**
 * Shift slot configuration per period.
 * Cutover: from 2026-06 onwards, new 6-slot schedule with 9:30 open / 23:30 close.
 */

export type ShiftType = { key: string; label: string; time: string };

const OLD_SLOTS: ShiftType[] = [
  { key: "slot1", label: "①", time: "8:00-11:00" },
  { key: "slot2", label: "②", time: "11:00-14:00" },
  { key: "slot3", label: "③", time: "14:00-17:00" },
  { key: "slot4", label: "④", time: "17:00-20:00" },
  { key: "slot5", label: "⑤", time: "20:00-23:00" },
];

const NEW_SLOTS: ShiftType[] = [
  { key: "slot1", label: "①", time: "9:30-12:30" },
  { key: "slot2", label: "②", time: "12:30-15:30" },
  { key: "slot3", label: "③", time: "15:30-18:30" },
  { key: "slot4", label: "④", time: "18:30-21:00" },
  { key: "slot5", label: "⑤", time: "21:00-23:30" },
];

/**
 * Return the shift type list for the given year/month (1-12).
 * 2026-06 以降は新6枠、それ以前は旧5枠。
 */
export function getShiftTypes(year: number, month: number): ShiftType[] {
  if (year > 2026 || (year === 2026 && month >= 6)) return NEW_SLOTS;
  return OLD_SLOTS;
}

/** Same logic but from a YYYY-MM string. */
export function getShiftTypesForMonth(monthStr: string): ShiftType[] {
  const [y, m] = monthStr.split("-").map(Number);
  return getShiftTypes(y, m);
}
