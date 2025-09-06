import React, { useState, useEffect } from 'react';
import { useGame } from './GameContext';

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
    isInitialized
  } = useGame();
  
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (user.gameId && isInitialized) {
      fetchAndSetGameData();
    }
  }, []);

  const fetchAndSetGameData = async () => {
    try {
      const response = await fetch(`https://vurkolaci.fun/api/game/${user.gameId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`Неуспешно зареждане на играта: ${response.status}`);
      const data = await response.json();
      setCurrentGame({ ...data, isSetupComplete: true });
    } catch (error) {
      console.error('Грешка при зареждане на играта:', error);
      if (gameCreationData && user.role === 'host') {
        setCurrentGame({
          id: user.gameId,
          categories: gameCreationData.categories || [],
          playersPerTeam: gameCreationData.playersPerTeam || 2,
          players: [{ name: user.name, role: user.role }],
          isSetupComplete: true
        });
      }
    }
  };

  const handleStartGame = async () => {
    if (user.role !== 'host') return;

    setIsStarting(true);
    try {
      const response = await fetch(`https://vurkolaci.fun/api/game/start?gameId=${user.gameId}`, {
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

  const isLoading = !isInitialized || (user.gameId && !currentGame && !gameCreationData);

  const gameInfo = gameUpdates || currentGame || {
    categories: gameCreationData?.categories || [],
    playersPerTeam: gameCreationData?.playersPerTeam || 2,
    players: []
  };

  const players = (gameInfo.players || []).map(player => {
    if (typeof player === 'string') return { name: player, id: player, role: player === user.name ? user.role : 'player' };
    return { name: player.name, id: player.id || player.name, role: player.role || (player.name === user.name ? user.role : 'player') };
  });

  const maxPlayers = gameInfo.playersPerTeam * 4; // Максимум 4 отбора
  const currentPlayerCount = players.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-3 sm:p-4 lg:p-6">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 pt-4 sm:pt-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Лоби на играта</h1>
          <p className="text-lg sm:text-xl text-blue-100">
            Код на играта: <span className="font-mono font-bold">{user.gameId}</span>
          </p>
          <p className="text-blue-200 text-sm sm:text-base mt-1">
            Вие сте <span className="font-bold capitalize text-yellow-300">{user.role}</span>
          </p>
          <div className="flex items-center justify-center mt-2">
            <div className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-blue-200 text-xs">{wsConnected ? 'Свързани' : 'Свързване...'}</span>
          </div>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-8 text-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Зареждане на данни за играта...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 mb-6">
            
            {/* Game Info */}
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                Associ<span className="text-purple-600">ations</span>
              </h2>
              <div className="flex justify-center items-center space-x-6 text-sm text-gray-600">
                <span>👥 {gameInfo.playersPerTeam} на отбор</span>
                <span>🎯 {currentPlayerCount} играчи</span>
                {gameInfo.categories && <span>📚 {gameInfo.categories.length} категории</span>}
              </div>
            </div>

            {/* Categories */}
            {gameInfo.categories?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 text-center">📚 Категории</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {gameInfo.categories.map((cat, idx) => (
                    <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">{cat}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Players */}
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 text-center">👥 Играчите ({currentPlayerCount})</h3>
              {currentPlayerCount === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">Няма играчи</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                  {players.map((p, i) => {
                    const isHost = p.role === 'host' || (p.name === user.name && user.role === 'host');
                    const isCurrentUser = p.name === user.name;
                    return (
                      <div key={p.id || p.name || i} className="flex items-center justify-center">
                        <div className={`px-4 py-2 rounded-xl font-medium text-sm sm:text-base w-full text-center transition-all ${
                          isHost ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' :
                          isCurrentUser ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' :
                          'bg-gray-100 text-gray-700 border-2 border-gray-200'
                        }`}>
                          {isHost && '👑 '} {p.name} {isHost && '(Водещ)'} {isCurrentUser && !isHost && '(Вие)'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status */}
            <div className="text-center mb-6 p-4 bg-blue-50 rounded-xl">
              {user.role === 'host' ? (
                <div>
                  <p className="text-blue-800 font-medium mb-2">🎮 Вие сте водещ!</p>
                  <p className="text-blue-600 text-sm">{currentPlayerCount >= 2 ? 'Готови за стартиране на играта!' : 'Очакваме още играчи...'}</p>
                </div>
              ) : (
                <div>
                  <p className="text-blue-800 font-medium mb-2">⏳ Изчакване на водещ...</p>
                  <p className="text-blue-600 text-sm">Водещият ще стартира играта, когато е готов.</p>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              {user.role === 'host' && (
                <button
                  onClick={handleStartGame}
                  disabled={isStarting || currentPlayerCount < 2}
                  className={`w-full py-3 sm:py-4 px-6 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation ${
                    !isStarting && currentPlayerCount >= 2 ? 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white shadow-lg hover:shadow-xl' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isStarting ? 'Стартиране...' : currentPlayerCount < 2 ? '⏳ Нужни са още играчи' : '🚀 Стартирай играта'}
                </button>
              )}
              <button
                onClick={handleLeaveLobby}
                className="w-full bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-bold py-2 sm:py-3 px-6 rounded-xl sm:rounded-2xl text-base sm:text-lg transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation"
              >
                ← Напусни лобито
              </button>
            </div>
          </div>
        )}

        {/* Share Code */}
        <div className="text-center">
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-white">
            <p className="text-sm sm:text-base mb-2">Споделете този код с приятели:</p>
            <p className="font-mono font-bold text-xl sm:text-2xl tracking-wider">{user.gameId}</p>
            {wsConnected && <p className="text-xs text-blue-200 mt-1">Реално-времеви обновления 🔥</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
