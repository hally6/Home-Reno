export function parseDate(value: string | null | undefined): Date {
  if (!value) {
    return new Date();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

export function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildDateOptions(days: number): Date[] {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  return Array.from({ length: days }).map((_, idx) => {
    const date = new Date(base);
    date.setDate(base.getDate() + idx);
    return date;
  });
}

export function buildTimeOptions(): Array<{ key: string; label: string; hours: number; minutes: number }> {
  const options: Array<{ key: string; label: string; hours: number; minutes: number }> = [];
  for (let h = 6; h <= 22; h += 1) {
    for (const m of [0, 30]) {
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const min = String(m).padStart(2, '0');
      options.push({
        key: `${h}:${min}`,
        label: `${displayHour}:${min} ${period}`,
        hours: h,
        minutes: m
      });
    }
  }
  return options;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
