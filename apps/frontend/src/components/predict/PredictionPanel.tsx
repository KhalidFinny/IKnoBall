import { useEffect, useMemo, useState } from 'react';
import { Check, Lock, Trophy } from 'lucide-react';
import type { Game, TeamWithLeaders } from '../../lib/api';
import {
  buildTeamLookup,
  getGameStatus,
  getSeasonBadge,
  resolveGameTeams,
} from '../../lib/game-utils';
import { hexLuminance } from '../dashboard/shared';

const STORAGE_KEY = 'iknoball.predictions.v1';

export interface SavedPrediction {
  gameId: string;
  pick: 'away' | 'home';
  confidence: number;
  submittedAt: string;
}

export function loadPredictions(): Record<string, SavedPrediction> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function ConfettiMark() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-2 w-2 rotate-45 rounded-[2px]"
          style={{
            left: `${(i * 83) % 100}%`,
            top: '-8px',
            backgroundColor: ['#FDB927', '#C94D2E', '#1C4188', '#882233', '#43973B'][i % 5],
            animation: `confetti-drop ${0.8 + (i % 5) * 0.15}s ${i * 0.05}s cubic-bezier(0.16,1,0.3,1) forwards`,
          }}
        />
      ))}
    </div>
  );
}

export function PredictionPanel({
  game,
  teams,
  accentColor,
}: {
  game: Game;
  teams?: TeamWithLeaders[] | null;
  accentColor: string;
}) {
  const lookup = useMemo(() => buildTeamLookup(teams), [teams]);
  const { away, home } = useMemo(() => resolveGameTeams(game, lookup), [game, lookup]);

  const awayColor = away?.primaryColor ?? '#2B2B2B';
  const homeColor = home?.primaryColor ?? '#1C4188';

  const awayAbbr =
    away?.abbreviation ??
    (game.awayTricode ? game.awayTricode : game.awayTeam.slice(0, 3).toUpperCase());
  const homeAbbr =
    home?.abbreviation ??
    (game.homeTricode ? game.homeTricode : game.homeTeam.slice(0, 3).toUpperCase());

  const awayName = away?.teamName ?? game.awayTeam;
  const homeName = home?.teamName ?? game.homeTeam;

  const status = getGameStatus(game);
  const locked = status !== 'scheduled';

  const [saved, setSaved] = useState<SavedPrediction | null>(null);
  const [pick, setPick] = useState<'away' | 'home' | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSaved(loadPredictions()[game.id] ?? null);
    if (locked) setPick(null);
  }, [game.id, locked]);

  const awayBright = hexLuminance(awayColor) > 0.45;
  const homeBright = hexLuminance(homeColor) > 0.45;
  const awayTx = awayBright ? 'text-brand-ink' : 'text-white';
  const homeTx = homeBright ? 'text-brand-ink' : 'text-white';

  const badge = getSeasonBadge(game);

  const submit = () => {
    if (!pick) return;
    const pred: SavedPrediction = {
      gameId: game.id,
      pick,
      confidence,
      submittedAt: new Date().toISOString(),
    };
    const all = loadPredictions();
    all[game.id] = pred;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setSaved(pred);
    setJustSubmitted(true);
    window.setTimeout(() => setJustSubmitted(false), 1400);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-brand-line bg-white shadow-sm">
      <div className="flex items-center justify-between bg-brand-navyDark px-5 py-3">
        <h2 className="flex items-center gap-2 font-heading text-2xl font-black uppercase tracking-wide text-white">
          <Trophy className="h-5 w-5 text-brand-gold" aria-hidden="true" />
          Make a Prediction
        </h2>
        {locked ? (
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white">
            <Lock className="h-3 w-3" aria-hidden="true" /> Locked
          </span>
        ) : (
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
            {badge.label}
          </span>
        )}
      </div>

      {/* Picker */}
      <div className="relative p-5">
        {justSubmitted && saved && <ConfettiMark />}

        {saved ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30">
              <Check className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="font-heading text-xl font-black uppercase tracking-wide text-brand-ink">
              {saved.pick === 'away' ? awayName : homeName} to win
            </p>
            <p className="text-sm text-stone-500">
              {saved.confidence}% confidence ·{' '}
              {new Date(saved.submittedAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
              Pick recorded
            </p>
            {!locked && (
              <button
                type="button"
                onClick={() => {
                  setSaved(null);
                  setPick(null);
                  const all = loadPredictions();
                  delete all[game.id];
                  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
                }}
                className="mt-1 text-xs font-semibold text-stone-400 underline-offset-2 hover:text-brand-ink hover:underline"
              >
                Edit prediction
              </button>
            )}
          </div>
        ) : locked ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Lock className="h-6 w-6 text-stone-300" aria-hidden="true" />
            <p className="text-sm text-stone-500">Locked at tip-off.</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              Predictions close once the game starts
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
              {/* Away */}
              <button
                type="button"
                onClick={() => setPick('away')}
                aria-pressed={pick === 'away'}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-xl px-3 py-5 ring-2 transition-all ${
                  pick === 'away'
                    ? 'ring-brand-gold shadow-lg'
                    : 'ring-transparent hover:ring-black/10'
                }`}
                style={{ backgroundColor: awayColor }}
              >
                {pick === 'away' && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-brand-ink">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                )}
                {away?.logoUrl ? (
                  <img
                    src={away.logoUrl}
                    alt={awayName}
                    className="h-12 w-12 object-contain drop-shadow"
                    loading="lazy"
                  />
                ) : (
                  <span className={`font-heading text-3xl font-black ${awayTx}`}>{awayAbbr}</span>
                )}
                <span className={`text-xs font-bold uppercase tracking-wide ${awayTx}`}>
                  {awayAbbr}
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-[0.18em] ${awayTx} opacity-80`}
                >
                  Away
                </span>
              </button>

              <div className="flex flex-col items-center justify-center px-2">
                <span className="font-heading text-2xl font-black italic text-stone-300">VS</span>
              </div>

              {/* Home */}
              <button
                type="button"
                onClick={() => setPick('home')}
                aria-pressed={pick === 'home'}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-xl px-3 py-5 ring-2 transition-all ${
                  pick === 'home'
                    ? 'ring-brand-gold shadow-lg'
                    : 'ring-transparent hover:ring-black/10'
                }`}
                style={{ backgroundColor: homeColor }}
              >
                {pick === 'home' && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-brand-ink">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                )}
                {home?.logoUrl ? (
                  <img
                    src={home.logoUrl}
                    alt={homeName}
                    className="h-12 w-12 object-contain drop-shadow"
                    loading="lazy"
                  />
                ) : (
                  <span className={`font-heading text-3xl font-black ${homeTx}`}>{homeAbbr}</span>
                )}
                <span className={`text-xs font-bold uppercase tracking-wide ${homeTx}`}>
                  {homeAbbr}
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-[0.18em] ${homeTx} opacity-80`}
                >
                  Home
                </span>
              </button>
            </div>

            {/* Confidence */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="predict-confidence"
                  className="text-sm font-semibold text-brand-ink"
                >
                  Confidence
                </label>
                <span className="font-heading text-xl font-black tabular-nums text-brand-navy">
                  {confidence}%
                </span>
              </div>
              <input
                id="predict-confidence"
                type="range"
                min={50}
                max={100}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-[#1C4188]"
                disabled={!pick}
              />
              <div className="mt-1 flex justify-between text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                <span>50% · Even</span>
                <span>100% · Lock</span>
              </div>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={!pick}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold uppercase tracking-widest text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: accentColor }}
            >
              {pick ? `Submit ${pick === 'away' ? awayAbbr : homeAbbr}` : 'Pick a winner'}
            </button>
            {!pick && (
              <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-widest text-stone-400">
                Tap a team to lock in your pick
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
