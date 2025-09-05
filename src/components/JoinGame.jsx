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

  // Fetch games on component mount
  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching available games from API...');
      
      // Real API call to get available games
      const response = await fetch('https://51.77.194.30:8082/game', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch games: ${response.status} ${response.statusText}`);
      }

      const gamesData = await response.json();
      
      console.log('Raw API response:', gamesData);
      
      // Ensure we have an array
      const gamesList = Array.isArray(gamesData) ? gamesData : [];
      
      console.log('Games list to transform:', gamesList);
      
      // Transform your API response to match UI expectations
      const transformedGames = gamesList.map(game => {
        // Calculate max players: number of teams * players per team
        
        // Get current player count
        const currentPlayers = game.players ? game.players.length : 0;
        
        // Get host (first player or default)
        const host = (game.players && game.players.length > 0) 
          ? game.players[0].name 
          : 'Host';
        
        // Generate game name
        const gameName = `Associations Game ${game.id}`;
        
        // Get categories (your API uses 'category' not 'categories')
        const categories = game.category || [];
        
        // Determine status        
        const transformedGame = {
          id: game.id,
          name: gameName,
          host: host,
          categories: categories,
          playersPerTeam: game.playersPerTeam || 2,
          currentPlayers: currentPlayers,
          words: game.words || [],
          teams: game.teams || [],
          // Keep original data for debugging
          _original: game
        };
        
        console.log('Transformed game:', transformedGame);
        return transformedGame;
      });
      
      console.log('All transformed games:', transformedGames);
      
      // Only show games that aren't full
      const availableGames = transformedGames.filter(game => 
         game
      );
      
      console.log('Available games after filtering:', availableGames);
      
      setGames(availableGames);
      
    } catch (error) {
      console.error('Error fetching games:', error);
      setError(error.message);
      setGames([]); // Clear games on error
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
      console.log('Joining game:', selectedGame.name);
      console.log('Username:', username.trim());
      console.log('Selected game details:', selectedGame);
      
      // Store user info globally (player role, name, gameId) and selected game data
      setUserAsPlayer(username.trim(), selectedGame.id, selectedGame);
      
      // Close modal
      setShowModal(false);
      setUsername('');
      setSelectedGame(null);
      
      // Navigate to player setup
    //   if (onGameJoined) {
        onGameJoined();
    //   }
      
    } catch (error) {
      console.error('Error joining game:', error);
      
      // Show error to user
      alert(`Failed to join game: ${error.message}`);
      
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
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 pt-4 sm:pt-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Join a Game</h1>
          <p className="text-lg sm:text-xl text-blue-100 px-4">Choose from available Associations games</p>
        </div>

        {/* Games List */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
          {/* Header with Refresh Button and Debug Info */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Available Games</h2>
              <p className="text-xs text-gray-500">Found {games.length} available games</p>
            </div>
            <button
              onClick={fetchGames}
              disabled={loading}
              className="px-3 py-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? '⟳' : '🔄'} Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto mb-3 sm:mb-4"></div>
              <p className="text-gray-600 text-sm sm:text-base">Loading available games...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-red-500 mb-4">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600 text-sm sm:text-base mb-4">Failed to load games</p>
                <p className="text-gray-500 text-xs sm:text-sm mb-4">{error}</p>
              </div>
              <button
                onClick={fetchGames}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-gray-600 text-sm sm:text-base mb-2">No games available</p>
                <p className="text-gray-500 text-xs sm:text-sm">Be the first to create a game!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {games.map((game) => (
                <div key={game.id} className="border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-purple-300 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {/* Game Title and Status */}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800">{game.name}</h3>
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800`}>
                          {'Open'}
                        </span>
                      </div>
                      
                      {/* Simplified Info Row */}
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-4">
                          <span>👤 {game.host}</span>
                          <span>👥 {game.playersPerTeam}/team</span>
                        </div>
                        <span className="font-medium">{game.currentPlayers} players</span>
                      </div>
                      
                      {/* Categories - Handle both single and multiple */}
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">📚</span>
                        <div className="flex flex-wrap gap-1">
                          {game.categories && game.categories.length > 0 ? (
                            <>
                              {game.categories.slice(0, 3).map((category, index) => (
                                <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                  {category}
                                </span>
                              ))}
                              {game.categories.length > 3 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                                  +{game.categories.length - 3} more
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                              No categories
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Join Button */}
                    <div className="ml-4">
                      <button
                        onClick={() => handleJoinClick(game)}
                        disabled={game.currentPlayers >= game.maxPlayers}
                        className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation text-sm ${
                          game.currentPlayers >= game.maxPlayers
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white shadow-md hover:shadow-lg'
                        }`}
                      >
                        {game.currentPlayers >= game.maxPlayers ? 'Full' : 'Join'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={onBack}
            className="px-6 sm:px-8 py-2 sm:py-3 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-bold rounded-xl sm:rounded-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation text-sm sm:text-base"
          >
            ← Back to Menu
          </button>
        </div>
      </div>

      {/* Username Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 w-full max-w-sm sm:max-w-md mx-2">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 text-center leading-tight">
              Join "{selectedGame?.name}"
            </h2>
            <p className="text-gray-600 mb-4 sm:mb-6 text-center text-sm sm:text-base">Enter your name to join the game</p>
            
            <div className="mb-4 sm:mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name..."
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
                Cancel
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
                    <span>Joining...</span>
                  </div>
                ) : (
                  '🚀 Join Game'
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