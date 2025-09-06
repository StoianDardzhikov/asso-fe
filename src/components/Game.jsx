import React, { useState, useEffect, useRef } from 'react';
import { useGame } from './GameContext';

const Game = ({ onBack }) => {
  const { 
    user, 
    currentGame, 
    clearUser,
    sendWebSocketMessage
  } = useGame();

  // Game state
  const [gameState, setGameState] = useState('waiting'); // 'waiting', 'playing', 'finished'
  const [currentRound, setCurrentRound] = useState(1); // 1, 2, 3
  const [contestants, setContestants] = useState([]);
  const [currentContestantIndex, setCurrentContestantIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState([]);
  const [currentWord, setCurrentWord] = useState('');
  const [wordVisible, setWordVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundActive, setRoundActive] = useState(false);
  const [wordsUsedInRound, setWordsUsedInRound] = useState(0);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [holdStarted, setHoldStarted] = useState(false); // Track when hold begins for timer position

  const gameTimerRef = useRef(null);
  const wordVisibilityTimerRef = useRef(null);
  const holdingRef = useRef(false); 
  const isEndingRoundRef = useRef(false);

  useEffect(() => {
    console.log('Компонент на играта е зареден, проверка на данни:');
    console.log('user:', user);
    console.log('currentGame:', currentGame);
    
    if (currentGame && currentGame.teams && currentGame.words && currentGame.teams.length > 0) {
      console.log('Инициализация на играта с валидни данни');
      initializeGame();
    } else {
      console.log('Очакване на данни за играта...');
    }
  }, [currentGame, user]);

  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (wordVisibilityTimerRef.current) clearTimeout(wordVisibilityTimerRef.current);
    };
  }, []);

  const initializeGame = () => {
    const teams = currentGame.teams;
    console.log('Използваме екипи от API:', teams);
    
    const contestantOrder = createContestantOrder(teams);
    
    setContestants(contestantOrder);
    setAvailableWords([...currentGame.words]);
    setGameState('waiting');
    setCurrentRound(1);
    setCurrentContestantIndex(0);
    setRoundsCompleted(0);
    
    console.log('Играта е инициализирана с участници:', contestantOrder);
    console.log('Налични думи:', currentGame.words);
  };

  const createContestantOrder = (teams) => {
    const order = [];
    let currentTeamIndex = 0;
    
    console.log('Създаване на ред за участниците за екипи:', teams.map(t => ({
      color: t.color,
      players: t.players.map(p => p.name)
    })));
    
    let playerIndex = -1;

    while (order.length < teams.length * currentGame.playersPerTeam) {
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
    
    console.log('Краен ред на участниците:', order.map(p => `${p.name} (Екип ${p.teamIndex})`));
    return order;
  };

  const getRoundDuration = (round) => {
    switch (round) {
      case 1: return 60; 
      case 2: return timeLeft === 0 ? 90 : 30 + timeLeft; 
      case 3: return timeLeft === 0 ? 60 : Math.min(60, timeLeft); 
      default: return 6;
    }
  };

  useEffect(() => {
    if (!roundActive) return;

    if (timeLeft === 0) {
      endContestantRound();
      return;
    }

    const id = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, roundActive]);

  const startContestantRound = () => {
    console.log("СТАРТИРАНЕ НА РАУНД");

    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }

    isEndingRoundRef.current = false;

    const duration = getRoundDuration(currentRound);
    setTimeLeft(duration);
    setRoundActive(true);
    setGameState('playing');
    setWordsUsedInRound(0);

    showRandomWord();
  };

  const showRandomWord = (immediateReveal = true) => {
    if (availableWords.length === 0) {
      handleWordsExhausted();
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableWords.length);
    const word = availableWords[randomIndex];
    
    setCurrentWord(word);
    setWordsUsedInRound(prev => prev + 1);
    setAvailableWords(prev => prev.filter((_, index) => index !== randomIndex));

    if (immediateReveal) {
      setWordVisible(true);
      wordVisibilityTimerRef.current = setTimeout(() => {
        if (!holdingRef.current) {
          setWordVisible(false);
        }
      }, 1000);
    } else {
      setWordVisible(false);
    }
  };

  const handleWordsExhausted = () => {
    if (roundsCompleted < 2) {
      setAvailableWords([...currentGame.words]);
      setRoundsCompleted(prev => prev + 1);
      console.log(`Думите са презаредени. Рунд ${roundsCompleted + 1} завършен.`);
    } else {
      endGame();
    }
  };

  const endContestantRound = () => {
    console.log("Завършване на рунд на участника");
    
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
    isEndingRoundRef.current = false;
    
    if (timeLeft <= 0) {
       setCurrentContestantIndex(prev => {
        const nextIndex = (prev + 1) % contestants.length; 
        console.log(`Преминаване от участник ${prev} (${contestants[prev]?.name}) към ${nextIndex} (${contestants[nextIndex]?.name})`);
        return nextIndex;
        });
    }    

    if (availableWords.length === 0) {
        console.log(`Всички участници завършиха рунд ${currentRound}. Преминаване към следващ рунд.`);
        handleWordsExhausted();

        setCurrentRound(prevRound => {
          const newRound = Math.min(prevRound + 1, 3);
          console.log(`Преминаване от рунд ${prevRound} към рунд ${newRound}`);
          return newRound;
        });
      }
  };

  const endGame = () => {
    setGameState('finished');
    setRoundActive(false);
    setHoldStarted(false);
    setIsHolding(false);
    holdingRef.current = false;
    isEndingRoundRef.current = false;
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
    }
    console.log('Играта приключи!');
  };

  const handleNextWord = async () => {
    const response = await fetch(`https://vurkolaci.fun/api/game/score?gameId=${currentGame.id}&playerId=${contestants[currentContestantIndex].id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Неуспешно зареждане на данни за играта: ${response.status} ${response.statusText}`);
      }

    if (!roundActive) return;
    
    if (wordVisibilityTimerRef.current) {
      clearTimeout(wordVisibilityTimerRef.current);
    }

    if (availableWords.length === 0) {
        endContestantRound();
        return;
    }

    showRandomWord(true);
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
    
    showRandomWord(true);
  };

  const handleScreenHold = (holding) => {
    console.log('Задържане на екрана:', holding, 'Текуща дума:', currentWord, 'Рунд активен:', roundActive);
    
    setIsHolding(holding);
    setHoldStarted(holding);
    holdingRef.current = holding; 
    
    if (!roundActive || !currentWord) return;
    
    if (holding) {
      if (wordVisibilityTimerRef.current) {
        clearTimeout(wordVisibilityTimerRef.current);
      }
      setTimeout(() => {
        if (holdingRef.current) {
          console.log('Показване на дума след закъснение:', currentWord);
          setWordVisible(true);
        }
      }, 200);
    } else {
      console.log('Скриване на дума при пускане');
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

  const hostContestant = contestants.find(contestant => contestant.name === user.name);
  const hostTeamColorName = hostContestant?.teamColor;
  const hostTeamColor = mapBulgarianColorToHex(hostTeamColorName);
  const currentContestant = contestants[currentContestantIndex];
  const hasRequiredData = currentGame && currentGame.teams && currentGame.words && contestants.length > 0;

  if (gameState === 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: hostTeamColor }}>
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Край на играта!</h1>
          <p className="text-gray-600 mb-6">Благодарим за участието в Асоциации!</p>
          <button
            onClick={handleLeaveGame}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Обратно към менюто
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
          <p className="text-gray-600">Зареждане на данни за играта...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col relative"
      onMouseDown={() => roundActive && handleScreenHold(true)}
      onMouseUp={() => roundActive && handleScreenHold(false)}
      onTouchStart={() => roundActive && handleScreenHold(true)}
      onTouchEnd={() => roundActive && handleScreenHold(false)}
      style={{ userSelect: 'none', backgroundColor: hostTeamColor }}
    >
      {gameState === 'waiting' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Следващ участник</h2>
            <div 
              className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 mb-6"
              style={currentContestant?.color ? { 
                backgroundColor: mapBulgarianColorToHex(currentContestant.color) + '40',
                borderColor: 'white',
                borderWidth: '2px'
              } : {}}
            >
              <p className="text-2xl font-semibold mb-2">{currentContestant?.name}</p>
              <p className="text-lg opacity-90">Екип {currentContestant?.color}</p>
              <p className="text-sm opacity-75 mt-2">Рунд {currentRound}/3</p>
            </div>
            <button
              onClick={startContestantRound}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-8 rounded-2xl text-xl transition-all transform hover:scale-105"
            >
              Старт на рунда
            </button>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div className={`absolute left-1/2 transform -translate-x-1/2 transition-all duration-300 ${
            (wordVisible && !holdStarted) || holdStarted ? 'top-32' : 'top-1/2 -translate-y-1/2'
          }`}>
            <div className={`text-center ${timeLeft <= 10 ? 'text-red-300' : 'text-white'}`}>
              <div className="text-6xl font-bold">
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {wordVisible && currentWord && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300">
              <div className="text-center text-white">
                <div className="text-5xl font-bold bg-black bg-opacity-30 backdrop-blur-sm rounded-2xl px-8 py-6">
                  {currentWord}
                </div>
              </div>
            </div>
          )}

          <div className="absolute top-8 left-8">
            <div 
              className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl px-4 py-2"
              style={currentContestant?.teamColor ? { 
                borderLeft: `4px solid ${mapBulgarianColorToHex(currentContestant.teamColor)}`
              } : {}}
            >
              <p className="text-white font-semibold">{currentContestant?.name}</p>
              <p className="text-white text-sm opacity-75">Екип {currentContestant?.teamIndex}</p>
            </div>
          </div>

          <div className="absolute bottom-8 left-0 right-0 px-8">
            <div className="flex space-x-4 max-w-md mx-auto">
              <button
                onClick={handleSkipWord}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-2xl text-lg transition-all transform active:scale-95"
              >
                Пропусни дума
              </button>
              <button
                onClick={handleNextWord}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-6 rounded-2xl text-lg transition-all transform active:scale-95"
              >
                Следваща дума
              </button>
            </div>
            
            <p className="text-center text-white text-sm mt-4 opacity-75">
              Натисни и задръж на екрана, за да се покаже думата
            </p>
          </div>
        </>
      )}

      <button
        onClick={handleLeaveGame}
        className="absolute top-8 right-8 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl transition-colors"
      >
        Изход
      </button>

    </div>
  );
};

export default Game;
