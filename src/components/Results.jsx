import React, { useMemo } from 'react';
import Confetti from './Confetti';

/**
 * End-of-game podium and recap. Shown to the host on the play screen and to every
 * player on their leaderboard, so it carries both languages: the rest of the host's
 * play screen is in English while the player side is in Bulgarian.
 */
const COPY = {
  en: {
    winner: 'Winners',
    draw: "It's a draw!",
    noWinner: 'Nobody scored',
    standings: 'Final standings',
    points: 'pts',
    recap: 'Game recap',
    topExplainer: 'Top explainer',
    bestStreak: 'Longest streak',
    hardestWord: 'Hardest word',
    guessedTotal: 'Words guessed',
    skippedTotal: 'Words skipped',
    words: 'words',
    inARow: 'in a row',
    skips: 'skips',
    noStats: 'No rounds were played.',
    back: 'Back to Menu'
  },
  bg: {
    winner: 'Победители',
    draw: 'Равенство!',
    noWinner: 'Никой не отбеляза',
    standings: 'Крайно класиране',
    points: 'т.',
    recap: 'Обобщение',
    topExplainer: 'Най-добър обяснител',
    bestStreak: 'Най-дълга серия',
    hardestWord: 'Най-трудна дума',
    guessedTotal: 'Познати думи',
    skippedTotal: 'Пропуснати думи',
    words: 'думи',
    inARow: 'поред',
    skips: 'пропуска',
    noStats: 'Не са изиграни рундове.',
    back: 'Към менюто'
  }
};

const mapBulgarianColorToHex = (colorName) => {
  const colorMap = {
    'Зелени': '#22C55E',
    'Сини': '#3B82F6',
    'Червени': '#EF4444',
    'Оранжеви': '#F97316',
    'Розови': '#EC4899',
    'Бели': '#F8FAFC'
  };
  return colorMap[colorName] || '#7C3AED';
};

