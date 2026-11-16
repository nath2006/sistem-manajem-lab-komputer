import { getOnboarding, claimOnboarding } from '../services/onboardingService.js';
export function createOnboardingController(db) {
  const handle = fn => async (req, res) => {
    try { res.json({ data: await fn(db, req.user) }); }
    catch (error) {
      const known = [401, 404, 503].includes(error.status);
      res.status(known ? error.status : 500).json({
        message: known ? error.message : 'Gagal menyimpan status panduan.',
        ...(error.code === 'ONBOARDING_SCHEMA_REQUIRED' ? { code: error.code } : {}),
      });
    }
  };
  return { get: handle(getOnboarding), claim: handle(claimOnboarding) };
}
