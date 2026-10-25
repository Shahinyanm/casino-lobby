import { useEffect, useLayoutEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { prefersReducedMotion } from '../lib/hooks';

interface Props {
  minor: number;
  currency: string;
  durationMs: number;
  easing?: 'linear' | 'out';
  className?: string;
}

/**
 * Counts to `minor` on requestAnimationFrame, writing straight to the text node: 60 fps of digits
 * without 60 React renders a second. rAF stops in a hidden tab; on return the tween is past its end
 * and snaps. A new value mid-flight continues from the number on screen, so it never jumps back.
 * The element is aria-hidden: screen readers get the settled value from the caller instead.
 */
export function AnimatedMoney({ minor, currency, durationMs, easing = 'out', className }: Props) {
  const { money } = useI18n();
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(minor);

  useLayoutEffect(() => {
    if (ref.current) ref.current.textContent = money(shown.current, currency);
  }, [money, currency]);

  useEffect(() => {
    const element = ref.current;
    const from = shown.current;
    if (!element) return;

    if (from === minor || prefersReducedMotion()) {
      shown.current = minor;
      element.textContent = money(minor, currency);
      return;
    }

    const start = performance.now();
    let frame = requestAnimationFrame(function tick(time) {
      const progress = Math.min(1, (time - start) / durationMs);
      const eased = easing === 'linear' ? progress : 1 - (1 - progress) ** 3;

      shown.current = Math.round(from + (minor - from) * eased);
      element.textContent = money(shown.current, currency);
      if (progress < 1) frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [minor, currency, durationMs, easing, money]);

  return <span ref={ref} className={`tabular ${className ?? ''}`} aria-hidden="true" />;
}
