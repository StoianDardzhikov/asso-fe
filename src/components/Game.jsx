import React, { useState, useEffect, useRef } from 'react';
import { useGame } from './GameContext';
import { API_BASE } from '../config';
import Confetti from './Confetti';
import Results from './Results';

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
  const [roundDuration, setRoundDuration] = useState(60); // denominator for the countdown ring
  const [scoreBurst, setScoreBurst] = useState(0); // bumped on every point, replays the celebration
  
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
    finished = false,
    totalSeconds = 0
  }) => {
    if (!currentGame?.id) return;

    const params = new URLSearchParams({
      gameId: String(currentGame.id),
      active: String(Boolean(active)),
      secondsLeft: String(Math.max(0, Math.round(secondsLeft || 0))),
      round: String(Math.min(Math.max(round, 0), 3)),
      finished: String(Boolean(finished)),
      // 0 means "keep whatever total the backend already has", so the heartbeat
      // below doesn't have to resend it.
      totalSeconds: String(Math.max(0, Math.round(totalSeconds || 0)))
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
    setRoundDuration(duration);
    setRoundActive(true);
    setGameState('playing');
    setWordsUsedInRound(0);

    // Let the players' leaderboards start the same countdown.
    publishRoundState({ active: true, secondsLeft: duration, totalSeconds: duration });
    
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
        `${API_BASE}/game/score?gameId=${currentGame.id}&playerId=${scoringPlayerId}` +
          `&word=${encodeURIComponent(currentWord || '')}`,
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

    setScoreBurst(n => n + 1);

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

    const skippedWord = currentWord;
    const skippingPlayerId = contestants[currentContestantIndex]?.id;
    if (currentGame?.id && skippingPlayerId !== undefined) {
      fetch(
        `${API_BASE}/game/skip?gameId=${currentGame.id}&playerId=${skippingPlayerId}` +
          `&word=${encodeURIComponent(skippedWord || '')}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      ).catch(error => console.error('Failed to record skip:', error));
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

  // Countdown ring geometry
  const RING_R = 86;
  const RING_C = 2 * Math.PI * RING_R;
  const ringProgress = roundDuration > 0 ? Math.max(0, Math.min(1, timeLeft / roundDuration)) : 0;
  const ringOffset = RING_C * (1 - ringProgress);
  const ringTone =
    timeLeft <= 10 ? 'timer-ring__fill--danger' : timeLeft <= 25 ? 'timer-ring__fill--warn' : '';

  if (gameState === 'finished') {
    return (
      <div
        className="min-h-screen px-4"
        style={{ backgroundColor: hostTeamColor }}
      >
        <Results
          teams={currentGame?.teams || []}
          stats={currentGame?.stats}
          userName={user.name}
          lang="en"
          onBack={handleLeaveGame}
          backLabel="Back to Menu"
        />
      </div>
    );
  }

  if (!hasRequiredData) {
    return (
      <div
        className="game-screen flex items-center justify-center"
        style={{ backgroundColor: hostTeamColor }}
      >
        <div className="card text-center anim-pop">
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-full border-4 anim-spin-slow"
            style={{ borderColor: '#e7e1ff', borderTopColor: 'var(--grape)' }}
          />
          <p className="font-bold" style={{ color: 'var(--ink-soft)' }}>Loading game data...</p>
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
      {/* Soft vignette so white text stays readable on the lighter team colours */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.14), transparent 60%), linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.22) 100%)'
        }}
        aria-hidden="true"
      />

      {/* Waiting for the host to start this contestant's round */}
      {gameState === 'waiting' && (
        <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-5 relative">
          <div className="text-center w-full max-w-sm">
            <p className="text-white/80 text-sm font-extrabold uppercase tracking-widest mb-4 anim-fade">
              Next Player
            </p>

            <div className="glass p-6 mb-7 anim-pop">
              <div
                className="avatar mx-auto mb-3 anim-bob"
                style={{
                  background: mapBulgarianColorToHex(currentContestant?.teamColor),
                  width: '3.5rem',
                  height: '3.5rem',
                  fontSize: '1.375rem'
                }}
              >
                {(currentContestant?.name || '?').trim().charAt(0).toUpperCase()}
              </div>

              <p className="font-display text-3xl font-bold text-white mb-1 break-words">
                {currentContestant?.name}
              </p>
              <p className="text-white/85 font-bold">Team {currentContestant?.color}</p>

              <div className="flex justify-center gap-1.5 mt-4" aria-hidden="true">
                {[1, 2, 3].map((r) => (
                  <span
                    key={r}
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: r === currentRound + 1 ? '2rem' : '0.75rem',
                      background: r <= currentRound + 1 ? '#fff' : 'rgba(255,255,255,0.35)'
                    }}
                  />
                ))}
              </div>
              <p className="text-white/70 text-xs font-bold mt-2">Round {currentRound + 1}/3</p>
            </div>

            <button
              onClick={startContestantRound}
              className="btn btn--grape btn--lg btn--block anim-pop"
              style={{ animationDelay: '0.15s' }}
            >
              <span className="btn__sheen" />
              Start Round
            </button>
          </div>
        </div>
      )}

      {/* Game playing state */}
      {gameState === 'playing' && (
        <>
          {/* Current player indicator */}
          <div className="absolute top-5 left-5 z-10 anim-rise">
            <div className="glass px-3 py-2 flex items-center gap-2">
              <span
                className="avatar"
                style={{ background: mapBulgarianColorToHex(currentContestant?.teamColor), width: '1.75rem', height: '1.75rem', fontSize: '0.75rem' }}
              >
                {(currentContestant?.name || '?').trim().charAt(0).toUpperCase()}
              </span>
              <span className="game-chip__text">
                <span className="block text-white font-extrabold text-sm leading-tight">
                  {currentContestant?.name}
                </span>
                <span className="block text-white/70 text-xs font-bold leading-tight">
                  Round {currentRound + 1}/3
                </span>
              </span>
            </div>
          </div>

          {/* Everything between the top bar and the buttons. flex-1 + min-h-0 means
              it absorbs whatever height is left, so the buttons below can never be
              pushed off the screen. */}
          <div className="flex-1 min-h-0 relative">
            {/* Timer: centred, or moved up while a word is on screen */}
            <div className={`game-timer-wrap absolute left-1/2 transform -translate-x-1/2 transition-all duration-500 ${
              wordVisible || holdStarted ? 'game-timer-wrap--raised top-24' : 'top-1/2 -translate-y-1/2'
            }`}>
              <div className="relative flex items-center justify-center">
                {/* Ring drains as the round runs down */}
                <svg
                  className="timer-ring absolute"
                  width="196"
                  height="196"
                  viewBox="0 0 196 196"
                  style={{ transform: 'rotate(-90deg)' }}
                  aria-hidden="true"
                >
                  <circle className="timer-ring__track" cx="98" cy="98" r={RING_R} fill="none" strokeWidth="7" />
                  <circle
                    className={`timer-ring__fill ${ringTone}`}
                    cx="98"
                    cy="98"
                    r={RING_R}
                    fill="none"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={RING_C}
                    strokeDashoffset={ringOffset}
                  />
                </svg>

                <div
                  className={`game-timer font-display text-6xl font-bold tabular-nums ${
                    timeLeft <= 10 ? 'text-red-200 anim-breathe' : 'text-white'
                  }`}
                  style={{ textShadow: '0 4px 18px rgba(0,0,0,0.3)' }}
                >
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>

            {/* Word in the center when visible */}
            {wordVisible && currentWord && (
              <div className="absolute top-1/2 left-1/2 w-full px-5 transform -translate-x-1/2 -translate-y-1/2">
                <div
                  key={currentWord}
                  className="game-word font-display text-4xl sm:text-5xl font-bold text-center text-white rounded-3xl px-6 py-6 break-words mx-auto max-w-md"
                  style={{
                    background: 'rgba(15,10,40,0.42)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: '0 20px 50px -18px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.18)'
                  }}
                >
                  {currentWord}
                </div>
              </div>
            )}

            {/* "+1" flying up after a correct guess */}
            {scoreBurst > 0 && (
              <div key={scoreBurst} className="score-fly" aria-hidden="true">+1</div>
            )}
          </div>

          {/* Bottom buttons - in normal flow, so always on screen */}
          <div className="game-screen__bottom shrink-0 px-5 pt-2 relative z-10">
            <div className="flex gap-3 max-w-md mx-auto">
              <button onClick={handleSkipWord} className="btn btn--slate flex-1">
                <span aria-hidden="true">⏭</span>
                Skip Word
              </button>
              <button onClick={handleNextWord} className="btn btn--mint flex-1">
                <span aria-hidden="true">✓</span>
                Next Word
              </button>
            </div>

            <p className="text-center text-white/70 text-xs font-bold mt-3">
              Hold anywhere to reveal word
            </p>
          </div>

          {/* Confetti replays on each new point because the key changes */}
          {scoreBurst > 0 && <Confetti key={`c-${scoreBurst}`} pieces={22} />}
        </>
      )}

      {/* Exit button */}
      <div className="absolute top-5 right-5 z-20">
        <button onClick={handleLeaveGame} className="btn btn--cherry btn--sm">
          Exit
        </button>
      </div>
    </div>
  );
};

export default Game;
