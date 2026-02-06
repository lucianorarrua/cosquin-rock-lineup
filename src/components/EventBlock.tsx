import type { FestivalEvent } from '../lib/types';
import { getEventLocalTime } from '../lib/data';
import { PX_PER_MINUTE } from '../lib/constants';
import { CheckIcon } from './Icons';

// ─── Event Block (desktop grid) ────────────────────────────────────

interface EventBlockProps {
  event: FestivalEvent;
  isSelected: boolean;
  readOnly: boolean;
  onToggle: (id: string) => void;
  gridStartMinute: number;
}

export function EventBlock({
  event,
  isSelected,
  readOnly,
  onToggle,
  gridStartMinute,
}: EventBlockProps) {
  const top = (event.startMinutes - gridStartMinute) * PX_PER_MINUTE;
  const height = Math.max(event.duration * PX_PER_MINUTE, 28);
  const startTime = getEventLocalTime(event.startAt);
  const endTime = getEventLocalTime(event.endAt);

  return (
    <button
      type="button"
      role="gridcell"
      aria-pressed={isSelected}
      aria-label={`${event.artist}, ${startTime} a ${endTime}, Escenario ${event.stage}${isSelected ? ', seleccionado' : ''}`}
      className="event-block"
      data-stage={event.stage}
      style={{ top: `${top}px`, height: `${height}px` }}
      onClick={() => !readOnly && onToggle(event.id)}
      tabIndex={0}
      disabled={readOnly}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          width: '100%',
        }}
      >
        <span className="event-artist">{event.artist}</span>
        {isSelected && (
          <div style={{ flexShrink: 0, opacity: 0.8 }}>
            <CheckIcon size={14} />
          </div>
        )}
      </div>
      {height >= 40 && (
        <span className="event-time">
          {startTime} - {endTime}
        </span>
      )}
    </button>
  );
}
