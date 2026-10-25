export function parseFavorites(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : [];
  } catch {
    return [];
  }
}

export function moveItem<T>(list: readonly T[], from: number, to: number): readonly T[] {
  const target = Math.max(0, Math.min(list.length - 1, to));
  if (target === from || from < 0 || from >= list.length) return list;

  const next = [...list];
  const [item] = next.splice(from, 1) as [T];
  next.splice(target, 0, item);
  return next;
}

export const toggleItem = (list: readonly string[], id: string): string[] =>
  list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
