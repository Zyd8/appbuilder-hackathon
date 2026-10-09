/// <reference types="jest" />
import { NOTE_MAX } from '../notes';
import { mapSpeechError } from '../speech';
import { IDLE, joinSegments, liveText, mergeTranscript, transition, type VoiceEvent, type VoiceState } from '../voice-input';

/** Runs events in order and returns the final state plus every effect requested. */
function run(events: VoiceEvent[], from: VoiceState = IDLE) {
  const effects: string[] = [];
  let state = from;
  for (const event of events) {
    const next = transition(state, event);
    if (next.effect) effects.push(next.effect);
    state = next.state;
  }
  return { state, effects };
}

describe('tap mode', () => {
  it('starts on tap, stops on a second tap, and returns to idle when the recognizer ends', () => {
    const started = run([{ type: 'TAP', draft: '' }, { type: 'PERMISSION_OK' }]);
    expect(started.state).toMatchObject({ status: 'listening', mode: 'tap' });
    expect(started.effects).toEqual(['request-permission', 'start']);

    const stopped = run([{ type: 'TAP', draft: '' }, { type: 'ENDED' }], started.state);
    expect(stopped.effects).toEqual(['stop']);
    expect(stopped.state).toEqual(IDLE);
  });

  it('cancels when tapped again before the mic is ready', () => {
    const { state, effects } = run([{ type: 'TAP', draft: '' }, { type: 'TAP', draft: '' }, { type: 'PERMISSION_OK' }]);
    expect(state).toEqual(IDLE);
    expect(effects).toEqual(['request-permission']);
  });

  it('ignores hold gestures while tap recording is on', () => {
    const listening = run([{ type: 'TAP', draft: '' }, { type: 'PERMISSION_OK' }]).state;
    expect(run([{ type: 'HOLD_START', draft: '' }, { type: 'HOLD_END' }], listening).state).toBe(listening);
  });
});

describe('hold mode', () => {
  it('records while held and stops on release', () => {
    const { state, effects } = run([{ type: 'HOLD_START', draft: '' }, { type: 'PERMISSION_OK' }, { type: 'HOLD_END' }]);
    expect(state).toMatchObject({ status: 'finalizing', mode: 'hold' });
    expect(effects).toEqual(['request-permission', 'start', 'stop']);
  });

  it('does not start when released before the mic was ready', () => {
    const { state, effects } = run([{ type: 'HOLD_START', draft: '' }, { type: 'HOLD_END' }, { type: 'PERMISSION_OK' }]);
    expect(state).toEqual(IDLE);
    expect(effects).toEqual(['request-permission']);
  });

  it('ignores taps while holding', () => {
    const holding = run([{ type: 'HOLD_START', draft: '' }, { type: 'PERMISSION_OK' }]).state;
    expect(run([{ type: 'TAP', draft: '' }], holding).state).toBe(holding);
  });
});

describe('results', () => {
  it('streams partials and finals onto the starting draft', () => {
    const { state } = run([
      { type: 'TAP', draft: 'Shopping:' },
      { type: 'PERMISSION_OK' },
      { type: 'PARTIAL', text: 'buy' },
      { type: 'FINAL', text: 'buy milk' },
      { type: 'PARTIAL', text: 'and eggs' },
    ]);
    if (state.status !== 'listening') throw new Error('expected listening');
    expect(liveText(state).text).toBe('Shopping: buy milk and eggs');
  });

  it('notes when dictation was cut at the length limit', () => {
    const { state } = run([
      { type: 'TAP', draft: 'a'.repeat(NOTE_MAX - 3) },
      { type: 'PERMISSION_OK' },
      { type: 'FINAL', text: 'hello there' },
      { type: 'ENDED' },
    ]);
    expect(state).toEqual({ status: 'idle', notice: 'truncated' });
  });
});

