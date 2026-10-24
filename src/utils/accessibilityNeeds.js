// The accessibility needs a Home Affairs officer can record for a citizen.
export const NEED_OPTIONS = [
  { key: 'visual',    label: 'Visual impairment (blind or low vision)' },
  { key: 'hearing',   label: 'Hearing impairment (deaf or hard of hearing)' },
  { key: 'hands',     label: 'Cannot use hands to operate a mouse, keyboard or touchscreen' },
  { key: 'mobility',  label: 'Limited movement or mobility' },
  { key: 'cognitive', label: 'Reading, learning or memory difficulty' },
  { key: 'elderly',   label: 'Elderly or limited digital skills' },
];

export function needLabel(key) {
  return NEED_OPTIONS.find((option) => option.key === key)?.label || key;
}

// Turns the recorded needs into interface adaptations.
// The citizen never has to switch these on: the system applies them at login.
export function getAdaptations(needs = []) {
  const has = (key) => needs.includes(key);
  return {
    largeText: has('visual') || has('elderly'),
    highContrast: has('visual'),
    largeTargets: has('hands') || has('mobility') || has('elderly'),
    voiceProminent: has('hands') || has('mobility'),
    visualAlerts: has('hearing'),
    simpleGuidance: has('cognitive') || has('elderly'),
  };
}

// Plain-language list of what the system changed, shown on the citizen dashboard.
export function describeAdaptations(needs = []) {
  const a = getAdaptations(needs);
  const lines = [];
  if (a.largeText) lines.push('Larger text');
  if (a.highContrast) lines.push('High-contrast colours');
  if (a.largeTargets) lines.push('Larger buttons');
  if (needs.some((n) => ['visual', 'hands', 'mobility'].includes(n))) lines.push('Log in by saying a phrase instead of typing a password');
  if (a.visualAlerts) lines.push('New notifications shown as a visible banner');
  if (a.simpleGuidance) lines.push('Simple step-by-step guidance');
  return lines;
}
