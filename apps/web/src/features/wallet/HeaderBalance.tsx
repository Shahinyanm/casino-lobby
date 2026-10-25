import { useQuery } from '@tanstack/react-query';
import { openDeposit } from '../../app/ui-store';
import { useI18n } from '../../i18n/I18nProvider';
import { AnimatedMoney } from '../../ui/AnimatedMoney';
import { Icon } from '../../ui/Icon';
import styles from './wallet.module.css';
import { useWalletView, walletQuery } from './wallet-data';

/** Non-suspending on purpose: the header must render instantly; the balance fills in when ready. */
export function HeaderBalance() {
  const { t, money } = useI18n();
  const { data, isError } = useQuery(walletQuery);
  const wallet = useWalletView(data);

  return (
    <div className={styles.headerBalance}>
      {wallet ? (
        <p className={styles.headerAmount}>
          <span className={styles.headerLabel}>{t('wallet.balance')}</span>
          <AnimatedMoney minor={wallet.balanceMinor} currency={wallet.currency} durationMs={700} />
          <span className="sr-only">{money(wallet.balanceMinor, wallet.currency)}</span>
        </p>
      ) : (
        !isError && <span className={`skeleton ${styles.headerSkeleton}`} aria-hidden="true" />
      )}
      <button type="button" className={`btn btn-primary ${styles.headerDeposit}`} onClick={openDeposit}>
        <Icon name="plus" />
        <span className={styles.headerDepositText}>{t('wallet.deposit')}</span>
      </button>
    </div>
  );
}
