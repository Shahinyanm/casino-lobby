import type { CurrencyCode } from '@lobby/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { closeDeposit } from '../../app/ui-store';
import { useI18n } from '../../i18n/I18nProvider';
import { randomId } from '../../lib/random-id';
import { Icon } from '../../ui/Icon';
import styles from './deposit.module.css';
import { ratesQuery, useDeposit } from './wallet-data';
import { MAX_DEPOSIT_MINOR, MIN_DEPOSIT_MINOR, parseAmount, quoteCredit } from './wallet-logic';

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'ILS'];
const WALLET_CURRENCY: CurrencyCode = 'USD';

export default function DepositDialog() {
  const { t, money, number } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const amountId = useId();
  const currencyId = useId();
  const errorId = useId();

  const [text, setText] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(WALLET_CURRENCY);
  const [touched, setTouched] = useState(false);
  // One key per opened dialog: a double submit reaches the server as a single deposit.
  const [idempotencyKey] = useState(randomId);

  const rates = useQuery(ratesQuery);
  const deposit = useDeposit();
  const parsed = parseAmount(text);
  const credit = parsed.ok && rates.data ? quoteCredit(parsed.minor, currency, rates.data) : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    amountRef.current?.focus();

    return () => {
      // Browsers restore focus on close(); unmounting an open dialog does not, so do it ourselves.
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  const close = () => dialogRef.current?.close();

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!parsed.ok || credit === null || deposit.isPending) {
      amountRef.current?.focus();
      return;
    }

    deposit.mutate({
      idempotencyKey,
      amountMinor: parsed.minor,
      currency,
      creditMinor: credit,
      startedAt: new Date().toISOString(),
    });
    close();
  };

  const errorText = !parsed.ok && touched ? amountError(parsed.error) : null;

  function amountError(error: 'required' | 'format' | 'min' | 'max') {
    if (error === 'min') return t('deposit.errorMin', { amount: money(MIN_DEPOSIT_MINOR, currency) });
    if (error === 'max') return t('deposit.errorMax', { amount: money(MAX_DEPOSIT_MINOR, currency) });
    return t(error === 'required' ? 'deposit.errorRequired' : 'deposit.errorFormat');
  }

  return (
    // Backdrop click closes, like Esc does natively; the dialog element itself is not a control.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={closeDeposit}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (e.target === e.currentTarget) close();
      }}
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.head}>
          <h2 id={titleId}>{t('deposit.title')}</h2>
          <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={close}>
            <Icon name="close" />
          </button>
        </div>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label htmlFor={amountId}>{t('deposit.amount')}</label>
            <input
              ref={amountRef}
              id={amountId}
              className="field"
              inputMode="decimal"
              autoComplete="transaction-amount"
              value={text}
              aria-invalid={errorText ? true : undefined}
              aria-describedby={errorText ? errorId : undefined}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => text && setTouched(true)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={currencyId}>{t('deposit.currency')}</label>
            <select
              id={currencyId}
              className="field"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorText && (
          <p id={errorId} className={styles.error} role="alert">
            {errorText}
          </p>
        )}

        <div className={styles.quote} aria-live="polite">
          {rates.isPending ? (
            <span className={`skeleton ${styles.quoteSkeleton}`} aria-label={t('deposit.ratesLoading')} role="img" />
          ) : rates.isError ? (
            <p className={styles.error}>
              {t('deposit.ratesError')}
              <button type="button" className={styles.inlineButton} onClick={() => void rates.refetch()}>
                {t('common.retry')}
              </button>
            </p>
          ) : (
            <>
              <p className={styles.quoteLine}>
                <span>{t('deposit.youGet')}</span>
                <strong className="tabular">{money(credit ?? 0, WALLET_CURRENCY)}</strong>
              </p>
              {currency !== WALLET_CURRENCY && (
                <p className={styles.rate}>
                  {t('deposit.rate', { from: currency, rate: number(rates.data.rates[currency]), to: WALLET_CURRENCY })}
                </p>
              )}
            </>
          )}
        </div>

        <p className={styles.hint}>{t('deposit.hint')}</p>

        <div className={styles.actions}>
          <button type="button" className="btn btn-quiet" onClick={close}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={rates.isPending || rates.isError}>
            {parsed.ok ? t('deposit.confirm', { amount: money(parsed.minor, currency) }) : t('deposit.confirmEmpty')}
          </button>
        </div>
      </form>
    </dialog>
  );
}
