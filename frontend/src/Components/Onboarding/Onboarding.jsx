import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useSettings } from '../../Context/SettingsContext';
import { hasLegacyOnboardingCompletion } from '../../utils/onboarding';
import { get, post } from '../../utils/api';
import { startTour } from './driverTour';

const Onboarding = forwardRef(function Onboarding({ identity, role, token }, ref) {
  const { settings } = useSettings();
  const schoolName = useRef(settings.school_name);
  schoolName.current = settings.school_name;
  const [replay, setReplay] = useState(0);
  // Retain single flight results through StrictMode cleanup without sharing
  // request ownership with another account role or authentication session
  const owner = useRef();
  if (!owner.current || owner.current.identity !== identity || owner.current.role !== role || owner.current.token !== token) {
    owner.current = { identity, role, token, replayBase: replay };
  }
  const session = owner.current;
  useImperativeHandle(ref, () => ({ replay: () => setReplay(value => value + 1) }), []);
  useEffect(() => {
    if (!identity) return;
    let active = true;
    let stop;
    const current = () => active && owner.current === session;
    const manual = replay > session.replayBase;
    const claim = () => {
      if (!session.claim) session.claim = post('/onboarding/claim').then(response => {
        const data = response?.data?.data;
        if (typeof data?.should_show !== 'boolean') throw new Error('Invalid onboarding claim');
        return data.should_show;
      });
      return session.claim;
    };
    const run = async () => {
      try {
        if (!manual) {
          if (!session.status) session.status = get('/onboarding').then(response => {
            if (typeof response?.data?.seen !== 'boolean') throw new Error('Invalid onboarding status');
            return response.data.seen;
          });
          const seen = await session.status;
          if (!current() || seen) return;
          if (hasLegacyOnboardingCompletion(identity)) { await claim(); return; }
        }
        if (!current()) return;
        stop = startTour({ identity, role, schoolName: schoolName.current,
          isCurrent: current,
          authorize: async () => {
            if (!current()) return false;
            if (manual) return true;
            const winner = await claim();
            return current() && winner;
          },
        });
      } catch {
        // Fail closed without fabricating completion or blocking profile replay
      }
    };
    void run();
    return () => { active = false; stop?.(); };
  }, [identity, role, token, replay, session]);
  return null;
});
export default Onboarding;

