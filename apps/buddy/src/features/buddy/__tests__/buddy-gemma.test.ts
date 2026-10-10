import { attachmentPromptLines } from '@/features/buddy/attachment-service';
import { buildBuddyPrompt, mediaUrisFor } from '@/features/buddy/prompt-builder';
import {
  BUDDY_MODELS,
  DEFAULT_BUDDY_MODEL,
  RUNTIME_SUPPORTS_AUDIO,
  buddyModel,
  type ChatAttachment,
} from '@/features/buddy/types';

function attachment(overrides: Partial<ChatAttachment> = {}): ChatAttachment {
  return {
    id: 'a1',
    kind: 'file',
    name: 'notes.txt',
    uri: 'file:///tmp/notes.txt',
    mimeType: 'text/plain',
    sizeBytes: 12,
    status: 'ready',
    ...overrides,
  };
}

describe('Buddy model selection', () => {
  it('defaults to the Qwen model and keeps Gemma listed but retired', () => {
    expect(DEFAULT_BUDDY_MODEL).toBe('qwen3-1.7b');
    expect(buddyModel(DEFAULT_BUDDY_MODEL).label).toBe('Qwen 1.7B');
    expect(buddyModel(DEFAULT_BUDDY_MODEL).retired).toBe(false);
    expect(buddyModel('qwen35-0.8b').label).toBe('Qwen3.5 0.8B');
    expect(buddyModel('qwen35-0.8b').supportsImages).toBe(true);
    expect(buddyModel('gemma4-e2b').label).toBe('Gemma Default');
    expect(buddyModel('gemma4-e2b').retired).toBe(true);
    expect(buddyModel('gemma4-e4b').retired).toBe(true);
  });

  it('never silently substitutes a different model for an unknown id', () => {
    // @ts-expect-error unknown ids are handled defensively at runtime
    expect(() => buddyModel('gemma3n-e2b')).toThrow('Unknown model ID');
  });

  it('gives every model a distinct on-device artifact path', () => {
    const paths = Object.values(BUDDY_MODELS).map((model) => model.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((path) => path.endsWith('.gguf'))).toBe(true);
  });

  it('points each model at its own pinned GGUF and only ships a projector when it can read images', () => {
    for (const model of Object.values(BUDDY_MODELS)) {
      expect(model.url).toMatch(/^https:\/\/huggingface\.co\/.+\/resolve\/[a-f0-9]{40}\/.+\.gguf$/);
      expect(model.path).toContain('/models/');
      expect(model.downloadGb).toBeGreaterThan(0);
      if (model.supportsImages) {
        expect(model.mmprojUrl).toMatch(/\/resolve\/[a-f0-9]{40}\/mmproj-F16\.gguf$/);
        expect(model.mmprojPath).toContain('/models/');
      } else {
        // Text-only models must not advertise a projector the runtime cannot use.
        expect(model.mmprojUrl).toBeUndefined();
        expect(model.mmprojPath).toBeUndefined();
      }
    }
    expect(buddyModel('qwen3-1.7b').supportsImages).toBe(false);
  });

  it('keeps audio labelled as unsupported by the current runtime', () => {
    expect(RUNTIME_SUPPORTS_AUDIO).toBe(false);
  });
});

describe('buildBuddyPrompt', () => {
  it('includes local context and the latest user turn', () => {
    const prompt = buildBuddyPrompt([{ role: 'user', text: 'I feel stuck' }], ['Player: Zyd', "Today's quests: Walk"]);
    expect(prompt).toContain('untrusted-data');
    expect(prompt).toContain('Player: Zyd');
    expect(prompt).toContain('I feel stuck');
    expect(prompt.trimEnd().endsWith('Buddy answer:')).toBe(true);
  });

  it('inlines extracted text and labels unsupported attachments', () => {
    const prompt = buildBuddyPrompt(
      [
        {
          role: 'user',
          text: 'summarize this',
          attachments: [
            attachment({ extractedText: 'two facts' }),
            attachment({ id: 'a2', name: 'sheet.xlsx', mimeType: null, status: 'unsupported', error: 'not read yet' }),
          ],
        },
      ],
      [],
    );
    expect(prompt).toContain('two facts');
    expect(prompt).toContain('not readable by the model');
  });

  it('caps how many turns are sent', () => {
    const history = Array.from({ length: 30 }, (_, index) => ({ role: 'user' as const, text: `turn ${index}` }));
    const prompt = buildBuddyPrompt(history, []);
    expect(prompt).toContain('turn 29');
    expect(prompt).not.toContain('turn 0\n');
  });
});

describe('attachment handling', () => {
  it('routes only ready images and audio to the native model', () => {
    const media = mediaUrisFor([
      attachment({ id: 'i', kind: 'image', uri: 'file:///tmp/photo.jpg' }),
      attachment({ id: 'a', kind: 'audio', uri: 'file:///tmp/clip.wav' }),
      attachment({ id: 'f', kind: 'file' }),
      attachment({ id: 'bad', kind: 'image', status: 'failed', uri: 'file:///tmp/big.jpg' }),
    ]);
    expect(media.imagePaths).toEqual(['file:///tmp/photo.jpg']);
    expect(media.audioPaths).toEqual(['file:///tmp/clip.wav']);
  });

  it('describes attachments without inventing content', () => {
    const lines = attachmentPromptLines([attachment({ status: 'unsupported', error: 'unsupported type' })]);
    expect(lines[0]).toContain('notes.txt');
    expect(lines[0]).toContain('unsupported type');
  });
});
