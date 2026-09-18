import React, { useState, useEffect, useRef } from 'react';
import { useGame } from './GameContext';
import { API_BASE } from '../config';

const Game = ({ onBack }) => {
  const { 
    user, 
    currentGame, 
    clearUser,
    sendWebSocketMessage
  } = useGame();

  // Game state
  const [gameState, setGameState] = useState('initializing'); // 'waiting', 'playing', 'finished'
  const [currentRound, setCurrentRound] = useState(0); // 1, 2, 3
  const [contestants, setContestants] = useState([]);
  const [currentContestantIndex, setCurrentContestantIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState([]);
  const [currentWord, setCurrentWord] = useState('');
  const [wordVisible, setWordVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundActive, setRoundActive] = useState(false);
  const [wordsUsedInRound, setWordsUsedInRound] = useState(0);
  const [roundsCompleted, setRoundsCompleted] = useState(-1);
  const [isHolding, setIsHolding] = useState(false);
  const [holdStarted, setHoldStarted] = useState(false); // Track when hold begins for timer position
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  
  // Refs for timers and state tracking
  const gameTimerRef = useRef(null);
  const wordVisibilityTimerRef = useRef(null);
  const holdingRef = useRef(false); // Use ref to track holding state for reliable checks
  const isEndingRoundRef = useRef(false); // Prevent double execution of round end
  const isInitializedRef = useRef(false); // The game is built once; later updates must not reset it
  const timeLeftRef = useRef(0); // Latest countdown value for the publisher below

  // Initialize game when component mounts
  useEffect(() => {
    console.log('Game component mounted, checking data:');
    console.log('user:', user);
    console.log('currentGame:', currentGame);
    
    // Only build the game once. currentGame keeps changing (scores, polling) and
    // re-running this would throw away the round in progress.
    if (isInitializedRef.current) {
      return;
    }

    if (currentGame && currentGame.teams && currentGame.words && currentGame.teams.length > 0) {
      console.log('Initializing game with valid data');
      isInitializedRef.current = true;
      initializeGame();
    } else {
      console.log('Waiting for game data...');
    }
  }, [currentGame, user]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (wordVisibilityTimerRef.current) clearTimeout(wordVisibilityTimerRef.current);
    };
  }, []);

  const initializeGame = () => {
    // Use teams data from API response
    const teams = currentGame.teams;
    console.log('Using teams from API:', teams);
    
    // Create contestant order: true round-robin ensuring no consecutive players from same team
    const contestantOrder = createContestantOrder(teams);
    
    setContestants(contestantOrder);
    setAvailableWords([...currentGame.words]);
    setGameState('waiting');
    setCurrentRound(0);
    setCurrentContestantIndex(0);
    setRoundsCompleted(-1);
    
    console.log('Game initialized with contestants:', contestantOrder);
    console.log('Available words:', currentGame.words);
  };

  const createContestantOrder = (teams) => {
    const order = [];
    let currentTeamIndex = 0;
    
    
    console.log('Creating contestant order for teams:', teams.map(t => ({
      color: t.color,
      players: t.players.map(p => p.name)
    })));
    
    let playerIndex = -1;

    while (order.length < teams.length * currentGame.playersPerTeam + 500) {
        playerIndex += order.length % teams.length === 0 ? 1 : 0;
        let team = teams[currentTeamIndex % teams.length];

        const player = {
            ...team.players[playerIndex % team.players.length],
            teamIndex: (currentTeamIndex % teams.length) + 1,
            teamColor: team.color,
            teamData: team,
            originalTeamIndex: currentTeamIndex
          };  

        order.push(player);
        currentTeamIndex++;
    }
    
    console.log('Final contestant order:', order.map(p => `${p.name} (Team ${p.teamIndex})`));
    return order;
  };

  const getRoundDuration = (round) => {
    switch (round) {
      case 1: return 60; // 1 minute
      case 2: return timeLeft === 0 ? 90 : 30 + timeLeft; // 1.5 minutes
      case 3: return timeLeft === 0 ? 60 : Math.min(60, timeLeft); // 1 minute
      default: return 6;
    }
  };


useEffect(() => {
  timeLeftRef.current = timeLeft;
}, [timeLeft]);

