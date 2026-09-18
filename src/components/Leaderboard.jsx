import React, { useEffect, useRef, useState } from 'react';
import { useGame } from './GameContext';
import useRoundTimer, { formatTime } from '../hooks/useRoundTimer';
import Results from './Results';

const Leaderboard = ({ onBack }) => {
  const {
    user,
    currentGame,
    clearUser,
    sendWebSocketMessage,
    gameUpdates,
    wsConnected,
    lastSyncAt
  } = useGame();

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

  const userTeam = currentGame?.teams?.find(team => 
    team.players?.some(player => player.name === user.name)
  );
  const userTeamColor = mapBulgarianColorToHex(userTeam?.color);

  const teamsData = gameUpdates?.teams || currentGame?.teams || [];
  const sortedTeams = [...teamsData].sort((a, b) => (b.points || 0) - (a.points || 0));

  // Countdown of the round the host is currently running.
  const roundState = gameUpdates?.roundState || currentGame?.roundState || null;
  const { secondsLeft, active: roundActive } = useRoundTimer(roundState);
  const roundFinished = Boolean(roundState?.finished);
  const isLowOnTime = roundActive && secondsLeft <= 10;

  // Countdown ring geometry
  const RING_R = 64;
  const RING_C = 2 * Math.PI * RING_R;
  const totalSeconds = roundState?.totalSeconds || 0;
  const ringProgress = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const ringOffset = RING_C * (1 - ringProgress);
  const ringTone = isLowOnTime ? 'timer-ring__fill--danger' : secondsLeft <= 25 && roundActive ? 'timer-ring__fill--warn' : '';

  // Remember the previous score per team so a change can be animated.
  const myTotal = sortedTeams.reduce((sum, t) => sum + (t.points || 0), 0);
  const prevTotalRef = useRef(myTotal);
  const [pointsBumped, setPointsBumped] = useState(0);

  useEffect(() => {
    if (myTotal !== prevTotalRef.current) {
      prevTotalRef.current = myTotal;
      setPointsBumped(n => n + 1);
    }
  }, [myTotal]);

  const avatarColor = (name = '') => {
    const palette = ['#7c3aed', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  };

  const handleLeaveGame = () => {
    sendWebSocketMessage({
      type: 'player_leave',
      gameId: user.gameId,
      playerId: user.name,
      playerName: user.name,
      timestamp: new Date().toISOString()
    });
    
    clearUser();
    onBack();
  };

  if (roundFinished) {
    return (
      <div className="min-h-screen px-4" style={{ backgroundColor: userTeamColor }}>
        <Results
          teams={teamsData}
          stats={currentGame?.stats}
          userName={user.name}
          lang="bg"
          onBack={handleLeaveGame}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col relative p-4"
      style={{ backgroundColor: userTeamColor }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,0.16), transparent 62%), linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.25) 100%)'
        }}
        aria-hidden="true"
      />

      <div className="above w-full max-w-lg mx-auto flex-1 flex flex-col">

        {/* Header */}
        <div className="text-center pt-6 pb-4 anim-rise">
          <h1 className="font-display text-3xl font-bold text-white mb-2">Резултати</h1>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="pill" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              Игра #{user.gameId}
            </span>
            <span className="pill" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              🙋 {user.name}
            </span>
            <span className="pill" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              <span className={wsConnected ? 'live-dot' : 'live-dot live-dot--idle'} />
              {wsConnected ? 'На живо' : 'Обновяване'}
            </span>
          </div>
        </div>

        {/* Таймер на текущия рунд */}
        <div className="glass p-5 text-center text-white mb-4 anim-pop">
          {roundFinished ? (
            <div className="py-2">
              <div className="text-4xl mb-2 anim-bob" aria-hidden="true">🏁</div>
              <p className="font-display text-2xl font-bold">Играта приключи</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-extrabold uppercase tracking-widest text-white/75 mb-3">
                {roundActive ? 'Време за рунда' : 'Изчакване на следващия играч'}
              </p>

              <div className="relative flex items-center justify-center mx-auto" style={{ width: 150, height: 150 }}>
                <svg
                  className="absolute"
                  width="150"
                  height="150"
                  viewBox="0 0 150 150"
                  style={{ transform: 'rotate(-90deg)' }}
                  aria-hidden="true"
                >
                  <circle className="timer-ring__track" cx="75" cy="75" r={RING_R} fill="none" strokeWidth="6" />
                  <circle
                    className={`timer-ring__fill ${ringTone}`}
                    cx="75"
                    cy="75"
                    r={RING_R}
                    fill="none"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={RING_C}
                    strokeDashoffset={ringOffset}
                  />
                </svg>

                <span
                  className={`font-display text-5xl font-bold tabular-nums ${
                    isLowOnTime ? 'text-red-200 anim-breathe' : 'text-white'
                  }`}
                  style={{ textShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
                >
                  {formatTime(secondsLeft)}
                </span>
              </div>

              {roundState?.contestantName && (
                <p className="mt-3 font-bold text-sm">
                  🎤 Обяснява <span className="font-extrabold">{roundState.contestantName}</span>
                  {roundState.teamColor && <span className="text-white/75"> ({roundState.teamColor})</span>}
                </p>
              )}

              {roundState?.round > 0 && (
                <div className="flex justify-center gap-1.5 mt-3" aria-hidden="true">
                  {[1, 2, 3].map((r) => (
                    <span
                      key={r}
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: r === Math.min(roundState.round, 3) ? '2rem' : '0.75rem',
                        background: r <= Math.min(roundState.round, 3) ? '#fff' : 'rgba(255,255,255,0.35)'
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Класиране */}
        <div className="card card--tight flex-1 anim-pop" style={{ animationDelay: '0.08s' }}>
          <h2 className="font-display text-lg font-bold text-center mb-4" style={{ color: 'var(--ink)' }}>
            Класиране
          </h2>

          {sortedTeams.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2" aria-hidden="true">⏳</div>
              <p className="font-bold text-sm" style={{ color: 'var(--ink-soft)' }}>
                Няма данни за отборите
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTeams.map((team, index) => {
                const teamColor = mapBulgarianColorToHex(team.color);
                const isUserTeam = team.players?.some(player => player.name === user.name);
                const position = index + 1;
                const topScore = Math.max(1, ...sortedTeams.map(t => t.points || 0));
                const barWidth = `${Math.round(((team.points || 0) / topScore) * 100)}%`;

                return (
                  <div
                    key={team.color || index}
                    className={`rank-row ${isUserTeam ? 'rank-row--mine' : ''} ${position === 1 ? 'rank-row--first' : ''}`}
                    style={{
                      background: `${teamColor}18`,
                      borderLeft: `6px solid ${teamColor}`
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl font-extrabold w-7 text-center shrink-0" style={{ color: 'var(--ink-soft)' }}>
                          {position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `#${position}`}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display font-bold truncate" style={{ color: 'var(--ink)' }}>
                              {team.color}
                            </h3>
                            {isUserTeam && (
                              <span className="pill shrink-0" style={{ background: '#fef08a', color: '#854d0e', fontSize: '0.6875rem' }}>
                                ТИ
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {team.players?.map((player, playerIndex) => (
                              <span
                                key={player.id || player.name || playerIndex}
                                className="inline-flex items-center gap-1 pr-2 rounded-full"
                                style={{
                                  background: player.name === user.name ? '#fef08a' : '#f1f5f9',
                                  fontSize: '0.6875rem',
                                  fontWeight: 800,
                                  color: player.name === user.name ? '#854d0e' : '#475569'
                                }}
                              >
                                <span
                                  className="avatar"
                                  style={{ background: avatarColor(player.name), width: '1.25rem', height: '1.25rem', fontSize: '0.625rem' }}
                                >
                                  {(player.name || '?').trim().charAt(0).toUpperCase()}
                                </span>
                                {player.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          key={`${team.color}-${team.points}-${pointsBumped}`}
                          className="font-display text-3xl font-bold anim-punch leading-none"
                          style={{ color: teamColor }}
                        >
                          {team.points || 0}
                        </div>
                        <div className="text-xs font-bold" style={{ color: 'var(--ink-soft)' }}>точки</div>
                      </div>
                    </div>

                    {/* Relative score bar */}
                    <div className="mt-2.5 h-1.5 rounded-full overflow-hidden" style={{ background: `${teamColor}22` }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: barWidth, background: teamColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-white/75 text-xs font-bold mb-3">
            Точките се обновяват автоматично
            {lastSyncAt && <> · {new Date(lastSyncAt).toLocaleTimeString()}</>}
          </p>
          <button onClick={handleLeaveGame} className="btn btn--ghost btn--sm">
            Напусни играта
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
