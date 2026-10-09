/** What the user has filled in before finishing a quest. */
export type QuestCompletionDraft = {
  /** Local URI of the proof photo. Required to finish. */
  photoUri?: string;
  /** Optional one-line reflection. */
  reflection: string;
};

/** A quest can be finished once a photo is attached. The reflection stays optional. */
export function canSubmitQuest(draft: QuestCompletionDraft): boolean {
  return Boolean(draft.photoUri?.trim());
}
