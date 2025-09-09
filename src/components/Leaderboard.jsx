import React from 'react';
import { useGame } from './GameContext';

const Leaderboard = ({ onBack }) => {
  const { 
    user, 
    currentGame, 
    clearUser,
    sendWebSocketMessage,
    gameUpdates,
    wsConnected
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

  return (
    <div className="min-h-screen flex flex-col relative p-4" style={{ backgroundColor: userTeamColor }}>
      
      {/* Header */}
      <div className="text-center mb-6 pt-8">
        <h1 className="text-4xl font-bold text-white mb-2">Таблица с резултати</h1>
        <p className="text-white text-lg opacity-90">
          Game ID: <span className="font-mono font-bold">{user.gameId}</span>
        </p>
        <p className="text-white text-sm opacity-75 mt-1">
          Вие сте: <span className="font-bold">{user.name}</span>
        </p>
        <div className="flex items-center justify-center mt-2">
          <div className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-white text-xs opacity-75">
            {wsConnected ? 'Свързани' : 'Свързване...'}
          </span>
        </div>
      </div>

      {/* Teams Leaderboard */}
      <div className="flex-1 max-w-2xl mx-auto w-full">
        <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-3xl shadow-2xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Класиране на отборите</h2>
          
          {sortedTeams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Няма налични данни за отборите</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedTeams.map((team, index) => {
                const teamColor = mapBulgarianColorToHex(team.color);
                const isUserTeam = team.players?.some(player => player.name === user.name);
                const position = index + 1;
                
                return (
                  <div 
                    key={team.color || index}
                    className={`rounded-2xl p-4 transition-all duration-300 ${
                      isUserTeam 
                        ? 'ring-4 ring-yellow-400 ring-opacity-75 shadow-lg transform scale-105' 
                        : 'shadow-md hover:shadow-lg'
                    }`}
                    style={{ 
                      backgroundColor: teamColor + '20',
                      borderLeft: `6px solid ${teamColor}`
                    }}
                  >
                    <div className="flex items-center justify-between">
                      
                      {/* Position and Team Info */}
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl font-bold text-gray-700 w-8">
                          {position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `#${position}`}
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: teamColor }}></div>
                            <h3 className="text-lg font-bold text-gray-800">
                              Отбор {team.color}
                            </h3>
                            {isUserTeam && (
                              <span className="bg-yellow-400 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                                ВАШИЯТ ЕКИП
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {team.players?.map((player, playerIndex) => (
                              <span 
                                key={player.id || player.name || playerIndex}
                                className={`text-xs px-2 py-1 rounded-full ${
                                  player.name === user.name 
                                    ? 'bg-yellow-200 text-yellow-800 font-bold'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {player.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Points */}
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-800">
                          {team.points || 0}
                        </div>
                        <div className="text-sm text-gray-600">точки</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Game Status */}
      <div className="mt-6 text-center">
        <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 text-white">
          <p className="text-sm mb-2">🎮 Играта тече</p>
          <p className="text-xs opacity-75">
            Водещият управлява играта. Точките се обновяват автоматично!
          </p>
          {wsConnected && (
            <p className="text-xs opacity-75 mt-1">🔥 Активни са реално-времеви обновления</p>
          )}
        </div>
      </div>

      {/* Leave Game Button */}
      <div className="mt-4 text-center">
        <button
          onClick={handleLeaveGame}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
        >
          Напусни Играта
        </button>
      </div>
    </div>
  );
};

export default Leaderboard;
