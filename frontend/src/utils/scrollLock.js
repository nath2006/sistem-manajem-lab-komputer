const locks = new WeakMap();

export function acquireBodyScrollLock(body = globalThis.document?.body) {
  if (!body) return () => {};
  let state = locks.get(body);
  if (!state) {
    state = { count: 0, previousOverflow: body.style.overflow };
    locks.set(body, state);
  }
  state.count += 1;
  body.style.overflow = 'hidden';
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.count -= 1;
    if (state.count === 0) {
      body.style.overflow = state.previousOverflow;
      locks.delete(body);
    }
  };
}