useEffect(() => {
  if (!roundActive) return;

  if (timeLeft === 0) {
    endContestantRound();
    return;
  }

  const id = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
  return () => clearTimeout(id);
}, [timeLeft, roundActive]);

  /**
   * Push the countdown to the backend so every player sees the same clock, both over the
   * websocket and through polling. We publish on changes (start / skip / end) plus a slow
   * heartbeat - the clients tick down locally in between, so this stays cheap.
   */
  const publishRoundState = async ({
    active,
    secondsLeft,
    round = currentRound + 1,
    contestant = contestants[currentContestantIndex],
    finished = false
  }) => {
    if (!currentGame?.id) return;

    const params = new URLSearchParams({
      gameId: String(currentGame.id),
      active: String(Boolean(active)),
      secondsLeft: String(Math.max(0, Math.round(secondsLeft || 0))),
      round: String(Math.min(Math.max(round, 0), 3)),
      finished: String(Boolean(finished))
    });
    if (contestant?.name) params.set('contestantName', contestant.name);
    if (contestant?.teamColor) params.set('teamColor', contestant.teamColor);

    try {
      await fetch(`${API_BASE}/game/round?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      // Purely informational for the other players - never break the host's round.
      console.error('Failed to publish round state:', error);
    }
  };

  // Heartbeat: re-publish the remaining time so late joiners and reconnecting
  // phones pick up an accurate countdown.
  useEffect(() => {
    if (!roundActive) return undefined;

    const id = setInterval(() => {
      publishRoundState({ active: true, secondsLeft: timeLeftRef.current });
    }, 10000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundActive, currentContestantIndex, currentRound]);


  const startContestantRound = () => {
    console.log("HERE!");

    // Clear any existing timer first
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }

    // Reset the ending flag
    isEndingRoundRef.current = false;

    const duration = getRoundDuration(currentRound + 1);
    setTimeLeft(duration);
    setRoundActive(true);
    setGameState('playing');
    setWordsUsedInRound(0);

    // Let the players' leaderboards start the same countdown.
    publishRoundState({ active: true, secondsLeft: duration });
    
    // // Start the countdown timer
    // gameTimerRef.current = setInterval(() => {
    //   setTimeLeft(prev => {
    //     if (prev <= 1) {
    //       console.log("END TIMER");
          
    //       console.log("Interval tick, prev =", prev, "isEndingRound =", isEndingRoundRef.current);
          
    //       // Check if we're already ending to prevent double execution
    //       if (isEndingRoundRef.current) {
    //         console.log("Already ending round, skipping...");
    //         return 0;
    //       }
          
    //       // Set the flag immediately
    //       isEndingRoundRef.current = true;
          
    //       // Clear the timer immediately
    //       if (gameTimerRef.current) {
    //         clearInterval(gameTimerRef.current);
    //         gameTimerRef.current = null;
    //       }
          
    //       // End the round
    //       endContestantRound();
    //       return 0;
    //     }
    //     return prev - 1;
    //   });
    // }, 1000);

    // Show first word
    showRandomWord();
  };

  useEffect(() => {
    console.log(availableWords);
  }, [availableWords])

    useEffect(() => {
    console.log("Word index", currentWordIndex);
  }, [currentWordIndex])

  const showRandomWord = (immediateReveal = true, avalWords = availableWords, excludeIndex = -1) => {

   if (avalWords.length === 0) {
      handleWordsExhausted();
      return;
    }

    // When skipping, the word that was just rejected must not come back immediately.
    // With only a handful of words left a plain random pick hit it very often.
    const candidateIndexes = avalWords
      .map((_, index) => index)
      .filter(index => index !== excludeIndex || avalWords.length === 1);

    const randomIndex = candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)];
    const word = avalWords[randomIndex];
    
    setCurrentWord(word);
    setCurrentWordIndex(randomIndex);
    setWordsUsedInRound(prev => prev + 1);


    // Remove word from available words


    if (immediateReveal) {
      // Normal behavior: show word for 1 second
      setWordVisible(true);
      
      // Hide word after 1 second
      wordVisibilityTimerRef.current = setTimeout(() => {
        if (!holdingRef.current) {
          setWordVisible(false);
        }
      }, 1000);
    } else {
      // For next/skip buttons: don't reveal immediately
      setWordVisible(false);
    }
  };

  useEffect(() => {
     if (availableWords.length === 0 && gameState != 'initializing') {
        console.log(`All contestants completed game round ${currentRound}. Moving to next game round.`);
        handleWordsExhausted();

        setCurrentRound(prevRound => {
          const newRound = Math.min(prevRound + 1, 3);
          console.log(`Moving from game round ${prevRound} to game round ${newRound}`);
          return newRound;
        });
    }
  }, [availableWords])

  const handleWordsExhausted = () => {
    console.log(availableWords);
    if (availableWords.length !== 0) {
      return;
    }
    if (roundsCompleted < 1) {
      // Refill words and continue
      setAvailableWords([...currentGame.words]);
      setRoundsCompleted(prev => prev + 1);
      console.log(`Words refilled. Round ${roundsCompleted + 1} completed.`);
    } else {
      // Game ends after third exhaustion
      endGame();
    }
  };

  const endContestantRound = () => {
    console.log("endContestantRound called");
    
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    
    setRoundActive(false);
    setWordVisible(false);
    setCurrentWord('');
    setGameState('waiting');
    setHoldStarted(false);
    setIsHolding(false);
    holdingRef.current = false;

    // Reset the ending flag for next round
    isEndingRoundRef.current = false;

    if (timeLeft <= 0) {
       const nextIndex = contestants.length ? (currentContestantIndex + 1) % contestants.length : 0;

       console.log(`Moving from contestant ${currentContestantIndex} (${contestants[currentContestantIndex]?.name}) to ${nextIndex} (${contestants[nextIndex]?.name})`);

       setCurrentContestantIndex(nextIndex);

       // Announce who is up next so the players' leaderboards show it while waiting.
       publishRoundState({ active: false, secondsLeft: 0, contestant: contestants[nextIndex] });
    } else {
       publishRoundState({ active: false, secondsLeft: 0 });
    }

  };

  const endGame = () => {
    setGameState('finished');
    publishRoundState({ active: false, secondsLeft: 0, finished: true });
    setRoundActive(false);
    setHoldStarted(false);
    setIsHolding(false);
    holdingRef.current = false;
    isEndingRoundRef.current = false;
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
    }
    console.log('Game finished!');
  };

  const handleNextWord = async () => {
    // Guard before scoring: a tap after the round ended must not award a point.
    if (!roundActive) return;

    const scoringPlayerId = contestants[currentContestantIndex]?.id;

    // The round must carry on even if the score request fails, otherwise a flaky
    // network freezes the game on the current word.
    try {
      const response = await fetch(
        `${API_BASE}/game/score?gameId=${currentGame.id}&playerId=${scoringPlayerId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        console.error(`Failed to register point: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to register point:', error);
    }

    const newAvalWords = availableWords.filter((_, index) => index !== currentWordIndex);
    setAvailableWords(newAvalWords);

    if (wordVisibilityTimerRef.current) {
      clearTimeout(wordVisibilityTimerRef.current);
    }

    if (newAvalWords.length === 0) {
        endContestantRound();
        return;
    }

    showRandomWord(true, newAvalWords);
  };

  const handleSkipWord = () => {
    if (!roundActive) return;

    if (wordVisibilityTimerRef.current) {
      clearTimeout(wordVisibilityTimerRef.current);
    }

    if (availableWords.length === 0) {
        endContestantRound();
        return;
    }

    const penalisedTime = timeLeft >= 15 ? timeLeft - 15 : 0;
    setTimeLeft(penalisedTime);
    publishRoundState({ active: penalisedTime > 0, secondsLeft: penalisedTime });

    // Pass the current index so the skipped word isn't drawn again straight away.
    showRandomWord(true, availableWords, currentWordIndex);
  };

  const handleScreenHold = (holding) => {
    console.log('Screen hold:', holding, 'Current word:', currentWord, 'Round active:', roundActive);
    
    setIsHolding(holding);
    setHoldStarted(holding);
    holdingRef.current = holding; // Update ref immediately
    
    if (!roundActive || !currentWord) return;
    
    if (holding) {
      // Clear any existing timer
      if (wordVisibilityTimerRef.current) {
        clearTimeout(wordVisibilityTimerRef.current);
      }
      
      // Small delay to let timer move up first, then show word
      setTimeout(() => {
        // Use ref for reliable state check
        if (holdingRef.current) {
          console.log('Showing word after delay:', currentWord);
          setWordVisible(true);
        }
      }, 200);
    } else {
      // Hide word immediately when releasing
      console.log('Hiding word on release');
      setWordVisible(false);
      setHoldStarted(false);
    }
  };

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

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Color mapping function for Bulgarian color names
  const mapBulgarianColorToHex = (colorName) => {
    const colorMap = {
      'Зелени': '#22C55E',    // Green
      'Сини': '#3B82F6',      // Blue
      'Червени': '#EF4444',   // Red
      'Оранжеви': '#F97316',  // Orange
      'Розови': '#EC4899',    // Pink
      'Бели': '#F8FAFC'       // White (light gray for better visibility)
    };
    
    return colorMap[colorName] || '#7C3AED'; // Default to purple if color not found
  };

  // Get host's team color for background
  const hostContestant = contestants.find(contestant => contestant.name === user.name);
  const hostTeamColorName = hostContestant?.teamColor;
  const hostTeamColor = mapBulgarianColorToHex(hostTeamColorName);

  const currentContestant = contestants[currentContestantIndex];

  // Check if we have all required data
  const hasRequiredData = currentGame && currentGame.teams && currentGame.words && contestants.length > 0;

  if (gameState === 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: hostTeamColor }}>
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Game Over!</h1>
          <p className="text-gray-600 mb-6">Thanks for playing Associations!</p>
          <button
            onClick={handleLeaveGame}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (!hasRequiredData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: hostTeamColor }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game data...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="game-screen flex flex-col relative"
      onMouseDown={() => roundActive && handleScreenHold(true)}
      onMouseUp={() => roundActive && handleScreenHold(false)}
      onTouchStart={() => roundActive && handleScreenHold(true)}
      onTouchEnd={() => roundActive && handleScreenHold(false)}
      style={{ userSelect: 'none', backgroundColor: hostTeamColor }}
    >
      
      {/* Top section with current player info */}
      {gameState === 'waiting' && (
        <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-4">
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Next Player</h2>
            <div 
              className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 mb-6"
              style={currentContestant?.color ? { 
                backgroundColor: mapBulgarianColorToHex(currentContestant.color) + '40',
                borderColor: 'white',
                borderWidth: '2px'
              } : {}}
            >
              <p className="text-2xl font-semibold mb-2">{currentContestant?.name}</p>
              <p className="text-lg opacity-90">Team {currentContestant?.color}</p>
              <p className="text-sm opacity-75 mt-2">Round {currentRound + 1}/3</p>
            </div>
            <button
              onClick={startContestantRound}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-8 rounded-2xl text-xl transition-all transform hover:scale-105"
            >
              Start Round
            </button>
          </div>
        </div>
      )}

      {/* Game playing state */}
      {gameState === 'playing' && (
        <>
          {/* Current player indicator */}
          <div className="absolute top-6 left-6 z-10">
            <div
              className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl px-4 py-2"
              style={currentContestant?.teamColor ? {
                borderLeft: `4px solid ${mapBulgarianColorToHex(currentContestant.teamColor)}`
              } : {}}
            >
              <p className="text-white font-semibold">{currentContestant?.name}</p>
              <p className="text-white text-sm opacity-75">Team {currentContestant?.teamIndex}</p>
            </div>
          </div>

          {/* Everything between the top bar and the buttons. flex-1 + min-h-0 means
              it absorbs whatever height is left, so the buttons below can never be
              pushed off the screen. */}
          <div className="flex-1 min-h-0 relative">
            {/* Timer: centred, or moved up while a word is on screen */}
            <div className={`game-timer-wrap absolute left-1/2 transform -translate-x-1/2 transition-all duration-300 ${
              wordVisible || holdStarted ? 'game-timer-wrap--raised top-24' : 'top-1/2 -translate-y-1/2'
            }`}>
              <div className={`text-center ${timeLeft <= 10 ? 'text-red-300' : 'text-white'}`}>
                <div className="game-timer text-6xl font-bold">
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>

            {/* Word in the center when visible */}
            {wordVisible && currentWord && (
              <div className="absolute top-1/2 left-1/2 w-full px-6 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300">
                <div className="text-center text-white">
                  <div className="game-word text-4xl sm:text-5xl font-bold bg-black bg-opacity-30 backdrop-blur-sm rounded-2xl px-6 py-5 break-words">
                    {currentWord}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom buttons - in normal flow, so always on screen */}
          <div className="game-screen__bottom shrink-0 px-6 pt-2">
            <div className="flex space-x-4 max-w-md mx-auto">
              <button
                onClick={handleSkipWord}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-2xl text-lg transition-all transform active:scale-95"
              >
                Skip Word
              </button>
              <button
                onClick={handleNextWord}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-6 rounded-2xl text-lg transition-all transform active:scale-95"
              >
                Next Word
              </button>
            </div>

            {/* Instructions */}
            <p className="text-center text-white text-sm mt-3 opacity-75">
              Hold anywhere to reveal word
            </p>
          </div>
        </>
      )}

      {/* Exit button */}
      <button
        onClick={handleLeaveGame}
        className="absolute top-6 right-6 z-10 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl transition-colors"
      >
        Exit
      </button>

    </div>
  );
};

export default Game;
