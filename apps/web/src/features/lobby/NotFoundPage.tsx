import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { EmptyState } from '../../ui/states';

export function NotFoundPage() {
  const { t } = useI18n();

  return (
    <EmptyState
      title={t('notFound.title')}
      body={t('notFound.body')}
      action={
        <Link to="/" className="btn btn-primary">
          {t('notFound.home')}
        </Link>
      }
    />
  );
}

/** Route error element: a crash inside a page keeps the header and says what to do, instead of a blank screen. */
export function PageError() {
  const { t } = useI18n();

  return (
    <EmptyState
      title={t('pageError.title')}
      body={t('pageError.body')}
      action={
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {t('pageError.reload')}
        </button>
      }
    />
  );
}
