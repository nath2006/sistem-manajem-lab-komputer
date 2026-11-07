import { driver } from 'driver.js';
import { ROLE_STEPS } from './onboardingData.js';
import { completeOnboarding } from '../../utils/onboarding.js';
import { acquireBodyScrollLock } from '../../utils/scrollLock.js';

let activeStop;
export function visibleTarget(element) {
  if (!element || element.closest('[inert], [aria-hidden="true"]')) return false;
  const style = getComputedStyle(element);
  return element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none';
}

export function startTour({ identity, role, schoolName }) {
  activeStop?.();
  const focus = document.activeElement;
  const scroll = [window.scrollX, window.scrollY];
  const scrollers = [...document.querySelectorAll('[data-tour-scroll]')].map(el => [el, el.scrollTop]);
  let stopped = false;
  let instance;
  let frame;
  let releaseScroll;
  const request = { sidebar: false };
  const prepare = sidebar => {
    request.sidebar = sidebar;
    document.dispatchEvent(new CustomEvent('lab:tour-shell', { detail: request }));
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    instance?.destroy();
    document.dispatchEvent(new CustomEvent('lab:tour-shell', { detail: null }));
    releaseScroll?.();
    for (const [el, top] of scrollers) if (el.isConnected) el.scrollTop = top;
    window.scrollTo(...scroll);
    const returnFocus = focus?.isConnected && focus.tagName !== 'BODY' ? focus : document.querySelector('[data-tour="profile"]');
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    if (activeStop === stop) activeStop = undefined;
  };
  activeStop = stop;
  const finish = action => { completeOnboarding(identity, action); stop(); };
  const definitions = ROLE_STEPS[role] || [];
  prepare(false);
  // Wait for React to commit drawer state before querying or measuring targets.
  const defer = callback => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => { if (!stopped) callback(); }); });
  };
  const move = index => {
    if (index >= definitions.length) return finish('done');
    if (index < 0) return;
    prepare(definitions[index].element.includes('data-tour-path'));
    defer(() => {
      const element = document.querySelector(definitions[index].element);
      if (!visibleTarget(element)) { stop(); return; }
      element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      instance.moveTo(index);
    });
  };
  defer(() => {
    const first = document.querySelector(definitions[0]?.element);
    if (!visibleTarget(first)) return stop();
    releaseScroll = acquireBodyScrollLock();
    instance = driver({
      animate: false, smoothScroll: false, allowClose: true,
      overlayClickBehavior: 'none', disableActiveInteraction: true,
      allowKeyboardControl: false, stagePadding: 5, stageRadius: 12,
      popoverClass: 'lab-tour', showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: 'Berikutnya', prevBtnText: 'Kembali', doneBtnText: 'Selesai',
      closeBtnLabel: 'Tutup panduan (Escape)',
      steps: definitions.map(step => ({ element: step.element, popover: { title: 'Panduan awal', description: 'Panduan', side: 'bottom', align: 'start' } })),
      onNextClick: () => move(instance.getActiveIndex() + 1),
      onPrevClick: () => move(instance.getActiveIndex() - 1),
      onDoneClick: () => finish('done'),
      onCloseClick: stop,
      onDestroyed: stop,
      onPopoverRender: (popover, { index }) => {
        const step = definitions[index];
        // Driver strings are HTML. All school/role text enters via textContent only.
        popover.title.textContent = index === 0 ? `Selamat datang · ${schoolName || 'Sekolah'}` : step.title;
        popover.description.textContent = step.description;
        popover.wrapper.setAttribute('aria-label', 'Panduan awal');
        const skip = document.createElement('button');
        skip.type = 'button'; skip.className = 'lab-tour-skip'; skip.textContent = 'Lewati';
        skip.onclick = () => finish('skip');
        popover.footer.prepend(skip);
        popover.nextButton.focus({ preventScroll: true });
        popover.wrapper.onkeydown = event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); stop(); }
          if (event.key !== 'Tab') return;
          // Driver also traps Tab on window; do not let two traps advance focus.
          event.stopPropagation();
          const buttons = [...popover.wrapper.querySelectorAll('button')].filter(el => !el.disabled && el.getClientRects().length);
          const first = buttons[0], last = buttons.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
      },
    });
    instance.drive();
  });
  return stop;
}
