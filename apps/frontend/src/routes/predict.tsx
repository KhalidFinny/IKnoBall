import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Sparkles } from 'lucide-react';
import { DashboardHeader } from '../components/dashboard/Header';
import { EmptyState, LoadingSpinner, Panel } from '../components/dashboard/shared';
import { loadPredictions, type SavedPrediction } from '../components/predict/PredictionPanel';
import { useLeagueGamesRange, useTeams, type Game, type TeamWithLeaders } from '../lib/api';
import {
  buildTeamLookup,
  formatTimeET,
  getGameStatus,
  getSeasonBadge,
  resolveGameTeams,
  sortGamesChronologically,
} from '../lib/game-utils';
import { useSession, useSignOut } from '../lib/use-auth';

export const Route = createFileRoute('/predict')({
  component: PredictPage,
});

function shiftDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function GameRow({
  game,
  teams,
  saved,
  accentColor,
}: {
  game: Game;
  teams: TeamWithLeaders[] | null | undefined;
  saved: SavedPrediction | undefined;
  accentColor: string;
}) {
  const lookup = useMemo(() => buildTeamLookup(teams), [teams]);
  const { away, home } = useMemo(() => resolveGameTeams(game, lookup), [game, lookup]);
  const status = getGameStatus(game);
  const badge = getSeasonBadge(game);
  const locked = status !== 'scheduled';

  const awayAbbr = away?.abbreviation ?? (game.awayTricode ?? game.awayTeam.slice(0, 3).toUpperCase());
  const homeAbbr = home?.abbreviation ?? (game.homeTricode ?? game.homeTeam.slice(0, 3).toUpperCase());
  const awayName = away?.teamName ?? game.awayTeam;
  const homeName = home?.teamName ?? game.homeTeam;

  return (
    <Link
      to="/game/$gameId"
      params={{ gameId: game.id }}
      className="group flex items-center gap-4 rounded-xl border border-brand-line bg-white px-4 py-4 shadow-sm transition hover:border-brand-navy/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy"
    >
      {/* status column */}
      <div className="flex w-24 shrink-0 flex-col items-center gap-1">
        {status === 'live' ? (
          <span className="rounded-full bg-brand-red px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white animate-pulse">
            ● Live
          </span>
        ) : status === 'final' ? (
          <span className="rounded-full bg-stone-800 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
            Final
          </span>
        ) : (
          <span className="rounded-full bg-brand-navyDark px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
            {formatTimeET(game.gameDateTime)} ET
          </span>
        )}
        {badge.variant !== 'regular' && (
          <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-stone-900">
            {badge.label}
          </span>
        )}
      </div>

      {/* matchup */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          {away?.logoUrl && (
            <img src={away.logoUrl} alt="" className="h-9 w-9 object-contain" loading="lazy" />
          )}
          <span className="max-w-full truncate text-sm font-bold text-brand-ink">{awayName}</span>
          {status !== 'scheduled' && (
            <span className="text-xs font-black tabular-nums text-stone-500">
              {game.awayScore ?? '—'}
            </span>
          )}
        </div>

        <span className="shrink-0 font-heading text-sm font-black italic text-stone-400">@</span>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          {home?.logoUrl && (
            <img src={home.logoUrl} alt="" className="h-9 w-9 object-contain" loading="lazy" />
          )}
          <span className="max-w-full truncate text-sm font-bold text-brand-ink">{homeName}</span>
          {status !== 'scheduled' && (
            <span className="text-xs font-black tabular-nums text-stone-500">
              {game.homeScore ?? '—'}
            </span>
          )}
        </div>
      </div>

      {/* pick status */}
      <div className="flex w-40 shrink-0 flex-col items-end gap-1.5">
        {saved ? (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-500/30">
            ✓ You: {saved.pick === 'away' ? awayAbbr : homeAbbr} · {saved.confidence}%
          </span>
        ) : locked ? (
          <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
            Locked
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-brand-navy">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> Predict now
          </span>
        )}
        <span
          className="flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-white transition group-hover:brightness-110"
          style={{ backgroundColor: accentColor }}
        >
          Details <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

function PredictPage() {
  const navigate = useNavigate();
  const { data: session, isPending: sessionLoading, isFetching: sessionFetching } = useSession();
  const signOut = useSignOut();
  const user = session?.user;
  const accentColor = '#1C4188';

  const from = useMemo(() => shiftDate(0), []);
  const to = useMemo(() => shiftDate(20), []);
  const { data: games, isLoading } = useLeagueGamesRange(from, to, !!user);
  const { data: teams } = useTeams({ enabled: !!user });

  const [predictions, setPredictions] = useState<Record<string, SavedPrediction>>({});
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPredictions(loadPredictions());

    const onStorage = () => setPredictions(loadPredictions());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (sessionLoading || sessionFetching) return;
    if (!user) navigate({ to: '/auth/login' });
    else if (!user.favoriteTeam) navigate({ to: '/onboarding' });
  }, [sessionLoading, sessionFetching, user, navigate]);

  if (sessionLoading || sessionFetching) return null;
  if (!user || !user.favoriteTeam) return null;

  const handleSignOut = () => {
    signOut.mutate(undefined, { onSuccess: () => navigate({ to: '/' }) });
  };

  const sorted = sortGamesChronologically(games ?? []);
  const grouped: Map<string, Game[]> = new Map();
  for (const g of sorted) {
    const key =
      g.gameDate ?? (g.gameDateTime ? new Date(g.gameDateTime).toISOString().slice(0, 10) : 'Unknown');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(g);
  }
  const upcomingCount = sorted.filter((g) => getGameStatus(g) === 'scheduled').length;

  return (
    <div className="min-h-screen bg-stone-200">
      <DashboardHeader userName={user.name} onSignOut={handleSignOut} active="predict" />

      <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
        {/* Heading */}
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="flex items-center gap-2 font-heading text-4xl font-black uppercase tracking-wide text-brand-ink">
            <CalendarDays className="h-8 w-8 text-brand-navy" aria-hidden="true" />
            Predictions
          </h1>
          <p className="text-sm text-stone-500">
            Pick the winner of each game before tip-off. Open a game for the full breakdown and
            make an informed call — points are awarded for correct picks.
          </p>
        </div>

        {/* Summary strip */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand-line bg-white px-5 py-3 shadow-sm">
          <span className="rounded-full bg-brand-navyDark px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white">
            {upcomingCount} upcoming
          </span>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-stone-600">
            {Object.values(predictions).length} picks made
          </span>
          <span className="ml-auto hidden text-xs font-medium uppercase tracking-widest text-stone-400 sm:inline">
            Tap any game for the educated-decision breakdown
          </span>
        </div>

        {/* Game list grouped by date */}
        {isLoading && <LoadingSpinner />}

        {!isLoading && grouped.size === 0 && (
          <div className="rounded-xl border border-dashed border-brand-line bg-white">
            <EmptyState message="No games in this window." />
          </div>
        )}

        {!isLoading && grouped.size > 0 && (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([key, dayGames]) => {
              const label = key === 'Unknown' ? 'TBD' : formatDayLabel(key);
              const isToday = key === new Date().toISOString().slice(0, 10);
              return (
                <Panel key={key} title={label} className="overflow-hidden" contentClassName="!p-0">
                  <div className="flex items-center gap-2 border-b border-brand-line px-5 py-2">
                    {isToday && (
                      <span className="rounded-full bg-brand-red px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
                        Today
                      </span>
                    )}
                    <span className="ml-auto text-xs font-semibold uppercase tracking-widest text-stone-400">
                      {dayGames.length} {dayGames.length === 1 ? 'game' : 'games'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5 p-3">
                    {dayGames.map((g) => (
                      <GameRow
                        key={g.id}
                        game={g}
                        teams={teams}
                        saved={predictions[g.id]}
                        accentColor={accentColor}
                      />
                    ))}
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}