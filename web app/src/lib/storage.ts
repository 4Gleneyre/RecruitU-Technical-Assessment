export const CANDIDATE_IDS_STORAGE_KEY = "candidateIds";
export const CANDIDATE_PEOPLE_STORAGE_KEY = "candidatePeople";

export function readCandidateIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CANDIDATE_IDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v) => typeof v === "string");
    }
    return [];
  } catch {
    return [];
  }
}

export function writeCandidateIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  const unique = Array.from(new Set(ids.filter((v) => typeof v === "string")));
  window.localStorage.setItem(CANDIDATE_IDS_STORAGE_KEY, JSON.stringify(unique));
}

export function addCandidateIds(newIds: string[]): number {
  const existing = readCandidateIds();
  const merged = new Set<string>(existing);
  for (const id of newIds) {
    if (typeof id === "string" && id) merged.add(id);
  }
  const result = Array.from(merged);
  writeCandidateIds(result);
  return result.length;
}

export function clearCandidateIds(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CANDIDATE_IDS_STORAGE_KEY);
}

export function readCandidatePeople(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CANDIDATE_PEOPLE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export function writeCandidatePeople(map: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CANDIDATE_PEOPLE_STORAGE_KEY, JSON.stringify(map));
}

export function mergeCandidatePeople(newMap: Record<string, unknown>): number {
  const existing = readCandidatePeople();
  for (const [key, value] of Object.entries(newMap)) {
    if (typeof key === "string" && key) {
      (existing as any)[key] = value;
    }
  }
  writeCandidatePeople(existing);
  return Object.keys(existing).length;
}

export function clearCandidatePeople(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CANDIDATE_PEOPLE_STORAGE_KEY);
}


