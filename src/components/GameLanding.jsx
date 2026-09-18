import React from 'react';
import Backdrop from './Backdrop';

const TITLE = 'Асоциации';

const GameLanding = ({ onCreateGame, onJoinGame, version = "1.1.1" }) => {
  const handleJoinGame = () => {
    console.log('Натиснат бутон "Присъедини се към игра"');
    onJoinGame();
  };

  const handleCreateGame = () => {
    console.log('Натиснат бутон "Създай игра"');
    onCreateGame();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #6d28d9 0%, #4f46e5 45%, #1e3a8a 100%)' }}
    >
      <Backdrop palette="purple" />

      <div className="above text-center max-w-sm w-full">

        {/* Word mark - each letter drops in on its own */}
        <div className="mb-3 anim-bob">
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-white leading-none">
            {TITLE.split('').map((ch, i) => (
              <span
                key={i}
                className="inline-block anim-pop"
                style={{
                  animationDelay: `${i * 0.05}s`,
                  color: i >= 6 ? '#fde047' : undefined,
                  textShadow: '0 6px 0 rgba(0,0,0,0.18), 0 16px 32px rgba(0,0,0,0.3)'
                }}
              >
                {ch}
              </span>
            ))}
          </h1>
        </div>

        <p
          className="text-indigo-100 text-base font-bold mb-10 anim-fade"
          style={{ animationDelay: '0.55s' }}
        >
          Обяснявай. Отгатвай. Печели.
        </p>

        <div className="space-y-4 stagger" style={{ animationDelay: '0.6s' }}>
          <button onClick={handleJoinGame} className="btn btn--mint btn--lg btn--block">
            <span className="btn__sheen" />
            <span aria-hidden="true">🎮</span>
            Присъедини се
          </button>

          <button onClick={handleCreateGame} className="btn btn--sun btn--lg btn--block">
            <span aria-hidden="true">✨</span>
            Създай игра
          </button>
        </div>

        <div className="mt-10 flex items-center justify-center gap-5 text-indigo-200 text-xs font-bold anim-fade"
             style={{ animationDelay: '0.9s' }}>
          <span>👥 2+ отбора</span>
          <span>⏱️ 3 рунда</span>
          <span>📱 На телефон</span>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-10 text-white/50 text-xs font-bold">
        v{version}
      </div>
    </div>
  );
};

export default GameLanding;
