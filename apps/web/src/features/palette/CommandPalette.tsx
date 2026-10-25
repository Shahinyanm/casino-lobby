import { useQuery } from '@tanstack/react-query';
import { Fragment, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { LOCALES, setLocale, toggleTheme } from '../../app/preferences';
import { closePalette, openDeposit } from '../../app/ui-store';
import { useI18n } from '../../i18n/I18nProvider';
import { Icon } from '../../ui/Icon';
import { parseFilters, serializeFilters, DEFAULT_FILTERS, SHOW_CATALOG } from '../catalog/filters';
import { catalogQuery } from '../catalog/queries';
import { fuzzyMatch, type FuzzyMatch } from './fuzzy';
import styles from './palette.module.css';

type Kind = 'action' | 'provider' | 'game';

interface Command {
  id: string;
  kind: Kind;
  label: string;
  detail?: string;
  /** 0..1, breaks ties between equally good matches (game popularity) */
  weight: number;
  run: () => void;
}

interface Result {
  command: Command;
  match: FuzzyMatch;
}

// Small nudges so that, on equal text matches, an action outranks a provider outranks a game.
const KIND_BONUS: Record<Kind, number> = { action: 6, provider: 3, game: 0 };
const MAX_RESULTS = 30;
const DEFAULT_GAMES = 5;

export default function CommandPalette() {
  const { t, plural, locale } = useI18n();
  const navigate = useNavigate();
  const { data } = useQuery(catalogQuery);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const providerNames = new Map(data?.providers.map((p) => [p.id, p.name]));
    const sortOnly = serializeFilters({ ...DEFAULT_FILTERS, sort: parseFilters(window.location.search).sort });

    return [
      { id: 'theme', kind: 'action', label: t('palette.toggleTheme'), weight: 1, run: toggleTheme },
      { id: 'deposit', kind: 'action', label: t('palette.deposit'), weight: 1, run: openDeposit },
      {
        id: 'clear',
        kind: 'action',
        label: t('palette.clearFilters'),
        weight: 1,
        run: () => void navigate({ pathname: '/', search: sortOnly }, { state: SHOW_CATALOG }),
      },
      ...LOCALES.filter((code) => code !== locale).map<Command>((code) => ({
        id: `lang-${code}`,
        kind: 'action',
        label: t('palette.language', { language: t(`lang.${code}`) }),
        weight: 0.5,
        run: () => setLocale(code),
      })),
      ...(data?.providers ?? []).map<Command>((provider) => ({
        id: `provider-${provider.id}`,
        kind: 'provider',
        label: provider.name,
        detail: t('palette.provider', { provider: provider.name }),
        weight: 0.5,
        run: () => void navigate(`/?provider=${provider.id}`, { state: SHOW_CATALOG }),
      })),
      ...(data?.games ?? []).map<Command>((game) => ({
        id: `game-${game.id}`,
        kind: 'game',
        label: game.title,
        detail: providerNames.get(game.providerId),
        weight: game.popularity / 100,
        run: () => void navigate(`/games/${game.id}`),
      })),
    ];
  }, [data, locale, navigate, t]);

  const results = useMemo<Result[]>(() => {
    if (!query.trim()) {
      const actions = commands.filter((c) => c.kind === 'action');
      const trending = commands
        .filter((c) => c.kind === 'game')
        .sort((a, b) => b.weight - a.weight)
        .slice(0, DEFAULT_GAMES);
      return [...actions, ...trending].map((command) => ({ command, match: { score: 0, indices: [] } }));
    }

    return commands
      .flatMap((command) => {
        const match = fuzzyMatch(query, command.label);
        return match ? [{ command, match, rank: match.score + KIND_BONUS[command.kind] + command.weight }] : [];
      })
      .sort((a, b) => b.rank - a.rank)
      .slice(0, MAX_RESULTS);
  }, [commands, query]);

  const activeIndex = Math.min(active, results.length - 1);
  const optionId = (index: number) => `${listId}-option-${index}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' });
  });

  const execute = (result: Result | undefined) => {
    if (!result) return;
    dialogRef.current?.close();
    result.command.run();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = results.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: activeIndex >= last ? 0 : activeIndex + 1,
      ArrowUp: activeIndex <= 0 ? last : activeIndex - 1,
      PageDown: Math.min(last, activeIndex + 8),
      PageUp: Math.max(0, activeIndex - 8),
    };

    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key] ?? 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      execute(results[activeIndex]);
    }
  };

  return (
    // Backdrop click closes, like Esc does natively; the dialog element itself is not a control.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={t('palette.title')}
      onClose={closePalette}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className={styles.inputRow}>
        <Icon name="search" className={styles.inputIcon} />
        <input
          ref={inputRef}
          className={styles.input}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results.length ? optionId(activeIndex) : undefined}
          aria-label={t('palette.placeholder')}
          placeholder={t('palette.placeholder')}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      <div id={listId} role="listbox" aria-label={t('palette.title')} className={styles.list}>
        {results.map((result, index) => (
          // Options are never focused: arrows and Enter are handled on the combobox input.
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
          <div
            key={result.command.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === activeIndex}
            className={styles.option}
            onPointerMove={() => index !== activeIndex && setActive(index)}
            onClick={() => execute(result)}
          >
            <span className={styles.label}>
              <Highlight text={result.command.label} indices={result.match.indices} />
              {result.command.detail && <span className={styles.detail}>{result.command.detail}</span>}
            </span>
            <span className={styles.kind} data-kind={result.command.kind}>
              {t(`palette.kind.${result.command.kind}`)}
            </span>
          </div>
        ))}
      </div>

      {results.length === 0 && <p className={styles.empty}>{t('palette.empty', { query })}</p>}

      <div className={styles.footer}>
        <span>{t('palette.hint')}</span>
        <span className="sr-only" aria-live="polite">
          {plural('palette.results', results.length)}
        </span>
      </div>
    </dialog>
  );
}

function Highlight({ text, indices }: { text: string; indices: number[] }) {
  if (!indices.length) return <span>{text}</span>;

  const marked = new Set(indices);
  const segments: { text: string; marked: boolean }[] = [];

  Array.from(text).forEach((ch, i) => {
    const last = segments.at(-1);
    if (last?.marked === marked.has(i)) last.text += ch;
    else segments.push({ text: ch, marked: marked.has(i) });
  });

  return (
    <span>
      {segments.map((segment, i) => (segment.marked ? <mark key={i}>{segment.text}</mark> : <Fragment key={i}>{segment.text}</Fragment>))}
    </span>
  );
}
