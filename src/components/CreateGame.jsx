import React, { useState } from 'react';
import { useGame } from './GameContext';

const CreateGame = ({ onBack, onGameCreated }) => {
  const [categories, setCategories] = useState(['']);
  const [playersPerTeam, setPlayersPerTeam] = useState(2);
  const [creatorName, setCreatorName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { setUserAsHost } = useGame();

  const addCategory = () => {
    setCategories([...categories, '']);
  };

  const removeCategory = (index) => {
    if (categories.length > 1) {
      const newCategories = categories.filter((_, i) => i !== index);
      setCategories(newCategories);
    }
  };

  const updateCategory = (index, value) => {
    const newCategories = [...categories];
    newCategories[index] = value;
    setCategories(newCategories);
  };

  const handleCreateGame = async () => {
    setIsCreating(true);
    
    try {
      const gameConfig = {
        category: categories.filter(cat => cat.trim() !== ''),
        players: [{name: creatorName.trim()}],
        playersPerTeam: playersPerTeam
      };

      console.log('Изпращане на конфигурацията към бекенда:', gameConfig);

      const response = await fetch('https://vurkolaci.fun/api/game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(gameConfig)
      });

      if (!response.ok) {
        throw new Error(`HTTP грешка! статус: ${response.status}`);
      }

      const result = await response.json();

      console.log(result);
      console.log('Играта беше създадена успешно:', result);
      
      const gameData = {
        categories: categories.filter(cat => cat.trim() !== ''),
        playersPerTeam: playersPerTeam
      };
      
      setUserAsHost(creatorName.trim(), result.gameId || result.id || 'DEMO123', gameData);
      onGameCreated();
      
    } catch (error) {
      console.error('Грешка при създаване на игра:', error);
      
      const mockGameId = 'DEMO' + Math.random().toString(36).substr(2, 6).toUpperCase();
      console.log('Демо режим: Играта беше създадена с ID:', mockGameId);
      
      const gameData = {
        categories: categories.filter(cat => cat.trim() !== ''),
        playersPerTeam: playersPerTeam
      };
      
      setUserAsHost(creatorName.trim(), mockGameId, gameData);
      onGameCreated();
      
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = () => {
    return creatorName.trim() !== '' && categories.some(cat => cat.trim() !== '') && playersPerTeam > 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 max-w-sm sm:max-w-md w-full mx-2">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Създай Игра</h1>
          <p className="text-gray-600 text-sm sm:text-base">Настрой своята игра Асоциации</p>
        </div>

        {/* Creator Name Section */}
        <div className="mb-6 sm:mb-8">
          <label className="block text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4">
            👤 Твоето име
          </label>
          <input
            type="text"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            placeholder="Въведи своето име..."
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-sm sm:text-base"
          />
        </div>

        {/* Categories Section */}
        <div className="mb-6 sm:mb-8">
          <label className="block text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4">
            📚 Категории
          </label>
          <div className="space-y-2 sm:space-y-3">
            {categories.map((category, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => updateCategory(index, e.target.value)}
                  placeholder={`Категория ${index + 1}`}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-sm sm:text-base"
                />
                {categories.length > 1 && (
                  <button
                    onClick={() => removeCategory(index)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors touch-manipulation min-w-[40px] flex items-center justify-center"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {/* Add Category Button */}
          <button
            onClick={addCategory}
            className="mt-2 sm:mt-3 w-full py-2 sm:py-3 px-3 sm:px-4 border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base touch-manipulation"
          >
            <span className="text-lg">+</span>
            <span>Добави категория</span>
          </button>
        </div>

        {/* Players Per Team Section */}
        <div className="mb-6 sm:mb-8">
          <label className="block text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4">
            👥 Играча на отбор
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={playersPerTeam}
            onChange={(e) => setPlayersPerTeam(parseInt(e.target.value) || 1)}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-center text-lg sm:text-xl font-bold"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 sm:space-y-3">
          <button
            onClick={handleCreateGame}
            disabled={!isFormValid() || isCreating}
            className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation ${
              isFormValid() && !isCreating
                ? 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isCreating ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Създавам игра...</span>
              </div>
            ) : (
              '🚀 Създай Игра'
            )}
          </button>
          
          <button
            onClick={onBack}
            className="w-full py-2 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-base sm:text-lg font-medium bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation"
          >
            ← Обратно към менюто
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGame;
