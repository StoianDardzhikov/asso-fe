import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// Create the context
const GameContext = createContext(undefined);

// Storage keys for consistency
const STORAGE_KEYS = {
  USER: 'associations_user',
  CURRENT_PAGE: 'associations_current_page',
  CURRENT_GAME: 'associations_current_game',
  GAME_CREATION_DATA: 'associations_game_creation_data'
};

// Storage wrapper - using real localStorage
const storage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('localStorage getItem error:', error);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('localStorage setItem error:', error);
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('localStorage removeItem error:', error);
    }
  }
};

// Helper functions for safe JSON operations
const saveToStorage = (key, data) => {
  try {
    storage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
};

const loadFromStorage = (key) => {
  try {
    const data = storage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading from storage:', error);
    return null;
  }
};

// Custom hook to use the game context
export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

// Provider component
export const GameProvider = ({ children }) => {
  // State variables
  const [user, setUser] = useState({
    name: '',
    role: null, // 'host' or 'player'
    gameId: null
  });

  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);


  const [currentPage, setCurrentPage] = useState('landing');
  const [currentGame, setCurrentGame] = useState(null);
  const [gameCreationData, setGameCreationData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // WebSocket state
  const [wsConnection, setWsConnection] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [gameUpdates, setGameUpdates] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Load persisted data on component mount
  useEffect(() => {
    console.log('GameProvider: Initializing and loading persisted data...');
    
    const savedUser = loadFromStorage(STORAGE_KEYS.USER);
    const savedCurrentPage = loadFromStorage(STORAGE_KEYS.CURRENT_PAGE);
    const savedCurrentGame = loadFromStorage(STORAGE_KEYS.CURRENT_GAME);
    const savedGameCreationData = loadFromStorage(STORAGE_KEYS.GAME_CREATION_DATA);

    if (savedUser && savedUser.gameId) {
      setUser(savedUser);
      console.log('Restored user from storage:', savedUser);
      
      // Reconnect WebSocket if user has gameId
      connectWebSocket(savedUser.gameId, savedUser.name, savedUser.role);
    }

    if (savedCurrentPage) {
      setCurrentPage(savedCurrentPage);
      console.log('Restored current page from storage:', savedCurrentPage);
    }

    if (savedCurrentGame) {
      setCurrentGame(savedCurrentGame);
      console.log('Restored current game from storage:', savedCurrentGame);
    }

    if (savedGameCreationData) {
      setGameCreationData(savedGameCreationData);
      console.log('Restored game creation data from storage:', savedGameCreationData);
    }

    setIsInitialized(true);
    console.log('GameProvider: Initialization complete');
  }, []);

  // Persist user data whenever it changes
  useEffect(() => {
    if (isInitialized) {
      if (user.gameId) {
        saveToStorage(STORAGE_KEYS.USER, user);
        console.log('Saved user to storage:', user);
      } else {
        storage.removeItem(STORAGE_KEYS.USER);
        console.log('Removed user from storage');
      }
    }
  }, [user, isInitialized]);

  // Persist current page whenever it changes
  useEffect(() => {
    if (isInitialized) {
      if (currentPage !== 'landing' && user.gameId) {
        saveToStorage(STORAGE_KEYS.CURRENT_PAGE, currentPage);
        console.log('Saved current page to storage:', currentPage);
      } else {
        storage.removeItem(STORAGE_KEYS.CURRENT_PAGE);
        console.log('Removed current page from storage');
      }
    }
  }, [currentPage, user.gameId, isInitialized]);

  // Persist current game whenever it changes
  useEffect(() => {
    if (isInitialized) {
      if (currentGame) {
        saveToStorage(STORAGE_KEYS.CURRENT_GAME, currentGame);
        console.log('Saved current game to storage:', currentGame);
      } else {
        storage.removeItem(STORAGE_KEYS.CURRENT_GAME);
        console.log('Removed current game from storage');
      }
    }
  }, [currentGame, isInitialized]);

  // Persist game creation data whenever it changes
  useEffect(() => {
    if (isInitialized) {
      if (gameCreationData) {
        saveToStorage(STORAGE_KEYS.GAME_CREATION_DATA, gameCreationData);
        console.log('Saved game creation data to storage:', gameCreationData);
      } else {
        storage.removeItem(STORAGE_KEYS.GAME_CREATION_DATA);
        console.log('Removed game creation data from storage');
      }
    }
  }, [gameCreationData, isInitialized]);

  // WebSocket connection function
  const connectWebSocket = (gameId, playerName, role) => {
    if (wsRef.current) {
      console.log('WebSocket already connected, closing existing connection');
      wsRef.current.close();
    }

    try {
      const wsUrl = `wss://vurkolaci.fun/api/ws`;
      console.log('Connecting to WebSocket:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);
      setWsConnection(wsRef.current);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setWsConnected(true);
        
        // Send initial join message
        const joinMessage = gameId;
        
        wsRef.current.send(joinMessage);
        console.log('Sent join message:', joinMessage);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setWsConnected(false);
        setWsConnection(null);
        
        // Auto-reconnect if user still has gameId and it wasn't a clean close
        if (user.gameId && event.code !== 1000) {
          console.log('Attempting to reconnect in 3 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (user.gameId) {
              connectWebSocket(user.gameId, user.name, user.role);
            }
          }, 3000);
        }
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setWsConnected(false);
    }
  };

  // Fetch full game data
  const fetchGameData = async (gameId) => {
    try {
      console.log('Fetching full game data for:', gameId);
      
      const response = await fetch(`https://vurkolaci.fun/api/game/${gameId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch game data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Full game data fetched:', data);
      
      return data;
    } catch (error) {
      console.error('Error fetching game data:', error);
      return null;
    }
  };

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = async (message) => {
    switch (message.event) {
      case 'join':
        setCurrentGame(prev => {
          if (!prev) return prev;
          
          const currentPlayers = prev.players || [];
          const exists = currentPlayers.find(p => p.name === message.name);
          
          if (!exists) {
            console.log('Player joined:', message.name);
            
            const newPlayer = {
              name: message.name,
              id: message.playerId || message.name,
              role: 'player'
            };
            
            return {
              ...prev,
              players: [...currentPlayers, newPlayer]
            };
          }
          return prev;
        });
        break;
      
      case 'start':
        console.log('Game start message received:', message);
        
        // Get the current user state directly from the latest state
        setUser(currentUser => {
          console.log('Current user when handling start message:', currentUser);
          
          if (currentUser.gameId) {
            // Fetch full game data including words using the current gameId
            fetchGameData(currentUser.gameId).then(gameData => {
              if (gameData) {
                setCurrentGame({
                  ...gameData,
                  isStarted: true
                });
                
                // Navigate based on user role
                if (currentUser.role === 'host') {
                  console.log('Host navigating to game page');
                  setCurrentPage('game');
                } else {
                  console.log('Player navigating to leaderboard page');
                  setCurrentPage('leaderboard');
                }
              }
            });
          } else {
            console.error('No gameId found in current user state:', currentUser);
          }
          
          return currentUser; // Return unchanged user state
        });
        break;
      
      case 'leave':
        setCurrentGame(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            players: (prev.players || []).filter(p => p.name !== message.playerId)
          };
        });
        break;
      
      case 'score':
        console.log('Points update:', message);
        console.log(userRef.current);
        if (userRef.current.role == 'player') {
            setCurrentGame(prev => ({
              ...prev,
              teams: message.teams || prev?.teams,
            }));
        }
        break;
      
      default:
        console.log('Unknown WebSocket message type:', message.type, message);
    }
  };

  // Send WebSocket message
  const sendWebSocketMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      console.log('Sent WebSocket message:', message);
      return true;
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
      return false;
    }
  };

  // Disconnect WebSocket
  const disconnectWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      console.log('Disconnecting WebSocket...');
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setWsConnection(null);
    setWsConnected(false);
    setGameUpdates(null);
  };

  // Set user as host with optional game data
  const setUserAsHost = (name, gameId, gameData = null) => {
    console.log('Setting user as host:', { name, gameId, gameData });
    const userData = {
      name: name.trim(),
      role: 'host',
      gameId
    };
    setUser(userData);
    
    if (gameData) {
      setGameCreationData(gameData);
    }
    
    // Connect WebSocket for host
    connectWebSocket(gameId, name.trim(), 'host');
  };

  // Set user as player
  const setUserAsPlayer = (name, gameId, gameData = null) => {
    console.log('Setting user as player:', { name, gameId, gameData });
    const userData = {
      name: name.trim(),
      role: 'player',
      gameId
    };
    setUser(userData);
    
    // Store the joined game data for player setup
    if (gameData) {
      setGameCreationData(gameData);
    }
    
    // Connect WebSocket for player
    connectWebSocket(gameId, name.trim(), 'player');
  };

  // Clear all user and game data
  const clearUser = () => {
    console.log('Clearing all user and game data');
    
    // Disconnect WebSocket first
    disconnectWebSocket();
    
    setUser({
      name: '',
      role: null,
      gameId: null
    });
    setCurrentPage('landing');
    setCurrentGame(null);
    setGameCreationData(null);
    
    // Clear from storage
    storage.removeItem(STORAGE_KEYS.USER);
    storage.removeItem(STORAGE_KEYS.CURRENT_PAGE);
    storage.removeItem(STORAGE_KEYS.CURRENT_GAME);
    storage.removeItem(STORAGE_KEYS.GAME_CREATION_DATA);
    
    console.log('All data cleared and WebSocket disconnected');
  };

  // Navigation functions
  const navigateToPage = (page) => {
    console.log('Navigating to page:', page);
    setCurrentPage(page);
  };

  const navigateToLanding = () => navigateToPage('landing');
  const navigateToCreateGame = () => navigateToPage('createGame');
  const navigateToGameSetup = () => navigateToPage('gameSetup');
  const navigateToJoinGame = () => navigateToPage('joinGame');
  const navigateToLobby = () => navigateToPage('lobby');
  const navigateToGame = () => navigateToPage('game');
  const navigateToLeaderboard = () => navigateToPage('leaderboard');

  // Update current game (wrapper for persistence)
  const updateCurrentGame = (gameData) => {
    console.log('Updating current game:', gameData);
    setCurrentGame(gameData);
  };

  // Update game creation data (wrapper for persistence)
  const updateGameCreationData = (data) => {
    console.log('Updating game creation data:', data);
    setGameCreationData(data);
  };

  // Check if user has complete game data
  const hasCompleteGameData = () => {
    return user.gameId && 
           ((user.role === 'host' && gameCreationData && currentGame?.isSetupComplete) ||
            (user.role === 'player'));
  };

  // Check if user has valid session data for current page
  const hasValidSession = () => {
    const hasGameId = Boolean(user.gameId);
    const hasRole = Boolean(user.role);

    switch (currentPage) {
      case 'landing':
        return true; // Anyone can access landing
      case 'createGame':
        return true;
      case 'gameSetup':
        // Both host and player can access gameSetup if they have gameId and categories
        return hasGameId && hasRole && gameCreationData?.categories?.length > 0;
      case 'joinGame':
        return true; // Anyone can access join game
      case 'lobby':
        return hasGameId && hasRole && (user.role === 'host' || user.role === 'player');
      case 'game':
        return hasGameId && hasRole && currentGame?.isStarted && user.role === 'host';
      case 'leaderboard':
        return hasGameId && hasRole && currentGame?.isStarted && user.role === 'player';
      default:
        return false;
    }
  };

  // Get game info summary
  const getGameSummary = () => {
    if (!user.gameId) return null;
    
    return {
      gameId: user.gameId,
      userName: user.name,
      userRole: user.role,
      currentPage: currentPage,
      categories: gameCreationData?.categories || [],
      playersPerTeam: gameCreationData?.playersPerTeam || currentGame?.playersPerTeam || 2,
      isSetupComplete: currentGame?.isSetupComplete || false,
      isStarted: currentGame?.isStarted || false,
      categoryWords: currentGame?.categoryWords || {},
      words: currentGame?.words || [],
      wsConnected: wsConnected
    };
  };

  // Context value
  const value = {
    // State
    user,
    currentPage,
    currentGame,
    gameCreationData,
    isInitialized,
    
    // WebSocket state
    wsConnection,
    wsConnected,
    gameUpdates,
    
    // State setters
    setCurrentGame: updateCurrentGame,
    setGameCreationData: updateGameCreationData,
    
    // Navigation
    navigateToPage,
    navigateToLanding,
    navigateToCreateGame,
    navigateToGameSetup,
    navigateToJoinGame,
    navigateToLobby,
    navigateToGame,
    navigateToLeaderboard,
    
    // User actions
    setUserAsHost,
    setUserAsPlayer,
    clearUser,
    
    // WebSocket functions
    sendWebSocketMessage,
    connectWebSocket,
    disconnectWebSocket,
    fetchGameData,
    
    // Utility functions
    hasCompleteGameData,
    hasValidSession,
    getGameSummary,
    
    // Storage keys for external use
    STORAGE_KEYS
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

// Export storage keys for external use
export { STORAGE_KEYS };

// Helper function to clear all game data (useful for testing)
export const clearAllGameData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    storage.removeItem(key);
  });
  console.log('All game data cleared from storage');
};