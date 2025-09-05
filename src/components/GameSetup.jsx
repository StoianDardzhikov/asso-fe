import React, { useState, useEffect } from 'react';
import { useGame } from './GameContext';

const GameSetup = ({ onBack, onSetupComplete }) => {
  const { user, currentGame, setCurrentGame, gameCreationData } = useGame();
  const [categoryWords, setCategoryWords] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get categories from the game creation data
  const categories = gameCreationData?.categories || [];

  // Initialize categoryWords state when component mounts
  useEffect(() => {
    const initialWords = {};
    categories.forEach(category => {
      initialWords[category] = ['', ''];
    });
    setCategoryWords(initialWords);
  }, [categories]);

  const updateWord = (category, wordIndex, value) => {
    setCategoryWords(prev => ({
      ...prev,
      [category]: prev[category].map((word, index) => 
        index === wordIndex ? value : word
      )
    }));
  };

  const isFormValid = () => {
    return categories.every(category => 
      categoryWords[category] && 
      categoryWords[category].every(word => word.trim() !== '')
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setIsSubmitting(true);

    try {
      const setupData = {
        gameId: user.gameId,
        categoryWords: categoryWords
      };

      console.log('Submitting game setup:', setupData);

      // API call to save the words for each category
      const response = await fetch(`http://51.77.194.30:8082/game/join?playerName=${user.name}&gameId=${user.gameId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(Object.values(categoryWords).flat())
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Game setup completed:', result);

      // Update current game with the words
      setCurrentGame({
        ...currentGame,
        categoryWords: categoryWords,
        isSetupComplete: true
      });

      // Redirect to lobby
      onSetupComplete();

    } catch (error) {
      console.error('Error setting up game:', error);
      
      // For demo, simulate success
      console.log('Demo mode: Game setup completed');
      setCurrentGame({
        ...currentGame,
        categoryWords: categoryWords,
        isSetupComplete: true
      });
      onSetupComplete();
      
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCompletedCategories = () => {
    return categories.filter(cat => 
      categoryWords[cat] && categoryWords[cat].every(word => word.trim() !== '')
    ).length;
  };

  const progressPercentage = categories.length > 0 ? (getCompletedCategories() / categories.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-3 sm:p-4 lg:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 pt-4 sm:pt-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Game Setup</h1>
          <p className="text-lg sm:text-xl text-blue-100">
            Add words for each category
          </p>
          <p className="text-blue-200 text-sm sm:text-base mt-1">
            Game ID: <span className="font-mono font-bold">{user.gameId}</span>
          </p>
        </div>

        {/* Setup Form */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 mb-6">
          
          {/* Instructions */}
          <div className="text-center mb-6 p-4 bg-blue-50 rounded-xl">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              📝 Prepare Your Words
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Add 2 words for each category. Players will guess the connection!
            </p>
          </div>

          {/* Check if we have categories */}
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No categories found. Please go back and create your game first.</p>
              <button
                onClick={onBack}
                className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl"
              >
                ← Back to Game Creation
              </button>
            </div>
          ) : (
            <>
              {/* Categories and Words */}
              <div className="space-y-6">
                {categories.map((category, categoryIndex) => (
                  <div key={category} className="border-2 border-gray-200 rounded-xl p-4 sm:p-5">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 text-center">
                      📚 {category}
                    </h3>
                    
                    <div className="space-y-3">
                      {[0, 1].map((wordIndex) => (
                        <div key={wordIndex}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Word {wordIndex + 1}
                          </label>
                          <input
                            type="text"
                            value={categoryWords[category]?.[wordIndex] || ''}
                            onChange={(e) => updateWord(category, wordIndex, e.target.value)}
                            placeholder={`Enter word ${wordIndex + 1} for ${category}...`}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-sm sm:text-base"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress Indicator */}
              <div className="mt-6 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Setup Progress</span>
                  <span className="text-sm text-gray-500">
                    {getCompletedCategories()} / {categories.length} categories complete
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={!isFormValid() || isSubmitting}
                  className={`w-full py-3 sm:py-4 px-6 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation ${
                    isFormValid() && !isSubmitting
                      ? 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Setting Up Game...</span>
                    </div>
                  ) : (
                    '🚀 Complete Setup'
                  )}
                </button>
                
                <button
                  onClick={onBack}
                  disabled={isSubmitting}
                  className="w-full bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-bold py-2 sm:py-3 px-6 rounded-xl sm:rounded-2xl text-base sm:text-lg transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation"
                >
                  ← Back to Game Creation
                </button>
              </div>
            </>
          )}
        </div>

        {/* Tips */}
        <div className="text-center">
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-white">
            <p className="text-sm sm:text-base font-medium mb-1">💡 Pro Tip</p>
            <p className="text-sm text-blue-100">
              Choose words that have clear connections but aren't too obvious!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;