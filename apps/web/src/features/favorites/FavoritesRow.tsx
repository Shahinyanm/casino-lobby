import type { Game } from '@lobby/contracts';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { Icon } from '../../ui/Icon';
import { catalogQuery } from '../catalog/queries';
import { FavoriteButton } from './FavoriteButton';
import { favorites, moveFavorite, useFavorites } from './favorites-store';
import styles from './favorites.module.css';

/**
 * Reorder by dragging the handle (pointer events: mouse, touch and pen alike) or from the keyboard:
 * focus a handle and press Alt + arrow. Every move is announced to screen readers.
 * Native HTML5 drag and drop was skipped on purpose: it does not fire on touch screens.
 */
export function FavoritesRow() {
  const { t } = useI18n();
  const ids = useFavorites();
  const { data, isError } = useQuery(catalogQuery);
  const hintId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const games = useMemo(() => {
    const byId = new Map(data?.games.map((g) => [g.id, g]));
    return ids.map((id) => byId.get(id)).filter((g): g is Game => g !== undefined);
  }, [data, ids]);

  const announce = useCallback(
    (id: string) => {
      const known = new Set(data?.games.map((g) => g.id));
      const list = favorites.get().filter((favorite) => known.has(favorite));
      const title = data?.games.find((g) => g.id === id)?.title ?? id;
      setAnnouncement(t('favorites.moved', { title, position: list.indexOf(id) + 1, total: list.length }));
    },
    [data, t],
  );

  // Listeners on window, not pointer capture on the handle: React may re-insert the dragged
  // node while reordering, and a removed node silently loses its capture.
  useEffect(() => {
    if (!draggingId) return;

    const move = (event: globalThis.PointerEvent) => {
      const list = listRef.current;
      if (!list) return;

      // Nearest item centre to the pointer: visual geometry, so RTL needs no special case.
      let target = 0;
      let best = Infinity;
      [...list.children].forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const distance = Math.abs(event.clientX - (rect.left + rect.width / 2));
        if (distance < best) {
          best = distance;
          target = index;
        }
      });

      const targetId = (list.children[target] as HTMLElement | undefined)?.dataset.id;
      if (targetId && targetId !== draggingId) moveFavorite(draggingId, targetId);
    };

    const end = () => {
      setDraggingId(null);
      announce(draggingId);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [draggingId, announce]);

  const onKeyDown = (event: KeyboardEvent, id: string) => {
    if (!event.altKey) return;

    const rtl = document.documentElement.dir === 'rtl';
    const steps: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1 };
    const step = steps[event.key];
    if (!step) return;

    event.preventDefault();
    // Neighbours on screen, not in storage: a saved id the catalog no longer has is not shown.
    const neighbour = games[games.findIndex((g) => g.id === id) + step];
    if (!neighbour) return;

    // Commit the reorder now so the handle can be refocused: moving a node can drop its focus.
    flushSync(() => {
      moveFavorite(id, neighbour.id);
    });
    handles.current.get(id)?.focus();
    announce(id);
  };

  const onPointerDown = (event: PointerEvent, id: string) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    setDraggingId(id);
  };

  return (
    <section className={styles.section} aria-labelledby="favorites-title">
      <h2 id="favorites-title">{t('favorites.title')}</h2>
      {!data && ids.length > 0 ? (
        // The catalog section below explains a failed load and offers Try again.
        isError ? null : <FavoritesSkeleton count={ids.length} />
      ) : games.length === 0 ? (
        <p className={styles.empty}>{t('favorites.empty')}</p>
      ) : (
        <>
          <p id={hintId} className={styles.hint}>
            {t('favorites.hint')}
          </p>
          <ol ref={listRef} className={styles.row}>
            {games.map((game) => (
              <li key={game.id} className={styles.item} data-id={game.id} data-dragging={draggingId === game.id}>
                <img src={game.thumbnailUrl} alt="" width={96} height={72} className={styles.thumb} />
                <Link to={`/games/${game.id}`} className={styles.title}>
                  {game.title}
                </Link>
                <div className={styles.controls}>
                  <button
                    ref={(node) => {
                      if (node) handles.current.set(game.id, node);
                      else handles.current.delete(game.id);
                    }}
                    type="button"
                    className={styles.handle}
                    aria-label={t('favorites.handle', { title: game.title })}
                    aria-describedby={hintId}
                    onKeyDown={(e) => onKeyDown(e, game.id)}
                    onPointerDown={(e) => onPointerDown(e, game.id)}
                  >
                    <Icon name="grip" />
                  </button>
                  <FavoriteButton gameId={game.id} title={game.title} className={styles.remove} />
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
      <p className="sr-only" role="status">
        {announcement}
      </p>
    </section>
  );
}

function FavoritesSkeleton({ count }: { count: number }) {
  return (
    <ol className={styles.row} aria-hidden="true">
      {Array.from({ length: Math.min(count, 6) }, (_, i) => (
        <li key={i} className={styles.item}>
          <span className={`skeleton ${styles.skeletonThumb}`} />
          <span className={`skeleton ${styles.skeletonLine}`} />
        </li>
      ))}
    </ol>
  );
}
