import React, { useState, useEffect } from 'react';
import { useGame } from './GameContext';
import Backdrop from './Backdrop';
import { API_BASE } from '../config';

const Lobby = ({ onBack, onStartGame }) => {
  const { 
    user, 
    clearUser, 
    wsConnected, 
    gameUpdates,
    sendWebSocketMessage,
    gameCreationData,
    currentGame,
    setCurrentGame,
    refreshGameState,
    isInitialized
  } = useGame();
  
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (user.gameId && isInitialized) {
      fetchAndSetGameData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.gameId, isInitialized]);

  // Use the shared refresh so this never fights with the polling loop. The old
  // version replaced currentGame wholesale and wiped flags the poll had just set,
  // which bounced the player back to the landing page right after the game started.
  const fetchAndSetGameData = async () => {
    const data = await refreshGameState();
    if (data) return;

    console.error('Грешка при зареждане на играта');
    if (gameCreationData && user.role === 'host') {
      setCurrentGame({
        id: user.gameId,
        categories: gameCreationData.categories || [],
        playersPerTeam: gameCreationData.playersPerTeam || 2,
        players: [{ name: user.name, role: user.role }],
        isSetupComplete: true
      });
    }
  };

  const handleStartGame = async () => {
    if (user.role !== 'host') return;

    setIsStarting(true);
    try {
      const response = await fetch(`${API_BASE}/game/start?gameId=${user.gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`Неуспешно стартиране на играта: ${response.status}`);
    } catch (error) {
      console.error('Грешка при стартиране на играта:', error);
      console.log('Демо режим: симулиране на стартиране на играта...');
      setTimeout(() => console.log('Демо: симулиране на WebSocket съобщение за стартиране'), 1000);
    } finally {
      setIsStarting(false);
    }
  };

  const handleLeaveLobby = () => {
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

  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(String(user.gameId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.warn('Clipboard unavailable:', error);
    }
  };

  // Stable colour per name, so a player keeps the same avatar between renders.
  const avatarColor = (name = '') => {
    const palette = ['#7c3aed', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  };

  const isLoading = !isInitialized || (user.gameId && !currentGame && !gameCreationData);

  const gameInfoSource = gameUpdates || currentGame || {};
  const gameInfo = {
    ...gameInfoSource,
    // The backend field is `category`; gameCreationData uses `categories`.
    categories:
      gameInfoSource.categories ||
      gameInfoSource.category ||
      gameCreationData?.categories ||
      [],
    playersPerTeam:
      gameInfoSource.playersPerTeam || gameCreationData?.playersPerTeam || 2,
    players: gameInfoSource.players || []
  };

  const players = (gameInfo.players || []).map(player => {
    if (typeof player === 'string') return { name: player, id: player, role: player === user.name ? user.role : 'player' };
    return { name: player.name, id: player.id || player.name, role: player.role || (player.name === user.name ? user.role : 'player') };
  });

  const currentPlayerCount = players.length;
  const playersLabel = currentPlayerCount === 1 ? 'играч' : 'играчи';
  const categoryCount = gameInfo.categories?.length || 0;
  const categoriesLabel = categoryCount === 1 ? 'категория' : 'категории';

  return (
    <div
      className="min-h-screen p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #6d28d9 0%, #4f46e5 45%, #1e3a8a 100%)' }}
    >
      <Backdrop palette="purple" />

      <div className="above max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center pt-8 pb-6 anim-rise">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">
            Лоби
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="pill" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
              {user.role === 'host' ? '👑 Водещ' : '🙋 Играч'}
            </span>
            <span className="pill" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
              <span className={wsConnected ? 'live-dot' : 'live-dot live-dot--idle'} />
              {wsConnected ? 'На живо' : 'Обновяване'}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="card text-center py-12 anim-pop">
            <div
              className="w-12 h-12 mx-auto mb-4 rounded-full border-4 anim-spin-slow"
              style={{ borderColor: '#e7e1ff', borderTopColor: 'var(--grape)' }}
            />
            <p className="font-bold" style={{ color: 'var(--ink-soft)' }}>
              Зареждане...
            </p>
          </div>
        ) : (
          <div className="card anim-pop mb-5">

            {/* Game info */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span className="pill" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                👥 {gameInfo.playersPerTeam} на отбор
              </span>
              <span className="pill" style={{ background: '#d1fae5', color: '#047857' }}>
                🎯 {currentPlayerCount} {playersLabel}
              </span>
              {gameInfo.categories && (
                <span className="pill" style={{ background: '#fef3c7', color: '#b45309' }}>
                  📚 {categoryCount} {categoriesLabel}
                </span>
              )}
            </div>

            {/* Categories */}
            {gameInfo.categories?.length > 0 && (
              <div className="mb-6">
                <p className="label text-center">Категории</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {gameInfo.categories.map((cat, idx) => (
                    <span key={idx} className="pill anim-pop" style={{ background: '#f7f5ff', color: 'var(--grape)', animationDelay: `${idx * 0.05}s` }}>
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Players */}
            <div className="mb-6">
              <p className="label text-center">В стаята ({currentPlayerCount})</p>

              {currentPlayerCount === 0 ? (
                <p className="text-center text-sm font-bold py-4" style={{ color: 'var(--ink-soft)' }}>
                  Още никой не се е присъединил
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {players.map((p, i) => {
                    const isHost = p.role === 'host' || (p.name === user.name && user.role === 'host');
                    const isCurrentUser = p.name === user.name;
                    return (
                      <div
                        key={p.id || p.name || i}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl anim-pop"
                        style={{
                          background: isCurrentUser ? '#f7f5ff' : '#f8fafc',
                          border: `2.5px solid ${isCurrentUser ? '#d8d0ff' : '#eef2f7'}`,
                          animationDelay: `${i * 0.06}s`
                        }}
                      >
                        <span className="avatar" style={{ background: avatarColor(p.name) }}>
                          {(p.name || '?').trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 text-left">
                          <span
                            className="block text-sm font-extrabold truncate"
                            style={{ color: 'var(--ink)' }}
                          >
                            {p.name}
                          </span>
                          {(isHost || isCurrentUser) && (
                            <span className="block text-xs font-bold" style={{ color: 'var(--ink-soft)' }}>
                              {isHost ? '👑 Водещ' : 'Ти'}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status + actions */}
            {user.role === 'host' ? (
              <button
                onClick={handleStartGame}
                disabled={isStarting || currentPlayerCount < 2}
                className="btn btn--mint btn--lg btn--block"
              >
                {isStarting ? (
                  <>
                    <span className="inline-block w-5 h-5 rounded-full border-2 border-white border-t-transparent anim-spin-slow" />
                    Стартирам...
                  </>
                ) : currentPlayerCount < 2 ? (
                  <>⏳ Нужни са още играчи</>
                ) : (
                  <>🚀 Стартирай играта</>
                )}
              </button>
            ) : (
              <div
                className="text-center py-4 px-4 rounded-2xl"
                style={{ background: '#f7f5ff', border: '2.5px solid #e7e1ff' }}
              >
                <div className="flex justify-center gap-1.5 mb-2" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2.5 h-2.5 rounded-full anim-breathe"
                      style={{ background: 'var(--grape)', animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
                <p className="font-extrabold text-sm" style={{ color: 'var(--ink)' }}>
                  Чакаме водещия
                </p>
                <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                  Той ще стартира, когато всички са готови
                </p>
              </div>
            )}
          </div>
        )}

        {/* Share code */}
        <button onClick={copyCode} className="glass w-full p-4 text-center text-white mb-4 anim-pop block">
          <p className="text-xs font-bold text-indigo-100 mb-1">
            {copied ? '✅ Копиран!' : 'Сподели кода с приятели'}
          </p>
          <p className="font-display text-4xl font-bold tracking-widest">{user.gameId}</p>
          <p className="text-xs font-bold text-indigo-200 mt-1">Натисни, за да копираш</p>
        </button>

        <div className="text-center pb-8">
          <button onClick={handleLeaveLobby} className="btn btn--ghost btn--sm">
            ← Напусни лобито
          </button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
