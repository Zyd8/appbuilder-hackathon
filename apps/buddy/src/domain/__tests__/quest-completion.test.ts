import { canSubmitQuest } from '../quest-completion';

describe('canSubmitQuest', () => {
  it('blocks finishing without a photo', () => {
    expect(canSubmitQuest({ reflection: '' })).toBe(false);
    expect(canSubmitQuest({ reflection: 'Felt great' })).toBe(false);
    expect(canSubmitQuest({ photoUri: '  ', reflection: '' })).toBe(false);
  });

  it('allows finishing with a photo, with or without a reflection', () => {
    expect(canSubmitQuest({ photoUri: 'file:///cache/photo.jpg', reflection: '' })).toBe(true);
    expect(canSubmitQuest({ photoUri: 'file:///cache/photo.jpg', reflection: 'Done' })).toBe(true);
  });
});
