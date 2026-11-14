import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** One native button/link child; no wrapper or extra tab stop. */
export default function Tooltip({ content, children, disabled = false, placement = 'right' }) {
  const child = React.Children.only(children);
  const id = useId();
  const trigger = useRef(null);
  const bubble = useRef(null);
  const timer = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const visible = open && !disabled && Boolean(content);
  const close = () => { clearTimeout(timer.current); setOpen(false); };
  const show = () => { clearTimeout(timer.current); if (!disabled) setOpen(true); };
  const leave = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (document.activeElement !== trigger.current) setOpen(false);
    }, 100);
  };
  useLayoutEffect(() => {
    if (!visible) return;
    const update = () => {
      const rect = trigger.current?.getBoundingClientRect();
      const tip = bubble.current?.getBoundingClientRect();
      if (!rect || !tip) return;
      let left = placement === 'right' ? rect.right + 10 : rect.left + (rect.width - tip.width) / 2;
      let top = placement === 'right' ? rect.top + (rect.height - tip.height) / 2 : rect.bottom + 8;
      if (left + tip.width > window.innerWidth - 8) left = rect.left - tip.width - 10;
      left = Math.max(8, Math.min(left, window.innerWidth - tip.width - 8));
      top = Math.max(8, Math.min(top, window.innerHeight - tip.height - 8));
      setPosition({ left, top });
    };
    update();
    window.addEventListener('resize', update);
    // Capture includes a scrolling sidebar, not only document scrolling.
    window.addEventListener('scroll', close, true);
    const escape = event => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', close);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', close, true);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', close);
    };
  }, [visible, placement]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const combine = (name, handler) => event => { child.props[name]?.(event); handler(event); };
  return <>
    {React.cloneElement(child, {
      ref: node => {
        trigger.current = node;
        const ref = child.props.ref;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      title: visible ? undefined : child.props.title,
      'aria-describedby': visible ? [child.props['aria-describedby'], id].filter(Boolean).join(' ') : child.props['aria-describedby'],
      onMouseEnter: combine('onMouseEnter', show),
      onMouseLeave: combine('onMouseLeave', leave),
      onFocus: combine('onFocus', show),
      onBlur: combine('onBlur', close),
      onClick: combine('onClick', close),
    })}
    {visible && createPortal(<div ref={bubble} id={id} role="tooltip" onMouseEnter={show} onMouseLeave={leave}
      style={{ position: 'fixed', ...position, zIndex: 10000 }}
      className="max-w-[min(18rem,calc(100vw-1rem))] break-words rounded-lg border border-gray-200 bg-gray-900 px-3 py-2 text-sm font-medium leading-relaxed text-white shadow-lg">{content}</div>, document.body)}
  </>;
}
