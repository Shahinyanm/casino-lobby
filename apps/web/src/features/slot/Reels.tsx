import type { SlotSymbol } from '@lobby/contracts';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../lib/hooks';
import styles from './slot.module.css';
import { BRAKE_MS, brakeDistance, braked, mod, restOffset, spinDistance, type SlotState } from './slot-logic';
import { SymbolArt } from './SymbolArt';

const MIN_SPIN_MS = 500;
const STAGGER_MS = 250;

interface Motion {
  rest: number;
  spin?: { from: number; start: number };
  brake?: { from: number; start: number; distance: number; target: number };
}

function offsetAt({ rest, spin, brake }: Motion, now: number, length: number) {
  if (brake && now >= brake.start + BRAKE_MS) return brake.target;
  if (brake && now >= brake.start) return mod(brake.from - braked(brake.distance, (now - brake.start) / BRAKE_MS), length);
  if (spin) return mod(spin.from - spinDistance(now - spin.start), length);
  return rest;
}

function draw(strips: (HTMLDivElement | null)[], motions: Motion[], reels: SlotSymbol[][], now: number) {
  motions.forEach((motion, i) => {
    const strip = strips[i];
    if (!strip) return;

    strip.style.transform = `translate3d(0, calc(var(--cell) * ${-offsetAt(motion, now, reels[i]?.length ?? 1)}), 0)`;
    strip.dataset.fast = String(Boolean(motion.spin) && !(motion.brake && now > motion.brake.start + BRAKE_MS * 0.6));
  });
}

interface Props {
  reels: SlotSymbol[][];
  phase: SlotState['phase'];
  stops: number[];
  win: boolean;
  onLanded: () => void;
}

/** Moves the strips on requestAnimationFrame, writing transforms directly: no React render per frame. */
export function Reels({ reels, phase, stops, win, onLanded }: Props) {
  const strips = useRef<(HTMLDivElement | null)[]>([]);
  const motions = useRef<Motion[]>(reels.map((reel, i) => ({ rest: restOffset(stops[i] ?? 0, reel.length) })));
  const landed = useRef(onLanded);

  useLayoutEffect(() => {
    landed.current = onLanded;
  });

  useLayoutEffect(() => {
    draw(strips.current, motions.current, reels, performance.now());
  }, [reels]);

  useEffect(() => {
    const now = performance.now();

    if (phase === 'idle') {
      // Normally a no-op; it matters when the fallback timer finished the spin before the reels did.
      motions.current = reels.map((reel, i) => ({ rest: restOffset(stops[i] ?? 0, reel.length) }));
      draw(strips.current, motions.current, reels, now);
      return;
    }

    const length = (i: number) => reels[i]?.length ?? 1;

    if (phase === 'spinning') {
      if (prefersReducedMotion()) return;
      motions.current = motions.current.map((m, i) => ({ rest: m.rest, spin: { from: offsetAt(m, now, length(i)), start: now } }));
    } else {
      const targets = reels.map((reel, i) => restOffset(stops[i] ?? 0, reel.length));

      if (prefersReducedMotion()) {
        motions.current = targets.map((rest) => ({ rest }));
        draw(strips.current, motions.current, reels, now);
        landed.current();
        return;
      }

      // Reels land one by one, each braking from wherever its spin has carried it.
      motions.current = motions.current.map(({ rest, spin = { from: rest, start: now } }, i) => {
        const start = Math.max(now, spin.start + MIN_SPIN_MS) + i * STAGGER_MS;
        const from = mod(spin.from - spinDistance(start - spin.start), length(i));
        const target = targets[i] ?? rest;

        return { rest, spin, brake: { from, start, target, distance: brakeDistance(from, target, length(i)) } };
      });
    }

    let frame = requestAnimationFrame(function tick(time) {
      draw(strips.current, motions.current, reels, time);

      const done = motions.current.every((m) => m.brake && time >= m.brake.start + BRAKE_MS);
      if (!done) {
        frame = requestAnimationFrame(tick);
        return;
      }

      motions.current = motions.current.map((m) => ({ rest: m.brake?.target ?? m.rest }));
      draw(strips.current, motions.current, reels, time);
      landed.current();
    });

    return () => cancelAnimationFrame(frame);
  }, [phase, stops, reels]);

  return (
    <div className={styles.window} data-win={win} aria-hidden="true">
      {reels.map((reel, i) => (
        <div key={i} className={styles.reel}>
          <div
            ref={(element) => {
              strips.current[i] = element;
            }}
            className={styles.strip}
          >
            {/* Two extra cells, so the window never runs off the end of the strip. */}
            {reel.concat(reel.slice(0, 2)).map((symbol, k) => (
              <div key={k} className={styles.cell}>
                <SymbolArt symbol={symbol} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <span className={styles.payline} />
    </div>
  );
}
