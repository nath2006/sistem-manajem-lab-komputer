import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import apiClient from '../utils/api';
import { startPresence } from '../utils/presence';

const UNKNOWN = Object.freeze({ connected: false, ready: false, onlineUserIds: [] });
const PresenceContext = createContext(UNKNOWN);
// Keep the public context hook beside its provider, like SettingsContext.
// eslint-disable-next-line react-refresh/only-export-components
export const usePresence = () => useContext(PresenceContext);

export function PresenceProvider({ children }) {
  const { state } = useContext(AuthContext);
  // Opaque object ownership also invalidates a same-account token replacement.
  const owner = useMemo(() => ({ authenticated: state?.isAuthenticated, userId: state?.userId, token: state?.token }), [state?.isAuthenticated, state?.userId, state?.token]);
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    if (!state?.isAuthenticated || !state?.token || !state?.userId) return;
    let active = true;
    const stop = startPresence({
      token: state.token,
      baseURL: apiClient.defaults.baseURL || `${import.meta.env?.BASE_URL || '/'}api`,
      onState: value => { if (active) setSnapshot({ owner, value }); },
    });
    return () => { active = false; stop(); };
  }, [owner, state?.isAuthenticated, state?.token, state?.userId]);
  const value = snapshot?.owner === owner && state?.isAuthenticated ? snapshot.value : UNKNOWN;
  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}