const Results = ({ teams = [], stats = null, userName = '', lang = 'bg', onBack, backLabel }) => {
  const t = COPY[lang] || COPY.bg;

  const sorted = useMemo(
    () => [...(teams || [])].sort((a, b) => (b.points || 0) - (a.points || 0)),
    [teams]
  );

  const topScore = sorted.length ? (sorted[0].points || 0) : 0;
  // Several teams can share the top score.
  const winners = sorted.filter(team => (team.points || 0) === topScore && topScore > 0);
  const isDraw = winners.length > 1;
  const nobodyScored = winners.length === 0;
  const iWon = winners.some(team => team.players?.some(p => p.name === userName));

  const players = stats?.players || [];
  const topExplainer = players.find(p => p.guessed > 0) || null;
  const streakLeader = players.reduce(
    (best, p) => (!best || (p.bestStreak || 0) > (best.bestStreak || 0) ? p : best),
    null
  );
  const hardestWord = stats?.hardestWords?.[0] || null;
  const totalGuessed = stats?.totalGuessed || 0;
  const totalSkipped = stats?.totalSkipped || 0;
  const hasStats = totalGuessed > 0 || totalSkipped > 0;

  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`);

  return (
    <div className="w-full max-w-lg mx-auto py-6 px-1">
      <Confetti key="results" pieces={46} />

      {/* Winner */}
      <div className="text-center mb-6 anim-pop">
        <div className="text-6xl mb-2 anim-bob" aria-hidden="true">
          {nobodyScored ? '🤷' : iWon ? '🎉' : '🏆'}
        </div>
        {!nobodyScored && (
          <p className="text-white/80 text-xs font-extrabold uppercase tracking-widest mb-1">
            {isDraw ? t.draw : t.winner}
          </p>
        )}
        <h1 className="font-display text-4xl font-bold text-white leading-tight break-words">
          {nobodyScored ? t.noWinner : winners.map(w => w.color).join(' & ')}
        </h1>
        {topScore > 0 && (
          <p className="text-white/85 font-extrabold mt-1">
            {topScore} {t.points}
          </p>
        )}
      </div>

      {/* Standings */}
      <div className="card card--tight mb-4 anim-pop" style={{ animationDelay: '0.1s' }}>
        <h2 className="font-display text-lg font-bold text-center mb-4" style={{ color: 'var(--ink)' }}>
          {t.standings}
        </h2>

        <div className="space-y-3">
          {sorted.map((team, index) => {
            const color = mapBulgarianColorToHex(team.color);
            const isMine = team.players?.some(p => p.name === userName);
            const width = topScore > 0 ? `${Math.round(((team.points || 0) / topScore) * 100)}%` : '0%';

            return (
              <div
                key={team.color || index}
                className={`rank-row ${isMine ? 'rank-row--mine' : ''} ${index === 0 ? 'rank-row--first' : ''} anim-rise`}
                style={{
                  background: `${color}18`,
                  borderLeft: `6px solid ${color}`,
                  animationDelay: `${0.15 + index * 0.08}s`
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl font-extrabold w-7 text-center shrink-0" style={{ color: 'var(--ink-soft)' }}>
                      {medal(index)}
                    </span>
                    <div className="min-w-0 text-left">
                      <h3 className="font-display font-bold truncate" style={{ color: 'var(--ink)' }}>
                        {team.color}
                      </h3>
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--ink-soft)' }}>
                        {(team.players || []).map(p => p.name).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-display text-3xl font-bold leading-none" style={{ color }}>
                      {team.points || 0}
                    </div>
                    <div className="text-xs font-bold" style={{ color: 'var(--ink-soft)' }}>
                      {t.points}
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 h-1.5 rounded-full overflow-hidden" style={{ background: `${color}22` }}>
                  <div
                    className="score-bar h-1.5 rounded-full"
                    style={{ width, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recap */}
      <div className="card card--tight mb-5 anim-pop" style={{ animationDelay: '0.2s' }}>
        <h2 className="font-display text-lg font-bold text-center mb-4" style={{ color: 'var(--ink)' }}>
          {t.recap}
        </h2>

        {!hasStats ? (
          <p className="text-center text-sm font-bold py-2" style={{ color: 'var(--ink-soft)' }}>
            {t.noStats}
          </p>
        ) : (
          <div className="space-y-2.5 stagger">
            {topExplainer && (
              <StatRow
                icon="🎤"
                label={t.topExplainer}
                value={topExplainer.name}
                detail={`${topExplainer.guessed} ${t.words}`}
                tint="#ede9fe"
                color="#6d28d9"
              />
            )}

            {streakLeader && streakLeader.bestStreak > 1 && (
              <StatRow
                icon="🔥"
                label={t.bestStreak}
                value={streakLeader.name}
                detail={`${streakLeader.bestStreak} ${t.inARow}`}
                tint="#ffedd5"
                color="#c2410c"
              />
            )}

            {hardestWord && (
              <StatRow
                icon="😅"
                label={t.hardestWord}
                value={hardestWord.word}
                detail={`${hardestWord.skipped} ${t.skips}`}
                tint="#fee2e2"
                color="#b91c1c"
              />
            )}

            <div className="flex gap-2.5 pt-1">
              <Totals value={totalGuessed} label={t.guessedTotal} tint="#d1fae5" color="#047857" />
              <Totals value={totalSkipped} label={t.skippedTotal} tint="#f1f5f9" color="#475569" />
            </div>
          </div>
        )}
      </div>

      {onBack && (
        <button onClick={onBack} className="btn btn--grape btn--lg btn--block">
          {backLabel || t.back}
        </button>
      )}
    </div>
  );
};

const StatRow = ({ icon, label, value, detail, tint, color }) => (
  <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: tint }}>
    <span className="text-2xl shrink-0" aria-hidden="true">{icon}</span>
    <div className="min-w-0 flex-1 text-left">
      <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color }}>
        {label}
      </p>
      <p className="font-display font-bold truncate" style={{ color: 'var(--ink)' }}>
        {value}
      </p>
    </div>
    <span className="text-xs font-extrabold shrink-0" style={{ color }}>
      {detail}
    </span>
  </div>
);

const Totals = ({ value, label, tint, color }) => (
  <div className="flex-1 rounded-2xl px-3 py-2.5 text-center" style={{ background: tint }}>
    <div className="font-display text-2xl font-bold leading-none" style={{ color }}>
      {value}
    </div>
    <div className="text-xs font-bold mt-0.5" style={{ color: 'var(--ink-soft)' }}>
      {label}
    </div>
  </div>
);

export default Results;
