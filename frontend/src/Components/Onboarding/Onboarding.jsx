import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useSettings } from '../../Context/SettingsContext';
import { isOnboardingComplete } from '../../utils/onboarding';
import { startTour } from './driverTour';

const Onboarding = forwardRef(function Onboarding({ identity, role }, ref) {
  const { settings } = useSettings();
  const schoolName = useRef(settings.school_name);
  schoolName.current = settings.school_name;
  const [replay, setReplay] = useState(0);
  useImperativeHandle(ref, () => ({ replay: () => setReplay(value => value + 1) }), []);
  useEffect(() => {
    if (!identity || (!replay && isOnboardingComplete(identity))) return;
    // Defer acquisition so StrictMode setup/cleanup/setup creates only one tour.
    let stop;
    const frame = requestAnimationFrame(() => {
      stop = startTour({ identity, role, schoolName: schoolName.current });
    });
    return () => { cancelAnimationFrame(frame); stop?.(); };
  }, [identity, role, replay]);
  return null;
});
export default Onboarding;

