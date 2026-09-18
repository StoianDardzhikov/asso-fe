import React, { useState } from 'react';
import { useGame } from './GameContext';
import Backdrop from './Backdrop';
import { API_BASE } from '../config';

const CreateGame = ({ onBack, onGameCreated }) => {
  const [categories, setCategories] = useState(['']);
  const [playersPerTeam, setPlayersPerTeam] = useState(2);
  const [creatorName, setCreatorName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

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
    setCreateError(null);
    
    try {
      const gameConfig = {
        category: categories.filter(cat => cat.trim() !== ''),
        players: [{name: creatorName.trim()}],
        playersPerTeam: playersPerTeam
      };

      console.log('Изпращане на конфигурацията към бекенда:', gameConfig);

      const response = await fetch(`${API_BASE}/game`, {
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
      
      const gameId = result.gameId ?? result.id;
      if (gameId === undefined || gameId === null) {
        throw new Error('Бекендът не върна ID на играта');
      }

      setUserAsHost(creatorName.trim(), gameId, gameData);
      onGameCreated();

    } catch (error) {
      // Преди се създаваше фалшиво "DEMO" ID - играта изглеждаше създадена,
      // но никой не можеше да се присъедини към нея.
      console.error('Грешка при създаване на игра:', error);
      setCreateError('Неуспешно създаване на игра. Провери връзката и опитай отново.');

    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = () => {
    return creatorName.trim() !== '' && categories.some(cat => cat.trim() !== '') && playersPerTeam > 0;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #6d28d9 0%, #4f46e5 45%, #1e3a8a 100%)' }}
    >
      <Backdrop palette="purple" />

      <div className="above card max-w-md w-full anim-pop my-6">

        {/* Header */}
        <div className="text-center mb-7">
          <div className="text-4xl mb-2 anim-wiggle inline-block" aria-hidden="true">✨</div>
          <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--ink)' }}>
            Създай игра
          </h1>
          <p className="text-sm font-bold mt-1" style={{ color: 'var(--ink-soft)' }}>
            Нагласи играта за твоята компания
          </p>
        </div>

        <div className="space-y-6 stagger">

          {/* Name */}
          <div>
            <label className="label text-left" htmlFor="creator-name">👤 Твоето име</label>
            <input
              id="creator-name"
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="Въведи своето име..."
              className={`field ${creatorName.trim() ? 'field--done' : ''}`}
            />
          </div>

          {/* Categories */}
          <div>
            <label className="label text-left">📚 Категории</label>
            <div className="space-y-2.5">
              {categories.map((category, index) => (
                <div key={index} className="flex items-center gap-2 anim-pop">
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => updateCategory(index, e.target.value)}
                    placeholder={`Категория ${index + 1}`}
                    className={`field ${category.trim() ? 'field--done' : ''}`}
                  />
                  {categories.length > 1 && (
                    <button
                      onClick={() => removeCategory(index)}
                      className="icon-btn icon-btn--danger shrink-0"
                      aria-label={`Премахни категория ${index + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addCategory}
              className="mt-3 w-full py-3 px-4 rounded-2xl font-extrabold text-sm transition-all"
              style={{
                border: '2.5px dashed #d8d0ff',
                color: 'var(--grape)',
                background: 'transparent'
              }}
            >
              + Добави категория
            </button>
          </div>

          {/* Players per team */}
          <div>
            <label className="label text-left">👥 Играча на отбор</label>
            <div className="stepper">
              <button
                onClick={() => setPlayersPerTeam((n) => Math.max(1, n - 1))}
                disabled={playersPerTeam <= 1}
                className="icon-btn"
                aria-label="По-малко играчи"
              >
                −
              </button>
              <span key={playersPerTeam} className="stepper__value anim-punch">
                {playersPerTeam}
              </span>
              <button
                onClick={() => setPlayersPerTeam((n) => Math.min(10, n + 1))}
                disabled={playersPerTeam >= 10}
                className="icon-btn"
                aria-label="Повече играчи"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {createError && (
          <div
            className="mt-5 p-3 rounded-2xl text-center anim-pop"
            style={{ background: '#fff1f2', border: '2px solid #fecdd3' }}
          >
            <p className="text-sm font-extrabold" style={{ color: '#e11d48' }}>{createError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-7 space-y-3">
          <button
            onClick={handleCreateGame}
            disabled={!isFormValid() || isCreating}
            className="btn btn--mint btn--lg btn--block"
          >
            {isCreating ? (
              <>
                <span className="inline-block w-5 h-5 rounded-full border-2 border-white border-t-transparent anim-spin-slow" />
                Създавам...
              </>
            ) : (
              <>🚀 Създай игра</>
            )}
          </button>

          <button onClick={onBack} className="btn btn--quiet btn--block">
            ← Обратно към менюто
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGame;
