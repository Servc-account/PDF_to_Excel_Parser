import React, { useEffect, useRef, useState } from 'react';

const PARSING_TIME_PER_FILE = 650;
const REQUEST_TIME = 1_200;

const FUN_STATUSES: string[] = [
  'Crunching numbers…',
  'Extracting secrets from PDFs…',
  'Taming wild tables…',
  'Reconciling debits and credits…',
  'Straightening Excel columns…',
  'Herding rows into order…',
  'Polishing spreadsheets…',
  'Summoning formulas…',
  'Chasing runaway commas…',
  'Calming temperamental fonts…',
  'De-duplicating duplicates…',
  'Sanitizing data…',
  'Packing everything into .xlsx…'
];

interface ProgressBarProps {
  // When active becomes true, the bar animates toward ~90% over the estimated duration
  active: boolean;
  // Mark completion to animate to 100% and stop timers
  complete?: boolean;
  // Optional label to render above the bar
  label?: string;
  // ...or provide filesCount and perFileMs to derive total time
  filesCount?: number;
  // Optional className passthrough
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  active,
  complete = false,
  label,
  filesCount,
  className
}) => {
  const [percent, setPercent] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number>(0);
  const clearTimer = () => { if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; } };

  const [msgIndex, setMsgIndex] = useState<number>(0);
  const labelTimerRef = useRef<number | null>(null);
  const clearLabelTimer = () => { if (labelTimerRef.current) { window.clearInterval(labelTimerRef.current); labelTimerRef.current = null; } };

  useEffect(() => {
    // Start fake progress when active
    if (active) {
      clearTimer();
      const totalMs = REQUEST_TIME + (filesCount ?? 1) * PARSING_TIME_PER_FILE;
      animationStartTimeRef.current = Date.now();
      // Nudge off zero so the bar appears immediately
      setPercent((p) => (p > 2 ? p : 2));
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - animationStartTimeRef.current;
        const target = Math.min(90, Math.floor(100 * elapsed / totalMs));
        setPercent((prev) => (target > prev ? target : prev));
      }, 50);
    } else {
      // Reset when no longer active and not in a completed state
      if (!complete) setPercent(0);
      clearTimer();
    }
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, filesCount]);

  useEffect(() => {
    if (complete) {
      clearTimer();
      setPercent(100);
    }
    // If completion flag turns off later, do not auto-reset; parent controls active prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  // Rotate fun messages while active when no explicit label is given
  useEffect(() => {
    if (active && !label && !complete) {
      clearLabelTimer();
      labelTimerRef.current = window.setInterval(() => {
        setMsgIndex((i) => (i + 1) % FUN_STATUSES.length);
      }, 2_200);
    } else {
      clearLabelTimer();
      setMsgIndex(0);
    }
    return clearLabelTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, label, complete]);

  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));

  const computedLabel = label || (active && !complete ? FUN_STATUSES[msgIndex] : undefined);

  return (
    <div className={"glass overflow-hidden p-0.5 " + (className || '')} aria-label={computedLabel || 'Progress'}>
      <div className="relative h-0.75 w-full rounded-full bg-white-300">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-main-600 via-main-400 to-main-200 transition-[width] duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {computedLabel && <div className="p-0.5 font-[600] text-black-700 w-full text-center">{computedLabel}</div>}
    </div>
  );
};


