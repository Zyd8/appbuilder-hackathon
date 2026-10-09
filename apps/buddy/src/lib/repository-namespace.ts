export type RepositoryNamespace = `account:${string}` | `guest:${string}`;

/** Namespace selection is explicit; a guest never silently becomes an account. */
export function accountNamespace(userId: string): RepositoryNamespace {
  const id = userId.trim();
  if (!id || id.includes(':')) throw new Error('Invalid account ID');
  return `account:${id}`;
}

export function guestNamespace(guestId: string): RepositoryNamespace {
  const id = guestId.trim();
  if (!id || id.includes(':')) throw new Error('Invalid guest ID');
  return `guest:${id}`;
}

export function progressUserId(namespace: RepositoryNamespace): string {
  return namespace.slice(namespace.indexOf(':') + 1);
}
