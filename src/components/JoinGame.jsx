import React, { useState, useEffect } from 'react';
import { useGame } from './GameContext';

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

      const response = await fetch('http://51.210.5.252:8082/api/game', {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-3 sm:p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Заглавие */}
        <div className="text-center mb-6 sm:mb-8 pt-4 sm:pt-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Присъединяване към Игра</h1>
          <p className="text-lg sm:text-xl text-blue-100 px-4">Изберете от наличните игри на Associations</p>
        </div>

        {/* Списък с игри */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Налични Игри</h2>
              <p className="text-xs text-gray-500">Намерени {games.length} игри</p>
            </div>
            <button
              onClick={fetchGames}
              disabled={loading}
              className="px-3 py-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? '⟳' : '🔄'} Презареди
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto mb-3 sm:mb-4"></div>
              <p className="text-gray-600 text-sm sm:text-base">Зареждане на наличните игри...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-red-500 mb-4">Грешка при зареждане на игри: {error}</p>
              <button
                onClick={fetchGames}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
              >
                Опитай отново
              </button>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-400">
              <p className="mb-2">Няма налични игри</p>
              <p className="text-xs sm:text-sm">Бъдете първи, който създаде игра!</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {games.map((game) => (
                <div key={game.id} className="border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-purple-300 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800">{game.name}</h3>
                        <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Отворена
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-4">
                          <span>👤 {game.host}</span>
                          <span>👥 {game.playersPerTeam}/екип</span>
                        </div>
                        <span className="font-medium">{game.currentPlayers} играчи</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">📚</span>
                        <div className="flex flex-wrap gap-1">
                          {game.categories.length > 0 ? (
                            <>
                              {game.categories.slice(0, 3).map((cat, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{cat}</span>
                              ))}
                              {game.categories.length > 3 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                                  +{game.categories.length - 3} още
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Няма категории</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => handleJoinClick(game)}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation text-sm bg-green-500 hover:bg-green-600 active:bg-green-700 text-white shadow-md hover:shadow-lg"
                      >
                        Присъедини се
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={onBack}
            className="px-6 sm:px-8 py-2 sm:py-3 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-bold rounded-xl sm:rounded-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation text-sm sm:text-base"
          >
            ← Връщане към Меню
          </button>
        </div>
      </div>

      {/* Модал за въвеждане на име */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 w-full max-w-sm sm:max-w-md mx-2">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 text-center leading-tight">
              Присъединяване към "{selectedGame?.name}"
            </h2>
            <p className="text-gray-600 mb-4 sm:mb-6 text-center text-sm sm:text-base">Въведете вашето име</p>
            <div className="mb-4 sm:mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Вашето Име</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Въведете името си..."
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-sm sm:text-base"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
                autoFocus
              />
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={closeModal}
                className="flex-1 py-2 sm:py-3 px-3 sm:px-4 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-bold rounded-lg sm:rounded-xl transition-colors touch-manipulation text-sm sm:text-base"
              >
                Отказ
              </button>
              <button
                onClick={handleJoinGame}
                disabled={!username.trim() || isJoining}
                className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 font-bold rounded-lg sm:rounded-xl transition-colors touch-manipulation text-sm sm:text-base ${
                  username.trim() && !isJoining
                    ? 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isJoining ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Присъединяване...</span>
                  </div>
                ) : (
                  '🚀 Присъедини се'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JoinGame;
