import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { openDeposit } from '../../app/ui-store';
import { useI18n } from '../../i18n/I18nProvider';
import { useNow } from '../../lib/hooks';
import { AnimatedMoney } from '../../ui/AnimatedMoney';
import { AsyncSection } from '../../ui/AsyncSection';
import { Icon } from '../../ui/Icon';
import { ErrorState } from '../../ui/states';
import styles from './wallet.module.css';
import { useWalletView, walletQuery } from './wallet-data';

const RECENT_ROWS = 5;

export function WalletCard() {
  const { t } = useI18n();

  return (
    <section className={styles.card} aria-labelledby="wallet-title">
      <h2 id="wallet-title" className={styles.cardTitle}>
        {t('wallet.title')}
      </h2>
      <AsyncSection
        skeleton={<WalletSkeleton />}
        error={(retry) => <WalletError retry={retry} />}
      >
        <WalletBody />
      </AsyncSection>
    </section>
  );
}

/**
 * A failed read is retried in the background (see walletQuery), and the card comes back on its own once one
 * works. A crash while drawing data that did load would only crash again, so that one waits for Try again.
 */
function WalletError({ retry }: { retry: () => void }) {
  const { t } = useI18n();
  const { data } = useQuery(walletQuery);
  const [readFailed] = useState(data === undefined);

  useEffect(() => {
    if (readFailed && data !== undefined) retry();
  }, [readFailed, data, retry]);

  return <ErrorState title={t('wallet.error')} onRetry={retry} />;
}

function WalletBody() {
  const { t, money, relative } = useI18n();
  const { data } = useSuspenseQuery(walletQuery);
  const wallet = useWalletView(data);
  const now = useNow();
  if (!wallet) return null;

  return (
    <>
      <p className={styles.balance}>
        <span className={styles.balanceLabel}>{t('wallet.balanceIn', { currency: wallet.currency })}</span>
        <AnimatedMoney minor={wallet.balanceMinor} currency={wallet.currency} durationMs={700} className={styles.balanceValue} />
        <span className="sr-only">{money(wallet.balanceMinor, wallet.currency)}</span>
      </p>
      <button type="button" className="btn btn-primary" onClick={openDeposit}>
        <Icon name="plus" />
        {t('wallet.deposit')}
      </button>

      <h3 className={styles.recentTitle}>{t('wallet.recent')}</h3>
      {wallet.transactions.length === 0 ? (
        <p className={styles.empty}>{t('wallet.empty')}</p>
      ) : (
        <ol className={styles.rows}>
          {wallet.transactions.slice(0, RECENT_ROWS).map((tx) => {
            const credit = tx.type !== 'bet';
            return (
              <li key={tx.id} className={styles.row} data-pending={tx.pending ?? false}>
                <span className={styles.rowType}>{t(`tx.${tx.type}`)}</span>
                <span className={styles.rowAmount} data-credit={credit}>
                  {money(credit ? tx.amountMinor : -tx.amountMinor, tx.currency, true)}
                </span>
                <span className={styles.rowMeta}>
                  {tx.pending ? t('wallet.processing') : relative(tx.createdAt, Math.max(now, Date.parse(tx.createdAt)))}
                </span>
                {tx.source && (
                  <span className={styles.rowSource}>
                    {t('wallet.paid', { amount: money(tx.source.amountMinor, tx.source.currency) })}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

function WalletSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <span className="skeleton" style={{ blockSize: 40, inlineSize: '70%' }} />
      <span className="skeleton" style={{ blockSize: 44, borderRadius: 999 }} />
      {Array.from({ length: 3 }, (_, i) => (
        <span key={i} className="skeleton" style={{ blockSize: 18 }} />
      ))}
    </div>
  );
}