describe('errors and interruptions', () => {
  it('shows a notice when permission is denied', () => {
    expect(run([{ type: 'TAP', draft: '' }, { type: 'PERMISSION_DENIED' }]).state).toEqual({ status: 'idle', notice: 'not-allowed' });
  });

  it('maps recognizer errors to a notice and ignores the end event that follows', () => {
    const { state } = run([{ type: 'TAP', draft: '' }, { type: 'PERMISSION_OK' }, { type: 'ERROR', kind: 'busy' }, { type: 'ENDED' }]);
    expect(state).toEqual({ status: 'idle', notice: 'busy' });
  });

  it('treats a missing language pack as its own notice', () => {
    const { state } = run([{ type: 'TAP', draft: '' }, { type: 'PERMISSION_OK' }, { type: 'ERROR', kind: 'language-not-supported' }]);
    expect(state).toEqual({ status: 'idle', notice: 'language-not-supported' });
  });

  it('does not report "no speech" when words were already heard', () => {
    const { state } = run([{ type: 'TAP', draft: '' }, { type: 'PERMISSION_OK' }, { type: 'FINAL', text: 'hi' }, { type: 'ERROR', kind: 'no-speech' }]);
    expect(state).toEqual(IDLE);
  });

  it('ignores the aborted error we cause ourselves', () => {
    const listening = run([{ type: 'TAP', draft: '' }, { type: 'PERMISSION_OK' }]).state;
    expect(run([{ type: 'ERROR', kind: 'aborted' }], listening).state).toBe(listening);
  });

  it('aborts when the screen loses focus', () => {
    const { state, effects } = run([{ type: 'TAP', draft: '' }, { type: 'PERMISSION_OK' }, { type: 'CANCEL' }]);
    expect(state).toEqual(IDLE);
    expect(effects).toEqual(['request-permission', 'start', 'abort']);
  });

  it('stops by itself after the time limit', () => {
    const { state, effects } = run([{ type: 'TAP', draft: '' }, { type: 'PERMISSION_OK' }, { type: 'TIMEOUT' }]);
    expect(state).toMatchObject({ status: 'finalizing' });
    expect(effects).toEqual(['request-permission', 'start', 'stop']);
  });

  it('clears a notice on dismiss and when recording starts again', () => {
    const noticed: VoiceState = { status: 'idle', notice: 'busy' };
    expect(run([{ type: 'DISMISS' }], noticed).state).toEqual(IDLE);
    expect(run([{ type: 'TAP', draft: '' }], noticed).state).toMatchObject({ status: 'requesting' });
  });
});

describe('mergeTranscript', () => {
  it('capitalizes into an empty draft', () => {
    expect(mergeTranscript('', ' buy milk ')).toEqual({ text: 'Buy milk', truncated: false });
  });

  it('adds one space after existing text, and none after a trailing space or newline', () => {
    expect(mergeTranscript('Call mom', 'tonight').text).toBe('Call mom tonight');
    expect(mergeTranscript('Call mom ', 'tonight').text).toBe('Call mom tonight');
    expect(mergeTranscript('List:\n', 'eggs').text).toBe('List:\neggs');
  });

  it('starts a new sentence after a full stop', () => {
    expect(mergeTranscript('Done.', 'next thing').text).toBe('Done. Next thing');
  });

  it('keeps the draft unchanged when nothing was heard', () => {
    expect(mergeTranscript('Keep me', '   ')).toEqual({ text: 'Keep me', truncated: false });
  });

  it('cuts at the limit', () => {
    expect(mergeTranscript('abc', 'defgh', 6)).toEqual({ text: 'abc de', truncated: true });
  });
});

describe('joinSegments', () => {
  it('joins in order and skips empty segments', () => {
    expect(joinSegments([' one ', '', 'two', '  '])).toBe('one two');
  });
});

describe('mapSpeechError', () => {
  it('keeps known codes, folds Android timeouts into no-speech, and defaults to unknown', () => {
    expect(mapSpeechError('busy')).toBe('busy');
    expect(mapSpeechError('speech-timeout')).toBe('no-speech');
    expect(mapSpeechError('service-not-allowed')).toBe('language-not-supported');
    expect(mapSpeechError('network')).toBe('unknown');
    expect(mapSpeechError('client')).toBe('unknown');
  });
});
