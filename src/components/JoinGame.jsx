import React, { useState, useEffect } from 'react';
import { useGame } from './GameContext';
import Backdrop from './Backdrop';
import { API_BASE } from '../config';

const JoinGame = ({ onBack, onGameJoined }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [username, setUsername] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const { setUserAsPlayer } = useGame();

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Зареждане на наличните игри от API...');

      const response = await fetch(`${API_BASE}/game`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Грешка при зареждане на игри: ${response.status} ${response.statusText}`);
      }

      const gamesData = await response.json();
      const gamesList = Array.isArray(gamesData) ? gamesData : [];

      const transformedGames = gamesList.map(game => {
        const currentPlayers = game.players ? game.players.length : 0;
        const host = (game.players && game.players.length > 0) ? game.players[0].name : 'Host';
        return {
          id: game.id,
          name: `Associations Game ${game.id}`,
          host: host,
          categories: game.category || [],
          playersPerTeam: game.playersPerTeam || 2,
          currentPlayers: currentPlayers,
          words: game.words || [],
          teams: game.teams || [],
          _original: game
        };
      });

      setGames(transformedGames);
    } catch (error) {
      console.error('Грешка при зареждане на игри:', error);
      setError(error.message);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = (game) => {
    setSelectedGame(game);
    setShowModal(true);
  };

  const handleJoinGame = async () => {
    if (!username.trim()) return;

    setIsJoining(true);

    try {
      console.log('Присъединяване към игра:', selectedGame.name);
      setUserAsPlayer(username.trim(), selectedGame.id, selectedGame);
      setShowModal(false);
      setUsername('');
      setSelectedGame(null);
      onGameJoined();
    } catch (error) {
      console.error('Грешка при присъединяване:', error);
      alert(`Неуспешно присъединяване към играта: ${error.message}`);
    } finally {
      setIsJoining(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setUsername('');
    setSelectedGame(null);
  };

  return (
    <div
      className="min-h-screen p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #6d28d9 0%, #4f46e5 45%, #1e3a8a 100%)' }}
    >
      <Backdrop palette="purple" />

      <div className="above max-w-2xl mx-auto">

        {/* Заглавие */}
        <div className="text-center pt-8 pb-6 anim-rise">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-1">
            Присъедини се
          </h1>
          <p className="text-indigo-100 text-sm font-bold">Избери игра от списъка</p>
        </div>

        {/* Списък с игри */}
        <div className="card anim-pop mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-bold" style={{ color: 'var(--ink)' }}>
                Налични игри
              </h2>
              <p className="text-xs font-bold" style={{ color: 'var(--ink-soft)' }}>
                Намерени {games.length}
              </p>
            </div>
            <button onClick={fetchGames} disabled={loading} className="btn btn--grape btn--sm">
              <span className={loading ? 'inline-block anim-spin-slow' : 'inline-block'} aria-hidden="true">
                ⟳
              </span>
              Презареди
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div
                className="w-12 h-12 mx-auto mb-4 rounded-full border-4 anim-spin-slow"
                style={{ borderColor: '#e7e1ff', borderTopColor: 'var(--grape)' }}
              />
              <p className="text-sm font-bold" style={{ color: 'var(--ink-soft)' }}>
                Зареждане на игрите...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-10 anim-pop">
              <div className="text-4xl mb-3" aria-hidden="true">😕</div>
              <p className="font-extrabold mb-4" style={{ color: '#e11d48' }}>{error}</p>
              <button onClick={fetchGames} className="btn btn--grape">Опитай отново</button>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12 anim-pop">
              <div className="text-5xl mb-3 anim-bob" aria-hidden="true">🕹️</div>
              <p className="font-extrabold mb-1" style={{ color: 'var(--ink)' }}>Няма активни игри</p>
              <p className="text-sm font-bold" style={{ color: 'var(--ink-soft)' }}>
                Бъди първият, който създава!
              </p>
            </div>
          ) : (
            <div className="space-y-3 stagger">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="rounded-3xl p-4 transition-all"
                  style={{ background: '#f7f5ff', border: '2.5px solid #e7e1ff' }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold truncate" style={{ color: 'var(--ink)' }}>
                        Игра #{game.id}
                      </h3>
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--ink-soft)' }}>
                        👑 {game.host}
                      </p>
                    </div>
                    <span
                      className="pill shrink-0"
                      style={{ background: '#d1fae5', color: '#047857' }}
                    >
                      <span className="live-dot" /> Отворена
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className="pill" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                      👥 {game.currentPlayers} играчи
                    </span>
                    <span className="pill" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                      {game.playersPerTeam}/отбор
                    </span>
                    {game.categories.slice(0, 2).map((cat, idx) => (
                      <span key={idx} className="pill" style={{ background: '#fef3c7', color: '#b45309' }}>
                        {cat}
                      </span>
                    ))}
                    {game.categories.length > 2 && (
                      <span className="pill" style={{ background: '#fef3c7', color: '#b45309' }}>
                        +{game.categories.length - 2}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleJoinClick(game)}
                    className="btn btn--mint btn--block"
                  >
                    Присъедини се
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center pb-8">
          <button onClick={onBack} className="btn btn--ghost">← Връщане към меню</button>
        </div>
      </div>

      {/* Модал за въвеждане на име */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50 anim-fade"
          style={{ background: 'rgba(23,10,60,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={closeModal}
        >
          <div className="card w-full max-w-sm anim-pop" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-4xl mb-2 anim-bob" aria-hidden="true">🙋</div>
              <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                Как се казваш?
              </h2>
              <p className="text-sm font-bold mt-1" style={{ color: 'var(--ink-soft)' }}>
                Влизаш в игра #{selectedGame?.id}
              </p>
            </div>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Въведете името си..."
              className={`field mb-5 ${username.trim() ? 'field--done' : ''}`}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
              autoFocus
            />

            <div className="space-y-3">
              <button
                onClick={handleJoinGame}
                disabled={!username.trim() || isJoining}
                className="btn btn--mint btn--block"
              >
                {isJoining ? (
                  <>
                    <span className="inline-block w-5 h-5 rounded-full border-2 border-white border-t-transparent anim-spin-slow" />
                    Влизам...
                  </>
                ) : (
                  <>🚀 Присъедини се</>
                )}
              </button>
              <button onClick={closeModal} className="btn btn--quiet btn--block">Отказ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JoinGame;
