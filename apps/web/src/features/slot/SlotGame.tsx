import type { SlotMachine } from '@lobby/contracts';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../lib/store';
import { AsyncSection } from '../../ui/AsyncSection';
import { ErrorState } from '../../ui/states';
import { useWalletView, walletQuery } from '../wallet/wallet-data';
import { Reels } from './Reels';
import styles from './slot.module.css';
import { finishSpin, slot, slotQuery, useSpin, useSpinPaused } from './slot-data';
import type { SlotState } from './slot-logic';
import { SymbolArt } from './SymbolArt';

export function SlotGame() {
  const { t } = useI18n();

  return (
    <section className={styles.slot} aria-labelledby="slot-title">
      <div className={styles.head}>
        <h2 id="slot-title" className={styles.title}>
          {t('slot.title')}
        </h2>
        <p className={styles.caption}>{t('slot.caption')}</p>
      </div>
      <AsyncSection skeleton={<SlotSkeleton />} error={(retry) => <ErrorState title={t('slot.error')} onRetry={retry} />}>
        <SlotBody />
      </AsyncSection>
    </section>
  );
}

function SlotBody() {
  const { t, money } = useI18n();
  const { data: machine } = useSuspenseQuery(slotQuery);
  const wallet = useWalletView(useQuery(walletQuery).data);
  const state = useStore(slot);
  const paused = useSpinPaused();
  const spin = useSpin();
  const [bet, setBet] = useState(machine.betsMinor[1] ?? machine.betsMinor[0] ?? 0);

  const busy = state.phase !== 'idle';
  const short = wallet !== undefined && wallet.balanceMinor < bet;
  const won = state.phase === 'idle' && state.last !== undefined && 'spin' in state.last && state.last.spin.winMinor > 0;

  const start = () => {
    if (!short) spin(bet);
  };

  const landed = () => {
    if (state.phase === 'stopping') finishSpin(state.key);
  };

  return (
    <div className={styles.body}>
      <div className={styles.cabinet}>
        <Reels reels={machine.reels} phase={state.phase} stops={state.stops} win={won} onLanded={landed} />
      </div>

      <div className={styles.controls}>
        <fieldset className={styles.bets}>
          <legend className={styles.label}>{t('slot.bet')}</legend>
          <div className={styles.betOptions}>
            {machine.betsMinor.map((value) => (
              <label key={value} className={styles.bet}>
                <input type="radio" name="slot-bet" checked={value === bet} onChange={() => setBet(value)} />
                <span className="tabular">{money(value, machine.currency)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* aria-disabled, not disabled: a disabled button drops keyboard focus in the middle of a spin. */}
        <button
          type="button"
          className={`btn btn-primary ${styles.spin}`}
          aria-disabled={busy || short}
          aria-describedby={short ? 'slot-short' : undefined}
          onClick={start}
        >
          {t('slot.spin', { bet: money(bet, machine.currency) })}
        </button>
        {short && (
          <p id="slot-short" className={styles.hint}>
            {t('slot.short')}
          </p>
        )}

        <p className={styles.status} role="status" data-win={won}>
          {statusText(state, machine, paused, t, money)}
        </p>

        <Paytable machine={machine} />
      </div>
    </div>
  );
}

type I18n = ReturnType<typeof useI18n>;

function statusText(state: SlotState, machine: SlotMachine, paused: boolean, t: I18n['t'], money: I18n['money']) {
  if (state.phase === 'spinning' && paused) return t('slot.waiting');
  if (state.phase !== 'idle') return t('slot.spinning');
  if (!state.last) return t('slot.ready');
  if ('failure' in state.last) return t(`slot.failure.${state.last.failure}`);

  const { stops, winMinor } = state.last.spin;
  const symbols = stops
    .map((stop, i) => machine.reels[i]?.[stop])
    .flatMap((symbol) => (symbol ? [t(`slot.symbol.${symbol}`)] : []))
    .join(', ');

  return winMinor > 0 ? t('slot.won', { symbols, amount: money(winMinor, machine.currency) }) : t('slot.lost', { symbols });
}

function Paytable({ machine }: { machine: SlotMachine }) {
  const { t, percent } = useI18n();

  return (
    <details className={styles.paytable}>
      <summary>{t('slot.paytable', { rtp: percent(machine.rtp) })}</summary>
      <table>
        <thead>
          <tr>
            <th scope="col">{t('slot.combination')}</th>
            <th scope="col">{t('slot.pays')}</th>
          </tr>
        </thead>
        <tbody>
          {machine.paytable.map(({ symbol, count, multiplier }) => (
            <tr key={`${symbol}-${count}`}>
              <td>
                <span className={styles.combo} aria-hidden="true">
                  {Array.from({ length: count }, (_, i) => (
                    <SymbolArt key={i} symbol={symbol} />
                  ))}
                </span>
                <span className="sr-only">{t('slot.combo', { count, symbol: t(`slot.symbol.${symbol}`) })}</span>
              </td>
              <td className="tabular">{t('slot.multiplier', { value: multiplier })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.rules}>{t('slot.rules')}</p>
    </details>
  );
}

function SlotSkeleton() {
  return (
    <div className={styles.body} aria-hidden="true">
      <span className={`skeleton ${styles.skeletonReels}`} />
      <div className={styles.controls}>
        <span className="skeleton" style={{ blockSize: 40 }} />
        <span className="skeleton" style={{ blockSize: 44, borderRadius: 999 }} />
        <span className="skeleton" style={{ blockSize: 18, inlineSize: '60%' }} />
      </div>
    </div>
  );
}
