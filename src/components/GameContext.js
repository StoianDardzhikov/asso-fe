import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  API_BASE,
  WS_URL,
  POLL_INTERVAL_CONNECTED_MS,
  POLL_INTERVAL_DISCONNECTED_MS
} from '../config';

// Create the context
const GameContext = createContext(undefined);

// Pages that need live game data; everything else has nothing to refresh.
const POLLED_PAGES = ['lobby', 'game', 'leaderboard'];

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

  // Keep a ref of the page so callbacks created once (websocket handlers, poll loop)
  // never act on a stale value.
  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // WebSocket state
  const [wsConnection, setWsConnection] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [gameUpdates, setGameUpdates] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const pingIntervalRef = useRef(null);
  const manualCloseRef = useRef(false);

  // Load persisted data on component mount
  useEffect(() => {
    console.log('GameProvider: Initializing and loading persisted data...');
    
    const savedUser = loadFromStorage(STORAGE_KEYS.USER);
    const savedCurrentPage = loadFromStorage(STORAGE_KEYS.CURRENT_PAGE);
    const savedCurrentGame = loadFromStorage(STORAGE_KEYS.CURRENT_GAME);
    const savedGameCreationData = loadFromStorage(STORAGE_KEYS.GAME_CREATION_DATA);

    if (savedUser && savedUser.gameId) {
      // Update the ref synchronously - the websocket callbacks read it and setUser
      // has not been applied yet at this point.
      userRef.current = savedUser;
      setUser(savedUser);
      console.log('Restored user from storage:', savedUser);

      // Reconnect WebSocket if user has gameId
      connectWebSocket(savedUser.gameId);
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

  // Fetch full game data
  const fetchGameData = useCallback(async (gameId) => {
    try {
      const response = await fetch(`${API_BASE}/game/${gameId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch game data: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching game data:', error);
      return null;
    }
  }, []);

  // Merge a snapshot coming from the REST API into the local game state.
  // Locally-owned flags (isStarted / isSetupComplete / categoryWords) are never
  // dropped, because the backend does not know about them.
  const applyGameSnapshot = useCallback((data) => {
    if (!data) return;

    const started = Array.isArray(data.teams) && data.teams.length > 0;

    setCurrentGame(prev => ({
      ...(prev || {}),
      ...data,
      isStarted: started || Boolean(prev?.isStarted),
      isSetupComplete: prev?.isSetupComplete ?? true,
      categoryWords: prev?.categoryWords ?? data.categoryWords
    }));
    setLastSyncAt(Date.now());

    // The host may have started the game while our websocket was asleep or blocked;
    // the poll result is then the only thing that gets us out of the lobby.
    if (started && currentPageRef.current === 'lobby') {
      const role = userRef.current.role;
      console.log('Game start detected while polling, leaving lobby as', role);
      setCurrentPage(role === 'host' ? 'game' : 'leaderboard');
    }
  }, []);

  // Pull the latest game state over plain HTTP.
  const refreshGameState = useCallback(async () => {
    const gameId = userRef.current.gameId;
    if (!gameId) return null;

    const data = await fetchGameData(gameId);
    if (data) {
      applyGameSnapshot(data);
    }
    return data;
  }, [fetchGameData, applyGameSnapshot]);

  const refreshGameStateRef = useRef(refreshGameState);
  useEffect(() => {
    refreshGameStateRef.current = refreshGameState;
  }, [refreshGameState]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback(async (message) => {
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

      case 'start': {
        console.log('Game start message received:', message);

        const currentUser = userRef.current;
        if (!currentUser.gameId) {
          console.error('No gameId found in current user state:', currentUser);
          break;
        }

        const gameData = await fetchGameData(currentUser.gameId);
        if (gameData) {
          setCurrentGame(prev => ({
            ...(prev || {}),
            ...gameData,
            isStarted: true,
            isSetupComplete: prev?.isSetupComplete ?? true,
            categoryWords: prev?.categoryWords ?? gameData.categoryWords
          }));
          setLastSyncAt(Date.now());
          setCurrentPage(currentUser.role === 'host' ? 'game' : 'leaderboard');
        }
        break;
      }

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
        // The host owns the score locally; everybody else follows the broadcast.
        if (userRef.current.role === 'player') {
          setCurrentGame(prev => ({
            ...prev,
            teams: message.teams || prev?.teams
          }));
        }
        setLastSyncAt(Date.now());
        break;

      case 'round':
        // Countdown published by the host so every player can watch the clock.
        setCurrentGame(prev => ({
          ...prev,
          roundState: message.roundState || prev?.roundState,
          teams: userRef.current.role === 'player' ? (message.teams || prev?.teams) : prev?.teams
        }));
        setLastSyncAt(Date.now());
        break;

      default:
        console.log('Unknown WebSocket message type:', message.event, message);
    }
  }, [fetchGameData]);

  const handleWebSocketMessageRef = useRef(handleWebSocketMessage);
  useEffect(() => {
    handleWebSocketMessageRef.current = handleWebSocketMessage;
  }, [handleWebSocketMessage]);

  const clearReconnectTimer = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const clearPingTimer = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  // WebSocket connection function
  const connectWebSocket = useCallback((gameId) => {
    const targetGameId = gameId ?? userRef.current.gameId;
    if (!targetGameId) {
      console.warn('connectWebSocket called without a gameId');
      return;
    }

    clearReconnectTimer();

    // Don't stack sockets: an already open/connecting one for this game is enough.
    if (wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (wsRef.current) {
      manualCloseRef.current = true;
      try { wsRef.current.close(); } catch (e) { /* ignore */ }
      wsRef.current = null;
    }

    try {
      console.log('Connecting to WebSocket:', WS_URL);
      manualCloseRef.current = false;

      const socket = new WebSocket(WS_URL);
      wsRef.current = socket;
      setWsConnection(socket);

      socket.onopen = () => {
        console.log('WebSocket connected successfully');
        reconnectAttemptsRef.current = 0;
        setWsConnected(true);

        // Subscribe to the game: the backend expects the bare game id.
        socket.send(String(targetGameId));

        // Keep-alive - mobile networks drop idle sockets without telling us.
        clearPingTimer();
        pingIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            try { socket.send('ping'); } catch (e) { /* ignore */ }
          }
        }, 25000);

        // Re-sync straight away: we may have missed events while disconnected.
        refreshGameStateRef.current();
      };

      socket.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          handleWebSocketMessageRef.current(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onerror = () => {
        // The error event carries no useful detail; onclose does the recovery.
        console.warn('WebSocket error');
      };

      socket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        clearPingTimer();
        setWsConnected(false);
        setWsConnection(null);
        if (wsRef.current === socket) {
          wsRef.current = null;
        }

        if (manualCloseRef.current || !userRef.current.gameId) {
          return;
        }

        // Back off a little on repeated failures, but keep trying: polling covers
        // the gap in the meantime.
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(15000, 1000 * Math.pow(2, Math.min(reconnectAttemptsRef.current - 1, 4)));
        console.log(`Attempting to reconnect in ${delay}ms`);
        clearReconnectTimer();
        reconnectTimeoutRef.current = setTimeout(() => {
          if (userRef.current.gameId) {
            connectWebSocket(userRef.current.gameId);
          }
        }, delay);
      };

    } catch (error) {
      // e.g. a browser that refuses the URL - polling keeps the game usable.
      console.error('Error creating WebSocket connection:', error);
      setWsConnected(false);
    }
  }, []);

  // Send WebSocket message
  const sendWebSocketMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket not connected, cannot send message:', message);
    return false;
  };

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    clearReconnectTimer();
    clearPingTimer();
    reconnectAttemptsRef.current = 0;

    if (wsRef.current) {
      console.log('Disconnecting WebSocket...');
      manualCloseRef.current = true;
      try { wsRef.current.close(1000, 'User disconnected'); } catch (e) { /* ignore */ }
      wsRef.current = null;
    }

    setWsConnection(null);
    setWsConnected(false);
    setGameUpdates(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Polling fallback.
  // The websocket is best-effort: it is blocked by some mobile networks and gets
  // suspended when a phone locks or the tab goes to the background. Polling the
  // REST API keeps the lobby, the scores and the round timer correct regardless.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isInitialized || !user.gameId || !POLLED_PAGES.includes(currentPage)) {
      return undefined;
    }

    const interval = wsConnected ? POLL_INTERVAL_CONNECTED_MS : POLL_INTERVAL_DISCONNECTED_MS;
    let cancelled = false;

    // Fetch once immediately so a freshly opened page is never stale.
    refreshGameStateRef.current();

    // Deliberately NOT gated on document.hidden: browsers report a visible page as
    // hidden often enough (embedded/in-app browsers, unfocused windows) that skipping
    // those ticks is how a leaderboard ends up frozen. Browsers already throttle
    // timers in genuinely backgrounded tabs, which is enough.
    const id = setInterval(() => {
      if (cancelled) return;
      refreshGameStateRef.current();
    }, interval);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isInitialized, user.gameId, currentPage, wsConnected]);

  // Phones suspend sockets in the background: when the player comes back, re-sync
  // immediately and rebuild the connection instead of waiting for the next tick.
  useEffect(() => {
    if (!isInitialized) return undefined;

    const wakeUp = () => {
      if (!userRef.current.gameId) return;

      refreshGameStateRef.current();
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        reconnectAttemptsRef.current = 0;
        connectWebSocket(userRef.current.gameId);
      }
    };

    window.addEventListener('focus', wakeUp);
    window.addEventListener('online', wakeUp);
    document.addEventListener('visibilitychange', wakeUp);

    return () => {
      window.removeEventListener('focus', wakeUp);
      window.removeEventListener('online', wakeUp);
      document.removeEventListener('visibilitychange', wakeUp);
    };
  }, [isInitialized, connectWebSocket]);

  // Tear everything down when the provider goes away.
  useEffect(() => {
    return () => {
      clearReconnectTimer();
      clearPingTimer();
      if (wsRef.current) {
        manualCloseRef.current = true;
        try { wsRef.current.close(); } catch (e) { /* ignore */ }
        wsRef.current = null;
      }
    };
  }, []);

  // Set user as host with optional game data
  const setUserAsHost = (name, gameId, gameData = null) => {
    console.log('Setting user as host:', { name, gameId, gameData });
    const userData = {
      name: name.trim(),
      role: 'host',
      gameId
    };
    userRef.current = userData;
    setUser(userData);

    if (gameData) {
      setGameCreationData(gameData);
    }

    // Connect WebSocket for host
    connectWebSocket(gameId);
  };

  // Set user as player
  const setUserAsPlayer = (name, gameId, gameData = null) => {
    console.log('Setting user as player:', { name, gameId, gameData });
    const userData = {
      name: name.trim(),
      role: 'player',
      gameId
    };
    userRef.current = userData;
    setUser(userData);

    // Store the joined game data for player setup
    if (gameData) {
      setGameCreationData(gameData);
    }

    // Connect WebSocket for player
    connectWebSocket(gameId);
  };

  // Clear all user and game data
  const clearUser = () => {
    console.log('Clearing all user and game data');
    
    // Disconnect WebSocket first
    userRef.current = { name: '', role: null, gameId: null };
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
    // Teams only exist once the host has started, so that is the authoritative
    // signal; isStarted is just our local mirror of it.
    const gameStarted = Boolean(currentGame?.isStarted) ||
      (Array.isArray(currentGame?.teams) && currentGame.teams.length > 0);

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
        return hasGameId && hasRole && gameStarted && user.role === 'host';
      case 'leaderboard':
        return hasGameId && hasRole && gameStarted && user.role === 'player';
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
    lastSyncAt,
    
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
    refreshGameState,
    
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
