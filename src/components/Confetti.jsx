import React, { useMemo } from 'react';

const COLORS = ['#fbbf24', '#f472b6', '#34d399', '#60a5fa', '#c084fc', '#fb7185'];

/**
 * A short burst of falling confetti. Rendered with a changing `burstKey` so React
 * remounts it and the CSS animation replays from the start on every point scored.
 */
const Confetti = ({ pieces = 26 }) => {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, () => ({
        left: Math.random() * 100,
        dx: `${Math.round((Math.random() - 0.5) * 220)}px`,
        spin: `${Math.round(360 + Math.random() * 720)}deg`,
        delay: `${Math.random() * 0.25}s`,
        duration: `${1.1 + Math.random() * 0.7}s`,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        round: Math.random() > 0.6
      })),
    [pieces]
  );

  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti__bit"
          style={{
            left: `${b.left}%`,
            background: b.color,
            borderRadius: b.round ? '50%' : '2px',
            animationDelay: b.delay,
            animationDuration: b.duration,
            '--dx': b.dx,
            '--spin': b.spin
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
