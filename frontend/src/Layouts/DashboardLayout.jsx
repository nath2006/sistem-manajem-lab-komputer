import React, { useContext, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../Context/AuthContext';
import Onboarding from '../Components/Onboarding/Onboarding';
import { getOnboardingKey } from '../utils/onboarding';
import { DashboardShell } from './Dashboard';
import { DashboardContext } from '../Context/DashboardContext';
import RouteBoundary from '../Components/RouteBoundary';

export default function DashboardLayout() {
  const { state } = useContext(AuthContext);
  const onboardingRef = useRef(null);
  const identity = getOnboardingKey(state);
  const [title, setTitle] = useState('Dashboard');
  const context = useMemo(() => ({ setTitle }), []);
  return (
    <DashboardShell title={title} onReplayOnboarding={identity ? () => onboardingRef.current?.replay() : undefined}>
      {identity && <Onboarding key={identity} ref={onboardingRef} identity={identity} role={state.role} />}
      <DashboardContext.Provider value={context}>
        <RouteBoundary />
      </DashboardContext.Provider>
    </DashboardShell>
  );
}
