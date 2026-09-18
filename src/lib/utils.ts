export function round(value: number, decimals = 1): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function clamp(value: number, min: number, max: number): number {
  if (isNaN(value) || !isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function formatDate(date: Date): string {
  if (isNaN(date.getTime())) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  if (isNaN(result.getTime())) return new Date();
  result.setDate(result.getDate() + (isNaN(days) ? 0 : days));
  return result;
}

export function kgToLb(kg: number): number {
  return kg * 2.2046226218;
}

export function lbToKg(lb: number): number {
  return lb / 2.2046226218;
}

export function cmToInch(cm: number): number {
  return cm / 2.54;
}

export function inchToCm(inch: number): number {
  return inch * 2.54;
}

export function toKg(units: string, kg?: string, lb?: string): number {
  if (units === 'imperial') {
    const parsedLb = parseFloat(lb || '');
    return (!isNaN(parsedLb) && parsedLb > 0) ? lbToKg(parsedLb) : 70;
  }
  const parsedKg = parseFloat(kg || '');
  return (!isNaN(parsedKg) && parsedKg > 0) ? parsedKg : 70;
}

export function toCm(units: string, cm?: string, ft?: string, inch?: string): number {
  if (units === 'imperial') {
    const parsedFt = parseFloat(ft || '');
    const parsedIn = parseFloat(inch || '');
    const totalIn = (isNaN(parsedFt) ? 0 : parsedFt) * 12 + (isNaN(parsedIn) ? 0 : parsedIn);
    return totalIn > 0 ? inchToCm(totalIn) : 170;
  }
  const parsedCm = parseFloat(cm || '');
  return (!isNaN(parsedCm) && parsedCm > 0) ? parsedCm : 170;
}

export function num(value: string | undefined, fallback: number): number {
  const parsed = parseFloat(value || '');
  if (isNaN(parsed) || !isFinite(parsed)) return fallback;
  if (fallback > 0 && parsed <= 0) return fallback;
  return parsed;
}

export function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // silently fail
  }
}

export function isValidNumber(value: string): boolean {
  if (!value || value.trim() === '') return false;
  const parsed = parseFloat(value);
  return !isNaN(parsed) && isFinite(parsed);
}

export function sanitizeInput(value: string): string {
  return value.replace(/[<>"'&]/g, '').trim();
}
