import React, { useMemo } from 'react';

/**
 * Soft drifting colour blobs behind a screen. Purely decorative: fixed, blurred
 * and pointer-events:none, so it never interferes with the content on top.
 */
const PALETTES = {
  purple: ['#a855f7', '#6366f1', '#ec4899', '#38bdf8'],
  warm: ['#fb7185', '#f59e0b', '#a855f7', '#34d399']
};

const Backdrop = ({ palette = 'purple' }) => {
  const blobs = useMemo(() => {
    const colors = PALETTES[palette] || PALETTES.purple;
    return [
      { color: colors[0], size: 340, top: '-8%', left: '-14%', delay: '0s' },
      { color: colors[1], size: 300, top: '58%', left: '62%', delay: '-6s' },
      { color: colors[2], size: 240, top: '22%', left: '72%', delay: '-11s' },
      { color: colors[3], size: 260, top: '72%', left: '-10%', delay: '-3s' }
    ];
  }, [palette]);

  return (
    <div className="backdrop" aria-hidden="true">
      {blobs.map((b, i) => (
        <span
          key={i}
          className="backdrop__blob"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            background: b.color,
            animationDelay: b.delay
          }}
        />
      ))}
    </div>
  );
};

export default Backdrop;
