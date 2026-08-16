const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function readGenerationProgress(page) {
  const indicator = page.locator('[data-testid="generation-progress"]');
  if (!await indicator.isVisible().catch(() => false)) return null;
  return indicator.evaluate(element => ({
    stage: element.dataset.stage || '',
    substage: element.dataset.substage || '',
    completed: Number(element.dataset.completed || 0),
    total: Number(element.dataset.total || 0),
    currentItem: element.dataset.currentItem || '',
    activitySequence: Number(element.dataset.activitySequence || 0),
    progress: Number(element.dataset.progress || 0),
  }));
}

export async function waitForProgressAwareCompletion({
  page,
  completed,
  label,
  expectedStage,
  getError = () => null,
  getActivitySequence = () => 0,
  inactivityTimeoutMs = 420_000,
  hardTimeoutMs = 1_800_000,
  pollIntervalMs = 500,
  now = () => Date.now(),
  sleepFn = sleep,
  onProgress = progress => console.log(
    `  ↳ ${label}: ${progress.substage || 'working'} ${progress.completed}/${progress.total}`
      + `${progress.currentItem ? ` — ${progress.currentItem}` : ''} (${progress.progress}%)`,
  ),
}) {
  const startedAt = now();
  let lastActivityAt = startedAt;
  let lastSignature = '';
  let lastExternalActivitySequence = await getActivitySequence();
  let observedStage = false;

  while (now() - startedAt <= hardTimeoutMs) {
    const error = await getError();
    if (error) throw new Error(`${label} failed: ${error}`);
    if (await completed()) return;

    const externalActivitySequence = await getActivitySequence();
    if (externalActivitySequence !== lastExternalActivitySequence) {
      lastExternalActivitySequence = externalActivitySequence;
      lastActivityAt = now();
    }

    const progress = await readGenerationProgress(page);
    if (progress && (!expectedStage || progress.stage === expectedStage)) {
      observedStage = true;
      const signature = [progress.substage, progress.completed, progress.total, progress.currentItem, progress.activitySequence, progress.progress].join('|');
      if (signature !== lastSignature) {
        lastSignature = signature;
        lastActivityAt = now();
        onProgress(progress);
      }
    } else if (observedStage) {
      throw new Error(`${label} stopped before reaching its completed state.`);
    }

    if (now() - lastActivityAt > inactivityTimeoutMs) {
      throw new Error(`${label} made no observable progress for ${Math.round(inactivityTimeoutMs / 1000)} seconds. Last progress: ${lastSignature || 'none'}.`);
    }
    await sleepFn(pollIntervalMs);
  }

  throw new Error(`${label} exceeded the ${Math.round(hardTimeoutMs / 1000)}-second hard safety limit.`);
}