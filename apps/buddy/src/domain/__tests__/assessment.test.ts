/// <reference types="jest" />
import {
  buildAssessmentContext,
  emptyAssessment,
  fromAssessmentRow,
  markCompleted,
  needsSync,
  pickRestore,
  resetAssessment,
  setAnswer,
  syncAssessmentLocalFirst,
  toAssessmentRow,
  type AssessmentDoc,
} from '../assessment';
import type { OnboardingPage } from '../types';

const USER = '00000000-0000-4000-8000-000000000001';
const T0 = '2026-10-09T10:00:00.000Z';
const T1 = '2026-10-09T10:01:00.000Z';
const T2 = '2026-10-09T10:02:00.000Z';

const PAGES: OnboardingPage[] = [
  {
    id: 'day',
    title: 'Your day',
    subtitle: '',
    buddyLine: '',
    questions: [
      {
        id: 'about.freeTime',
        kind: 'single',
        prompt: 'Free time per day',
        options: [
          { value: 'lt15', label: '< 15 min' },
          { value: '15-30', label: '15–30 min' },
        ],
      },
      {
        id: 'goals.more',
        kind: 'multi',
        max: 3,
        prompt: 'I want more…',
        options: [
          { value: 'focus', label: 'Getting things done' },
          { value: 'calm', label: 'Calm' },
        ],
      },
      { id: 'rate.focus', kind: 'scale', area: 'focus', prompt: 'Focus' },
      { id: 'free.wish', kind: 'text', prompt: 'One thing to get better at', placeholder: '' },
    ],
  },
];

function synced(doc: AssessmentDoc): AssessmentDoc {
  return { ...doc, syncedAt: doc.updatedAt };
}

describe('setAnswer / markCompleted / resetAssessment', () => {
  it('sets and clears answers and bumps updatedAt', () => {
    let doc = emptyAssessment(USER, T0);
    doc = setAnswer(doc, 'rate.focus', 2, T1);
    expect(doc.answers['rate.focus']).toEqual({ value: 2, answeredAt: T1 });
    expect(doc.updatedAt).toBe(T1);
    doc = setAnswer(doc, 'rate.focus', undefined, T2);
    expect(doc.answers).toEqual({});
    expect(doc.updatedAt).toBe(T2);
  });

  it('marks completion and resets', () => {
    const done = markCompleted(setAnswer(emptyAssessment(USER, T0), 'rate.focus', 3, T0), T1);
    expect(done.completedAt).toBe(T1);
    const reset = resetAssessment(done, T2);
    expect(reset).toMatchObject({ answers: {}, completedAt: null, updatedAt: T2 });
  });
});

describe('needsSync', () => {
  it('is true until the current version has been pushed', () => {
    const doc = setAnswer(emptyAssessment(USER, T0), 'rate.focus', 3, T1);
    expect(needsSync(doc)).toBe(true);
    expect(needsSync(synced(doc))).toBe(false);
    expect(needsSync(setAnswer(synced(doc), 'rate.focus', 4, T2))).toBe(true);
  });
});

