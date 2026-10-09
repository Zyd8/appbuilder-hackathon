/** Pure list-ordering helpers used by drag-to-reorder. */

/** Move the item at `from` to `to`. Out-of-range indexes return the list unchanged. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Order `items` to match `ids`. Unknown ids are ignored and items missing from `ids` keep their
 * relative order at the end, so a stale drag result never drops a quest.
 */
export function applyOrder<T extends { id: string }>(items: readonly T[], ids: readonly string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered: T[] = [];
  for (const id of ids) {
    const item = byId.get(id);
    if (item) {
      ordered.push(item);
      byId.delete(id);
    }
  }
  return [...ordered, ...items.filter((item) => byId.has(item.id))];
}
