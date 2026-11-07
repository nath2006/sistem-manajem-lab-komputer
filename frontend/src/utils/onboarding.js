export const ONBOARDING_VERSION = 2;
export const ONBOARDING_ROLES = [
  'Admin',
  'Guru',
  'Kepala Lab',
  'Koordinator Lab',
  'Teknisi',
];

export function getOnboardingKey(state) {
  if (
    !state?.isAuthenticated ||
    state.isLoading ||
    !ONBOARDING_ROLES.includes(state.role)
  )
    return null;
  const id = state.userId;
  if (
    !(
      (typeof id === 'number' && Number.isFinite(id) && id > 0) ||
      (typeof id === 'string' && id.trim())
    )
  )
    return null;
  return `lab:onboarding:v${ONBOARDING_VERSION}:${encodeURIComponent(String(id))}:${encodeURIComponent(state.role)}`;
}

export function isOnboardingComplete(key, storage) {
  if (!key) return false;
  try {
    const value = (storage ?? globalThis.localStorage)?.getItem(key);
    return value === 'skip' || value === 'done';
  } catch {
    return false;
  }
}

export function completeOnboarding(key, action, storage) {
  if (!key || !['skip', 'done'].includes(action)) return false;
  try {
    const target = storage ?? globalThis.localStorage;
    if (!target) return false;
    target.setItem(key, action);
    return true;
  } catch {
    return false;
  }
}
