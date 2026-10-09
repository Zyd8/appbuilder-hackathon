import { act, create } from 'react-test-renderer';
import Analysis from '../onboarding/analysis';

const mockAssessment = {
  schemaVersion: 1, questionnaireVersion: 1, userId: 'person-1', completedAt: null,
  updatedAt: '2026-10-10T10:00:00Z', syncedAt: null,
  answers: { 'rate.focus': { value: 5, answeredAt: '2026-10-10T09:00:00Z' },
    'rate.calm': { value: 1, answeredAt: '2026-10-10T09:00:00Z' } },
};
const mockState = { assessment: mockAssessment, finishOnboarding: jest.fn() };
jest.mock('@/state/preview-store', () => ({ usePreviewStore: (selector: (value: typeof mockState) => unknown) => selector(mockState) }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('react-native-reanimated', () => ({ __esModule: true,
  default: { View: 'AnimatedView' }, FadeIn: { duration: () => 'fade' }, FadeInDown: { duration: () => 'down' }, useReducedMotion: () => true,
}));
jest.mock('@/theme/use-theme', () => ({ useTheme: () => ({ colors: { surface: 'white', surfaceAlt: 'pale', primary: 'blue', onPrimary: 'white' } }) }));
jest.mock('@/components/app-text', () => ({ AppText: 'AppText' }));
jest.mock('@/components/screen', () => ({ Screen: 'Screen' }));
jest.mock('@/components/buddy-mascot', () => ({ BuddyMascot: 'BuddyMascot' }));
jest.mock('@/components/button', () => ({ Button: 'Button' }));
jest.mock('@/components/card', () => ({ Card: 'Card' }));
jest.mock('@/components/gradient-panel', () => ({ GradientPanel: 'GradientPanel' }));
jest.mock('@/components/insight-list', () => ({ InsightList: 'InsightList' }));
jest.mock('@/components/pulse-rings', () => ({ PulseRings: 'PulseRings' }));
jest.mock('@/components/stat-radar', () => ({ StatRadar: 'StatRadar' }));
test('reveals deterministic assessment title, not the preview profile', async () => {
  jest.useFakeTimers();
  let tree: ReturnType<typeof create>;
  await act(async () => { tree = create(<Analysis />); });
  for (let i = 0; i < 4; i++) await act(async () => { jest.advanceTimersByTime(650); });
  expect(JSON.stringify(tree!.toJSON())).toContain('The Focus Builder');
  await act(async () => { tree!.unmount(); });
  jest.useRealTimers();
});
