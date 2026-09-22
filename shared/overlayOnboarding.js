// Keep legacy step IDs so saved detailed setups continue at the same point.
export const QUICK_SETUP_STEPS = Object.freeze([0, 5, 6]);
export const DETAILED_SETUP_STEPS = Object.freeze([0, 1, 2, 3, 4, 5, 6]);
export function setupNavigation(setup = {}) {
  const steps = setup.quickSetup === true ? QUICK_SETUP_STEPS : DETAILED_SETUP_STEPS;
  const requested = Math.max(0, Math.min(6, Number(setup.currentStep) || 0));
  const step = steps.includes(requested) ? requested : steps.find(value => value >= requested);
  const index = steps.indexOf(step);
  return { steps, step, index, next: steps[Math.min(index + 1, steps.length - 1)], previous: steps[Math.max(index - 1, 0)] };
}

// A tour is an explicit user action. Saved in_progress flags from older tours
// must never navigate users away from the page they chose after reload.
export function shouldStartTutorial(panel) {
  return panel === "tutorial";
}
