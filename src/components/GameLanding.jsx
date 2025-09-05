import React from 'react';

const GameLanding = ({ onCreateGame, onJoinGame }) => {
  const handleJoinGame = () => {
    console.log('Join Game clicked');
    onJoinGame();
  };

  const handleCreateGame = () => {
    console.log('Create Game clicked');
    onCreateGame();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="text-center max-w-sm sm:max-w-md w-full">
        {/* Game Title */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 tracking-tight">
            Associ
            <span className="text-yellow-300">ations</span>
          </h1>
          
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 sm:space-y-4 px-2">
          {/* Join Game Button */}
          <button
            onClick={handleJoinGame}
            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl sm:rounded-2xl text-lg sm:text-xl transition-all duration-200 transform hover:scale-105 hover:shadow-2xl active:scale-95 border-2 sm:border-4 border-green-400 hover:border-green-300 touch-manipulation"
          >
            Join Game
          </button>

          {/* Create Game Button */}
          <button
            onClick={handleCreateGame}
            className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl sm:rounded-2xl text-lg sm:text-xl transition-all duration-200 transform hover:scale-105 hover:shadow-2xl active:scale-95 border-2 sm:border-4 border-orange-400 hover:border-orange-300 touch-manipulation"
          >
            Create Game
          </button>
        </div>


      </div>
    </div>
  );
};

export default GameLanding;