describe('syncAssessmentLocalFirst', () => {
  it('marks the pushed version synced', async () => {
    const doc = setAnswer(emptyAssessment(USER, T0), 'rate.focus', 3, T1);
    let local: AssessmentDoc | undefined = doc;
    const result = await syncAssessmentLocalFirst(doc, {
      upsertRemote: async () => {},
      readLatest: () => local,
      writeLocal: (d) => {
        local = d;
      },
    });
    expect(result.synced).toBe(true);
    expect(local && needsSync(local)).toBe(false);
  });

  it('keeps edits made during the upsert pending', async () => {
    const pushed = setAnswer(emptyAssessment(USER, T0), 'rate.focus', 3, T1);
    let local: AssessmentDoc | undefined = pushed;
    await syncAssessmentLocalFirst(pushed, {
      upsertRemote: async () => {
        local = setAnswer(pushed, 'rate.focus', 5, T2);
      },
      readLatest: () => local,
      writeLocal: (d) => {
        local = d;
      },
    });
    expect(local?.answers['rate.focus'].value).toBe(5);
    expect(local?.syncedAt).toBe(T1);
    expect(local && needsSync(local)).toBe(true);
  });

  it('leaves the document pending when the upsert fails', async () => {
    const doc = setAnswer(emptyAssessment(USER, T0), 'rate.focus', 3, T1);
    const writes: AssessmentDoc[] = [];
    const result = await syncAssessmentLocalFirst(doc, {
      upsertRemote: async () => {
        throw new Error('offline');
      },
      readLatest: () => doc,
      writeLocal: (d) => writes.push(d),
    });
    expect(result.synced).toBe(false);
    expect(writes).toHaveLength(0);
    expect(needsSync(result.doc)).toBe(true);
  });

  it('is idempotent: repeated pushes leave one cloud row', async () => {
    const rows = new Map<string, unknown>();
    const doc = setAnswer(emptyAssessment(USER, T0), 'rate.focus', 3, T1);
    const ports = {
      upsertRemote: async (d: AssessmentDoc) => {
        rows.set(d.userId, toAssessmentRow(d));
      },
      readLatest: () => undefined,
      writeLocal: () => {},
    };
    await syncAssessmentLocalFirst(doc, ports);
    await syncAssessmentLocalFirst(doc, ports);
    expect(rows.size).toBe(1);
  });
});

describe('row mapping', () => {
  it('round-trips and drops invalid answers from the cloud', () => {
    const doc = synced(setAnswer(emptyAssessment(USER, T0), 'goals.more', ['focus'], T1));
    const row = toAssessmentRow(doc);
    expect(fromAssessmentRow(row)).toEqual(doc);

    const tampered = fromAssessmentRow({
      ...row,
      answers: { ...row.answers, bad: { value: { nested: true }, answeredAt: T1 }, noDate: { value: 1 } } as never,
    });
    expect(Object.keys(tampered.answers)).toEqual(['goals.more']);
  });
});

describe('pickRestore', () => {
  const local = setAnswer(emptyAssessment(USER, T0), 'rate.focus', 2, T1);
  const remoteNewer = synced(setAnswer(emptyAssessment(USER, T0), 'rate.focus', 4, T2));

  it('uses whichever copy exists', () => {
    expect(pickRestore(undefined, remoteNewer)).toBe(remoteNewer);
    expect(pickRestore(local, undefined)).toBe(local);
  });

  it('never overwrites unsynced local edits', () => {
    expect(pickRestore(local, remoteNewer)).toBe(local);
  });

  it('takes the newer cloud copy when local is fully synced', () => {
    expect(pickRestore(synced(local), remoteNewer)).toBe(remoteNewer);
    const localNewest = synced(setAnswer(local, 'rate.focus', 1, '2026-10-09T11:00:00.000Z'));
    expect(pickRestore(localNewest, remoteNewer)).toBe(localNewest);
  });
});

describe('buildAssessmentContext', () => {
  it('maps codes to labels in questionnaire order and drops stale ids', () => {
    let doc = emptyAssessment(USER, T0);
    doc = setAnswer(doc, 'free.wish', '  Finish what I start  ', T1);
    doc = setAnswer(doc, 'rate.focus', 2, T1);
    doc = setAnswer(doc, 'goals.more', ['calm', 'unknown'], T1);
    doc = setAnswer(doc, 'about.freeTime', '15-30', T1);
    doc = setAnswer(doc, 'removed.question', 'x', T1);

    expect(buildAssessmentContext(doc, PAGES)).toEqual([
      { id: 'about.freeTime', section: 'Your day', question: 'Free time per day', answer: '15–30 min' },
      { id: 'goals.more', section: 'Your day', question: 'I want more…', answer: ['Calm', 'unknown'] },
      {
        id: 'rate.focus',
        section: 'Your day',
        question: 'Focus',
        answer: 2,
        scale: '1 = needs work, 5 = going great',
      },
      { id: 'free.wish', section: 'Your day', question: 'One thing to get better at', answer: 'Finish what I start' },
    ]);
  });

  it('skips answers whose type no longer matches the question', () => {
    const doc = setAnswer(emptyAssessment(USER, T0), 'rate.focus', 'high', T1);
    expect(buildAssessmentContext(doc, PAGES)).toEqual([]);
    expect(buildAssessmentContext(undefined, PAGES)).toEqual([]);
  });
});
