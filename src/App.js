import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './components/GameContext';
import GameLanding from './components/GameLanding';
import CreateGame from './components/CreateGame';
import GameSetup from './components/GameSetup';
import JoinGame from './components/JoinGame';
import Lobby from './components/Lobby';
import Game from './components/Game';
import Leaderboard from './components/Leaderboard';
import './App.css';

// Inner component that uses the GameContext
function AppContent() {
  const { 
    currentPage, 
    isInitialized, 
    hasValidSession,
    navigateToLanding,
    navigateToCreateGame,
    navigateToGameSetup,
    navigateToJoinGame,
    navigateToLobby,
    navigateToGame,
    navigateToLeaderboard,
    user,
    gameCreationData
  } = useGame();

  // Validate session on page load
  useEffect(() => {
    if (isInitialized) {
      const validSession = hasValidSession();
      console.log('Session validation:', { currentPage, validSession });
      
      // If invalid session for current page, redirect to landing
      if (!validSession && currentPage !== 'landing') {
        console.log('Invalid session for page:', currentPage, 'redirecting to landing');
        navigateToLanding();
      }
    }
  }, [isInitialized, currentPage, hasValidSession, navigateToLanding]);

  const handleGameCreated = () => {
    navigateToGameSetup();
  };

  const handleGameJoined = () => {
    console.log('here!')
    navigateToGameSetup();
  };

  const handleSetupComplete = () => {
    navigateToLobby();
  };

  const handleStartGame = () => {
    console.log('Starting game! Navigate to game interface...');
    navigateToGame();
  };

  // Show loading spinner while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Associations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {currentPage === 'landing' && (
        <GameLanding onCreateGame={navigateToCreateGame} onJoinGame={navigateToJoinGame} />
      )}
      {currentPage === 'createGame' && (
        <CreateGame onBack={navigateToLanding} onGameCreated={handleGameCreated} />
      )}
      {currentPage === 'gameSetup' && (
        <GameSetup 
          onBack={user.role === 'host' ? navigateToCreateGame : navigateToJoinGame} 
          onSetupComplete={handleSetupComplete}
          gameData={gameCreationData}
        />
      )}
      {currentPage === 'joinGame' && (
        <JoinGame onBack={navigateToLanding} onGameJoined={handleGameJoined} />
      )}
      {currentPage === 'lobby' && (
        <Lobby onBack={navigateToLanding} onStartGame={handleStartGame} />
      )}
      {currentPage === 'game' && (
        <Game onBack={navigateToLanding} />
      )}
      {currentPage === 'leaderboard' && (
        <Leaderboard onBack={navigateToLanding} />
      )}
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;