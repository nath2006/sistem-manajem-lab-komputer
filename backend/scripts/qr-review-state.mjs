// Node reports signal termination via signalCode, not numeric exitCode (also on Windows).
export const processExited = (child) =>
  child.exitCode !== null || child.signalCode !== null;
