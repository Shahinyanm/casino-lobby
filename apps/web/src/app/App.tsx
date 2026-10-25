import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
// The /dom entry wires ReactDOM.flushSync into the router (used by catalog filter updates).
import { RouterProvider } from 'react-router/dom';
import { I18nProvider } from '../i18n/I18nProvider';
import { GamePageSkeleton } from '../features/game/GamePageSkeleton';
import { LobbyPage } from '../features/lobby/LobbyPage';
import { NotFoundPage, PageError } from '../features/lobby/NotFoundPage';
import { queryClient } from './query-client';
import { Shell } from './Shell';

// The lobby ships in the main bundle; the game page loads when someone opens a game.
const GamePage = lazy(() => import('../features/game/GamePage'));

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      {
        // Pathless on purpose: a page that crashes is replaced inside the shell, the header stays usable.
        errorElement: <PageError />,
        children: [
          { index: true, element: <LobbyPage /> },
          {
            path: 'games/:gameId',
            element: (
              <Suspense fallback={<GamePageSkeleton />}>
                <GamePage />
              </Suspense>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <RouterProvider router={router} />
      </I18nProvider>
    </QueryClientProvider>
  );
}
