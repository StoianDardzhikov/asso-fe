import { useEffect, useRef, useState } from 'react';

/**
 * Turns the round state published by the host into a live countdown.
 *
 * The backend sends how many seconds are left (computed from its own clock), so the
 * phone's clock being wrong does not matter. We anchor on that value the moment it
 * arrives and tick down locally between updates, which keeps the display smooth even
 * when updates come in every few seconds over polling.
 */
const useRoundTimer = (roundState) => {
  const active = Boolean(roundState?.active);
  const serverSeconds = Number.isFinite(roundState?.secondsLeft) ? roundState.secondsLeft : 0;
  // endsAt only changes when the host actually publishes something new, so using it as
  // the sync key stops every poll from restarting the countdown.
  const syncKey = `${roundState?.endsAt || 0}|${active}|${roundState?.round || 0}|${roundState?.contestantName || ''}`;

  const anchorRef = useRef({ seconds: serverSeconds, at: Date.now() });
  const [secondsLeft, setSecondsLeft] = useState(serverSeconds);

  useEffect(() => {
    anchorRef.current = { seconds: serverSeconds, at: Date.now() };
    setSecondsLeft(serverSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  useEffect(() => {
    if (!active) return undefined;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - anchorRef.current.at) / 1000);
      setSecondsLeft(Math.max(0, anchorRef.current.seconds - elapsed));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, syncKey]);

  return { secondsLeft, active };
};

export const formatTime = (seconds) => {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default useRoundTimer;
