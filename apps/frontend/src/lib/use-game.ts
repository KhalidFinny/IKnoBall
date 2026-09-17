import { useMemo } from 'react';
import {
  useLeagueGamesNext,
  useLeagueGamesPrevious,
  useLeagueGamesRange,
} from './api';
import type { Game } from './api';

function shiftDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Looks up a single game by id by fetching a wide league window plus the
 * previous/next buckets. There is no per-id endpoint yet, so we hydrate a
 * small index from the available league queries.
 */
export function useGameById(gameId: string | undefined) {
  const { from, to } = useMemo(
    () => ({ from: shiftDate(-200), to: shiftDate(200) }),
    [],
  );

  const range = useLeagueGamesRange(from, to, !!gameId);
  const previous = useLeagueGamesPrevious(!!gameId);
  const next = useLeagueGamesNext(!!gameId);

  const game = useMemo<Game | null>(() => {
    const all = [...(range.data ?? []), ...(previous.data ?? []), ...(next.data ?? [])];
    return all.find((g) => g.id === gameId) ?? null;
  }, [gameId, range.data, previous.data, next.data]);

  const isLoading = range.isLoading || previous.isLoading || next.isLoading;

  return { game, isLoading };
}