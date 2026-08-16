import assert from 'node:assert/strict';
import { waitForProgressAwareCompletion } from './e2e-progress-waiter.mjs';

const pageFor = states => {
  let index = 0;
  return {
    locator: () => ({
      isVisible: async () => states[Math.min(index, states.length - 1)] !== null,
      evaluate: async () => {
        const state = states[Math.min(index, states.length - 1)];
        index += 1;
        return { dataset: Object.fromEntries(Object.entries(state).map(([key, value]) => [key, String(value)])) };
      },
    }),
    get index() { return index; },
  };
};

{
  let clock = 0;
  const page = pageFor([
    { stage: 'tdd_specs', substage: 'feature-specs', completed: 0, total: 2, activitySequence: 0, progress: 10 },
    { stage: 'tdd_specs', substage: 'feature-specs', completed: 1, total: 2, activitySequence: 1, progress: 38 },
    { stage: 'tdd_specs', substage: 'technical-specs', completed: 1, total: 2, activitySequence: 3, progress: 80 },
  ]);
  await waitForProgressAwareCompletion({
    page,
    label: 'test stage',
    expectedStage: 'tdd_specs',
    completed: async () => page.index >= 3,
    inactivityTimeoutMs: 15,
    hardTimeoutMs: 100,
    pollIntervalMs: 5,
    now: () => clock,
    sleepFn: async milliseconds => { clock += milliseconds; },
    onProgress: () => {},
  });
}

{
  let clock = 0;
  let externalActivity = 0;
  let polls = 0;
  const page = pageFor([{ stage: 'gdd', substage: '', completed: 0, total: 0, activitySequence: 0, progress: 60 }]);
  await waitForProgressAwareCompletion({
    page,
    label: 'compile stage',
    expectedStage: 'gdd',
    completed: async () => polls >= 5,
    getActivitySequence: async () => externalActivity,
    inactivityTimeoutMs: 10,
    hardTimeoutMs: 100,
    pollIntervalMs: 5,
    now: () => clock,
    sleepFn: async milliseconds => {
      clock += milliseconds;
      polls += 1;
      externalActivity += 1;
    },
    onProgress: () => {},
  });
}

{
  let clock = 0;
  const page = pageFor([{ stage: 'tdd_specs', substage: 'feature-specs', completed: 0, total: 2, activitySequence: 0, progress: 10 }]);
  await assert.rejects(
    waitForProgressAwareCompletion({
      page,
      label: 'stalled stage',
      expectedStage: 'tdd_specs',
      completed: async () => false,
      inactivityTimeoutMs: 10,
      hardTimeoutMs: 100,
      pollIntervalMs: 5,
      now: () => clock,
      sleepFn: async milliseconds => { clock += milliseconds; },
      onProgress: () => {},
    }),
    /no observable progress/,
  );
}

console.log('Progress-aware E2E waiter tests passed.');