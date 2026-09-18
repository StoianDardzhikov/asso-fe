import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from './GameContext';
import Backdrop from './Backdrop';
import { API_BASE } from '../config';

const GameSetup = ({ onBack, onSetupComplete }) => {
  const { user, currentGame, setCurrentGame, gameCreationData } = useGame();
  const [categoryWords, setCategoryWords] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Вземаме категориите от данните за създаване на игра.
  // useMemo, защото иначе `|| []` връща нов масив при всяко рендиране и
  // ефектът отдолу се завърта безкрайно.
  const categories = useMemo(
    () => gameCreationData?.categories || [],
    [gameCreationData]
  );

  // Инициализиране на categoryWords при зареждане на компонента
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
    setSubmitError(null);

    try {
      const setupData = {
        gameId: user.gameId,
        categoryWords: categoryWords
      };

      console.log('Изпращане на настройки за играта:', setupData);

      // API повикване за запазване на думите за всяка категория
      const response = await fetch(`${API_BASE}/game/join?playerName=${encodeURIComponent(user.name)}&gameId=${encodeURIComponent(user.gameId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(Object.values(categoryWords).flat())
      });

      if (!response.ok) {
        throw new Error(`HTTP грешка! статус: ${response.status}`);
      }

      const result = await response.json();
      console.log('Настройките на играта са завършени:', result);

      // Актуализиране на текущата игра с въведените думи
      setCurrentGame({
        ...currentGame,
        categoryWords: categoryWords,
        isSetupComplete: true
      });

      // Продължаване към лобито
      onSetupComplete();

    } catch (error) {
      // Преди тук се симулираше успех - играчът влизаше в лобито, без сървърът
      // изобщо да знае за него, и накрая не попадаше в нито един отбор.
      console.error('Грешка при настройката на играта:', error);
      setSubmitError('Неуспешно изпращане на думите. Провери връзката и опитай отново.');
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
    <div
      className="min-h-screen p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #6d28d9 0%, #4f46e5 45%, #1e3a8a 100%)' }}
    >
      <Backdrop palette="purple" />

      <div className="above max-w-lg mx-auto">

        {/* Заглавие */}
        <div className="text-center pt-8 pb-6 anim-rise">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-1">
            Твоите думи
          </h1>
          <p className="text-indigo-100 text-sm font-bold">
            По 2 думи за всяка категория
          </p>
          <span className="pill mt-3" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
            Игра #{user.gameId}
          </span>
        </div>

        <div className="card anim-pop mb-6">
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3" aria-hidden="true">🤔</div>
              <p className="font-bold mb-5" style={{ color: 'var(--ink-soft)' }}>
                Не са намерени категории. Върни се и създай играта първо.
              </p>
              <button onClick={onBack} className="btn btn--grape">← Назад</button>
            </div>
          ) : (
            <>
              {/* Прогрес */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="label mb-0">Прогрес</span>
                  <span
                    key={getCompletedCategories()}
                    className="text-sm font-extrabold anim-punch inline-block"
                    style={{ color: 'var(--grape)' }}
                  >
                    {getCompletedCategories()} / {categories.length}
                  </span>
                </div>
                <div className="w-full rounded-full h-3 overflow-hidden" style={{ background: '#ede9fe' }}>
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPercentage}%`,
                      background: 'linear-gradient(90deg, #a855f7, #6366f1)'
                    }}
                  />
                </div>
              </div>

              {/* Категории и думи */}
              <div className="space-y-4 stagger">
                {categories.map((category) => {
                  const done =
                    categoryWords[category] &&
                    categoryWords[category].every((w) => w.trim() !== '');

                  return (
                    <div
                      key={category}
                      className="rounded-3xl p-4 transition-all"
                      style={{
                        background: done ? '#f0fdf9' : '#f7f5ff',
                        border: `2.5px solid ${done ? '#a7f3d0' : '#e7e1ff'}`
                      }}
                    >
                      <h3
                        className="font-display text-lg font-bold mb-3 flex items-center gap-2"
                        style={{ color: 'var(--ink)' }}
                      >
                        <span aria-hidden="true">{done ? '✅' : '📚'}</span>
                        {category}
                      </h3>

                      <div className="space-y-2.5">
                        {[0, 1].map((wordIndex) => (
                          <input
                            key={wordIndex}
                            type="text"
                            value={categoryWords[category]?.[wordIndex] || ''}
                            onChange={(e) => updateWord(category, wordIndex, e.target.value)}
                            placeholder={`Дума ${wordIndex + 1}`}
                            className={`field ${
                              categoryWords[category]?.[wordIndex]?.trim() ? 'field--done' : ''
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Грешка */}
              {submitError && (
                <div
                  className="mt-5 p-3 rounded-2xl text-center anim-pop"
                  style={{ background: '#fff1f2', border: '2px solid #fecdd3' }}
                >
                  <p className="text-sm font-extrabold" style={{ color: '#e11d48' }}>{submitError}</p>
                </div>
              )}

              {/* Бутони */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={!isFormValid() || isSubmitting}
                  className="btn btn--mint btn--lg btn--block"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block w-5 h-5 rounded-full border-2 border-white border-t-transparent anim-spin-slow" />
                      Изпращам...
                    </>
                  ) : (
                    <>🚀 Готово</>
                  )}
                </button>

                <button onClick={onBack} disabled={isSubmitting} className="btn btn--quiet btn--block">
                  ← Назад
                </button>
              </div>
            </>
          )}
        </div>

        <div className="glass p-4 text-center text-white mb-8">
          <p className="text-sm font-extrabold mb-1">💡 Съвет</p>
          <p className="text-xs font-bold text-indigo-100">
            Избирай думи с ясна връзка, но не твърде очевидни!
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;
