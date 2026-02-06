import { PX_PER_MINUTE } from '../lib/constants';

// ─── Time Axis (left column labels) ───────────────────────────────

function formatHour(normalizedMin: number): string {
  const totalMin = normalizedMin + 13 * 60; // add back grid base (14:00)
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

interface TimeAxisProps {
  startMinute: number;
  endMinute: number;
}

export function TimeAxis({ startMinute, endMinute }: TimeAxisProps) {
  const hours: number[] = [];
  for (let m = startMinute; m <= endMinute; m += 60) {
    hours.push(m);
  }
  const LABEL_OFFSET = 8;

  return (
    <>
      {hours.map((m) => (
        <div
          key={m}
          className="time-label"
          style={{
            top: `${(m - startMinute) * PX_PER_MINUTE + LABEL_OFFSET}px`,
          }}
        >
          {formatHour(m)}
        </div>
      ))}
    </>
  );
}
