import type { SavedResult, CalcResult } from './types';
import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from './utils';

const RECENT_KEY = 'vitacalc_recent';
const SAVED_KEY = 'vitacalc_saved';
const MAX_RECENT = 8;

export interface RecentTool {
  id: string;
  name: string;
  visitedAt: number;
}

export function getRecentTools(): RecentTool[] {
  try {
    const raw = safeLocalStorageGet(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentTool =>
        item && typeof item === 'object' && typeof item.id === 'string' && typeof item.name === 'string'
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function addRecentTool(id: string, name: string): void {
  try {
    const existing = getRecentTools().filter((t) => t.id !== id);
    const updated = [{ id, name, visitedAt: Date.now() }, ...existing].slice(0, MAX_RECENT);
    safeLocalStorageSet(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // Storage unavailable — degrade silently
  }
}

export function clearRecentTools(): void {
  safeLocalStorageRemove(RECENT_KEY);
}

export function getSavedResults(): SavedResult[] {
  try {
    const raw = safeLocalStorageGet(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is SavedResult =>
        item && typeof item === 'object'
        && typeof item.calcId === 'string'
        && typeof item.calcName === 'string'
        && item.result && typeof item.result === 'object'
        && typeof item.result.headline === 'string'
      )
      .slice(-20);
  } catch {
    return [];
  }
}

export function saveResult(calcId: string, calcName: string, result: CalcResult): boolean {
  try {
    const existing = getSavedResults().filter((r) => r.calcId !== calcId);
    const updated = [...existing, { calcId, calcName, result, savedAt: Date.now() }];
    return safeLocalStorageSet(SAVED_KEY, JSON.stringify(updated));
  } catch {
    return false;
  }
}

export function removeSavedResult(calcId: string): void {
  try {
    const updated = getSavedResults().filter((r) => r.calcId !== calcId);
    safeLocalStorageSet(SAVED_KEY, JSON.stringify(updated));
  } catch {
    // Degrade silently
  }
}

export function clearSavedResults(): void {
  safeLocalStorageRemove(SAVED_KEY);
}

export interface ExportData {
  version: number;
  exportedAt: string;
  savedResults: SavedResult[];
  recentTools: RecentTool[];
}

export function exportData(): ExportData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    savedResults: getSavedResults(),
    recentTools: getRecentTools(),
  };
}

export type ImportResult =
  | { success: true; message: string; importedCount: number }
  | { success: false; message: string };

export function importData(jsonString: string): ImportResult {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Invalid data format: not a valid JSON object.' };
    }

    if (typeof parsed.version !== 'number') {
      return { success: false, message: 'Incompatible data: missing version field.' };
    }

    if (parsed.version > 1) {
      return { success: false, message: `Unsupported data version ${parsed.version}. This app supports version 1.` };
    }

    if (!Array.isArray(parsed.savedResults)) {
      return { success: false, message: 'Invalid data: savedResults must be an array.' };
    }

    const validResults = parsed.savedResults.filter(
      (item: unknown): item is SavedResult =>
        !!item && typeof item === 'object'
        && typeof (item as SavedResult).calcId === 'string'
        && typeof (item as SavedResult).calcName === 'string'
        && !!(item as SavedResult).result
        && typeof (item as SavedResult).result === 'object'
        && typeof (item as SavedResult).result.headline === 'string'
    );

    if (validResults.length === 0 && parsed.savedResults.length > 0) {
      return { success: false, message: 'No valid entries found in the imported data.' };
    }

    const existing: SavedResult[] = getSavedResults();
    const existingIds = new Set(existing.map((r: SavedResult) => r.calcId));
    const newEntries = validResults.filter((r: SavedResult) => !existingIds.has(r.calcId));
    const merged = [...existing, ...newEntries].slice(-20);

    safeLocalStorageSet(SAVED_KEY, JSON.stringify(merged));

    if (Array.isArray(parsed.recentTools)) {
      const validRecent = parsed.recentTools.filter(
        (item: unknown): item is RecentTool =>
          !!item && typeof item === 'object'
          && typeof (item as RecentTool).id === 'string'
          && typeof (item as RecentTool).name === 'string'
      );
      if (validRecent.length > 0) {
        safeLocalStorageSet(RECENT_KEY, JSON.stringify(validRecent.slice(0, MAX_RECENT)));
      }
    }

    return {
      success: true,
      message: `Successfully imported ${newEntries.length} new result${newEntries.length === 1 ? '' : 's'}.`,
      importedCount: newEntries.length,
    };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { success: false, message: 'Invalid JSON: the file could not be parsed.' };
    }
    return { success: false, message: 'An unexpected error occurred during import.' };
  }
}
