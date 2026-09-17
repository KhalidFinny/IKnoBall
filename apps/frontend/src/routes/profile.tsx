import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Target, Trophy, TrendingUp, UserRound, Zap } from 'lucide-react';
import { DashboardHeader } from '../components/dashboard/Header';
import { EmptyState, Panel } from '../components/dashboard/shared';
import { StatCard } from '../components/dashboard/StatCard';
import { loadPredictions, type SavedPrediction } from '../components/predict/PredictionPanel';
import { useLeagueGamesRange, useTeamRecord, useTeams, useTopPlayers, type Game } from '../lib/api';
import { buildTeamLookup, getGameStatus, resolveGameTeams } from '../lib/game-utils';
import { useSession, useSignOut } from '../lib/use-auth';
import {
  mockAccuracy,
  mockUserPoints,
  mockUserPredictions,
  mockUserRank,
  mockUserRankNumber,
} from '../lib/mock-data';

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
});

function shiftDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function ProfilePage() {
  const navigate = useNavigate();
  const { data: session, isPending: sessionLoading, isFetching: sessionFetching } = useSession();
  const signOut = useSignOut();
  const user = session?.user;

  const favTeam = user?.favoriteTeam ?? null;
  const { data: teams } = useTeams({ enabled: !!user });
  const team = favTeam ? (teams?.find((t) => t.abbreviation === favTeam) ?? null) : null;
  const accentColor = team?.primaryColor ?? '#1C4188';

  const { data: record } = useTeamRecord(favTeam ?? undefined);
  const { data: players } = useTopPlayers(favTeam ?? undefined);

  const from = useMemo(() => shiftDate(-200), []);
  const to = useMemo(() => shiftDate(200), []);
  const { data: games } = useLeagueGamesRange(from, to, !!user);

  const [predictions, setPredictions] = useState<Record<string, SavedPrediction>>({});
  useEffect(() => {
    if (typeof window !== 'undefined') setPredictions(loadPredictions());
  }, []);

  useEffect(() => {
    if (sessionLoading || sessionFetching) return;
    if (!user) navigate({ to: '/auth/login' });
    else if (!user.favoriteTeam) navigate({ to: '/onboarding' });
  }, [sessionLoading, sessionFetching, user, navigate]);

  if (sessionLoading || sessionFetching) return null;
  if (!user || !team) return null;

  const handleSignOut = () => {
    signOut.mutate(undefined, { onSuccess: () => navigate({ to: '/' }) });
  };

  const lookup = useMemo(() => buildTeamLookup(teams), [teams]);
  const predictedGames = (games ?? []).filter((g) => predictions[g.id]);
  const sortedHistory = [...predictedGames].sort((a, b) => {
    const sa = getGameStatus(a) === 'scheduled' ? 0 : 1;
    const sb = getGameStatus(b) === 'scheduled' ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return new Date(a.gameDateTime).getTime() - new Date(b.gameDateTime).getTime();
  });
  const upcomingPicks = sortedHistory.filter((g) => getGameStatus(g) === 'scheduled');

  const initials = (user.name ?? '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-stone-200">
      <DashboardHeader
        userName={user.name}
        accentColor={accentColor}
        onSignOut={handleSignOut}
        active="profile"
      />

      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-6">
          {/* ── Profile header ── */}
          <div
            className="relative overflow-hidden rounded-xl border border-brand-line shadow-sm"
            style={{ backgroundColor: accentColor }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 23px, white 23px, white 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, white 23px, white 24px)',
              }}
            />
            <div className="relative z-10 flex flex-col items-center gap-4 px-6 py-8 sm:flex-row sm:gap-6 sm:px-8">
              <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white/95 font-heading text-4xl font-black uppercase text-brand-navy shadow-xl ring-4 ring-white/30">
                {initials || <UserRound className="h-10 w-10" aria-hidden="true" />}
              </span>
              <div className="min-w-0 text-center sm:text-left">
                <h1 className="font-heading text-4xl font-black uppercase tracking-wide text-white">
                  {user.name}
                </h1>
                <p className="mt-0.5 text-sm text-white/80">{user.email}</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white ring-1 ring-white/20 backdrop-blur">
                    {team.logoUrl && (
                      <img src={team.logoUrl} alt="" className="h-4 w-4 object-contain" />
                    )}
                    {team.teamName} · {team.abbreviation}
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white ring-1 ring-white/20 backdrop-blur">
                    {team.conference === 'East' ? 'Eastern' : 'Western'} · {team.division}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white ring-1 ring-white/20 backdrop-blur">
                    <CalendarClock className="h-3 w-3" aria-hidden="true" />
                    Member since {new Date(user.createdAt).getFullYear() || '2026'}
                  </span>
                </div>
              </div>
              <Link
                to="/onboarding"
                className="shrink-0 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur transition hover:bg-white/20 sm:ml-auto"
              >
                Change Team
              </Link>
            </div>
          </div>

          {/* ── Top row: stats + team ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div className="flex min-w-0 flex-col gap-6">
              <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
                <StatCard
                  icon={<Trophy className="h-5 w-5" strokeWidth={2} aria-hidden="true" />}
                  label="Rank"
                  value={mockUserRank}
                  caption={`#${mockUserRankNumber} leaderboard`}
                />
                <StatCard
                  icon={<Target className="h-5 w-5" strokeWidth={2} aria-hidden="true" />}
                  label="Accuracy"
                  value={mockAccuracy}
                  caption="This week"
                />
                <StatCard
                  icon={<TrendingUp className="h-5 w-5" strokeWidth={2} aria-hidden="true" />}
                  label="Predictions"
                  value={`${mockUserPredictions.correct}W ${mockUserPredictions.wrong}L`}
                  caption="Correct / Wrong"
                />
                <StatCard
                  icon={<Zap className="h-5 w-5" strokeWidth={2} aria-hidden="true" />}
                  label="Points"
                  value={mockUserPoints}
                  caption="Season total"
                />
              </div>

              <Panel
                title="My Predictions"
                className="overflow-hidden"
                contentClassName="!p-0"
              >
                <div className="flex items-center justify-end border-b border-brand-line px-5 py-2">
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-stone-500">
                    {upcomingPicks.length} open · {sortedHistory.length} total
                  </span>
                </div>
                <div className="divide-y divide-brand-line">
                  {sortedHistory.length === 0 && (
                    <EmptyState message="No predictions yet — make your first pick from the Predictions page." />
                  )}
                  {sortedHistory.map((g) => (
                    <HistoryRow
                      key={g.id}
                      game={g}
                      pred={predictions[g.id]}
                      lookup={lookup}
                      accentColor={accentColor}
                    />
                  ))}
                </div>
                {sortedHistory.length > 0 && (
                  <div className="border-t border-brand-line px-5 py-3 text-center">
                    <Link
                      to="/predict"
                      className="text-sm font-bold uppercase tracking-widest text-brand-navy underline-offset-2 hover:underline"
                    >
                      View all games →
                    </Link>
                  </div>
                )}
              </Panel>
            </div>

            <aside className="min-w-0">
              <Panel title={team.teamName} className="overflow-hidden" contentClassName="!p-0">
                <div
                  className="flex items-center gap-4 px-5 py-4"
                  style={{ backgroundColor: team.primaryColor }}
                >
                  {team.logoUrl && (
                    <img
                      src={team.logoUrl}
                      alt={team.fullName}
                      className="h-16 w-16 object-contain drop-shadow"
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0 text-white">
                    <p className="truncate font-heading text-xl font-black uppercase tracking-wide">
                      {team.fullName}
                    </p>
                    <p className="text-xs text-white/75">
                      {team.conference === 'East' ? 'Eastern' : 'Western'} Conference ·{' '}
                      {team.division}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 px-5 py-4">
                  <div>
                    <p className="font-heading text-3xl font-black tabular-nums text-brand-ink">
                      {record ? `${record.wins}-${record.losses}` : '—'}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                      Record
                    </p>
                  </div>
                  <div>
                    <p className="font-heading text-3xl font-black tabular-nums text-brand-ink">
                      {players?.[0]?.points.toFixed(1) ?? '—'}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                      Top PPG
                    </p>
                  </div>
                  <div>
                    <p className="truncate text-sm font-semibold text-brand-ink">{team.headCoach}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                      Head Coach
                    </p>
                  </div>
                  <div>
                    <p className="truncate text-sm font-semibold text-brand-ink">{team.arena}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                      Arena
                    </p>
                  </div>
                </div>
              </Panel>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({
  game,
  pred,
  lookup,
  accentColor,
}: {
  game: Game;
  pred: SavedPrediction;
  lookup: ReturnType<typeof buildTeamLookup>;
  accentColor: string;
}) {
  const { away, home } = useMemo(() => resolveGameTeams(game, lookup), [game, lookup]);
  const status = getGameStatus(game);
  const awayAbbr =
    away?.abbreviation ?? (game.awayTricode ?? game.awayTeam.slice(0, 3).toUpperCase());
  const homeAbbr =
    home?.abbreviation ?? (game.homeTricode ?? game.homeTeam.slice(0, 3).toUpperCase());
  const picked = pred.pick === 'away' ? awayAbbr : homeAbbr;

  let resultLabel: string;
  if (status === 'scheduled') {
    resultLabel = 'Open';
  } else if (game.awayScore != null && game.homeScore != null) {
    const awayWon = game.awayScore > game.homeScore;
    const correct = (pred.pick === 'away') === awayWon;
    resultLabel = correct ? '✓ Correct' : '✗ Missed';
  } else {
    resultLabel = 'Pending';
  }

  return (
    <Link
      to="/game/$gameId"
      params={{ gameId: game.id }}
      className="flex items-center gap-3 px-5 py-3 transition hover:bg-stone-50"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {away?.logoUrl ? (
          <img src={away.logoUrl} alt="" className="h-5 w-5 object-contain" loading="lazy" />
        ) : null}
        <span className="text-sm font-bold text-brand-ink">{awayAbbr}</span>
        <span className="text-stone-400">@</span>
        {home?.logoUrl ? (
          <img src={home.logoUrl} alt="" className="h-5 w-5 object-contain" loading="lazy" />
        ) : null}
        <span className="text-sm font-bold text-brand-ink">{homeAbbr}</span>
        <span className="ml-2 hidden truncate text-xs text-stone-500 sm:inline">
          {new Date(game.gameDateTime).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-stone-600">
        {picked}
      </span>
      <span
        className={`w-24 shrink-0 rounded-full px-2.5 py-1 text-center text-[11px] font-black uppercase tracking-widest ${
          resultLabel === '✓ Correct'
            ? 'bg-emerald-500/15 text-emerald-700'
            : resultLabel === 'Open'
              ? 'bg-brand-navy/10 text-brand-navy'
              : resultLabel === '✗ Missed'
                ? 'bg-brand-red/10 text-brand-red'
                : 'bg-stone-100 text-stone-500'
        }`}
      >
        {resultLabel}
      </span>
      <span
        className="hidden h-2 w-2 shrink-0 rounded-full sm:block"
        style={{ backgroundColor: accentColor }}
      />
    </Link>
  );
}
