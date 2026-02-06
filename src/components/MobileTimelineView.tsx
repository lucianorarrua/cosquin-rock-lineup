import { useState, useMemo, useRef } from 'react';
import type { FestivalEvent } from '../lib/types';
import { getEventLocalTime } from '../lib/data';
import {
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  FilterIcon,
} from './Icons';

// ─── Mobile Event Card ─────────────────────────────────────────────

interface MobileEventCardProps {
  event: FestivalEvent;
  isSelected: boolean;
  readOnly: boolean;
  onToggle: (id: string) => void;
}

function MobileEventCard({
  event,
  isSelected,
  readOnly,
  onToggle,
}: MobileEventCardProps) {
  const startTime = getEventLocalTime(event.startAt);
  const endTime = getEventLocalTime(event.endAt);

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={`${event.artist}, ${startTime} a ${endTime}, Escenario ${event.stage}${isSelected ? ', seleccionado' : ''}`}
      className={`mobile-event-card ${isSelected ? 'mobile-event-card--selected' : ''}`}
      data-stage={event.stage}
      onClick={() => !readOnly && onToggle(event.id)}
      disabled={readOnly}
    >
      <div className="mobile-event-card__accent" data-stage={event.stage} />
      <div className="mobile-event-card__body">
        <div className="mobile-event-card__top">
          <span className="mobile-event-card__artist">{event.artist}</span>
          {isSelected && (
            <div className="mobile-event-card__check">
              <CheckIcon size={16} />
            </div>
          )}
        </div>
        <div className="mobile-event-card__meta">
          <span className="mobile-event-card__time">
            <ClockIcon size={12} />
            {startTime} – {endTime}
          </span>
          <span className="mobile-event-card__stage" data-stage={event.stage}>
            <MapPinIcon size={12} />
            {event.stage}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Stage Filter Chips ────────────────────────────────────────────

interface StageFilterProps {
  stages: string[];
  activeStage: string | null;
  onSelect: (stage: string | null) => void;
}

function StageFilter({ stages, activeStage, onSelect }: StageFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mobile-stage-filter">
      <div className="mobile-stage-filter__header">
        <FilterIcon size={14} />
        <span>Escenarios</span>
      </div>
      <div className="mobile-stage-filter__chips" ref={scrollRef}>
        <button
          className={`mobile-stage-chip ${activeStage === null ? 'mobile-stage-chip--active' : ''}`}
          onClick={() => onSelect(null)}
        >
          Todos
        </button>
        {stages.map((stage) => (
          <button
            key={stage}
            className={`mobile-stage-chip ${activeStage === stage ? 'mobile-stage-chip--active' : ''}`}
            data-stage={stage}
            onClick={() => onSelect(activeStage === stage ? null : stage)}
          >
            <span className="mobile-stage-chip__dot" data-stage={stage} />
            {stage}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Group events by hour helper ───────────────────────────────────

interface TimeGroup {
  label: string;
  events: FestivalEvent[];
}

function groupEventsByHour(events: FestivalEvent[]): TimeGroup[] {
  const groups = new Map<string, FestivalEvent[]>();

  for (const event of events) {
    const time = getEventLocalTime(event.startAt);
    const hour = time.split(':')[0] + ':00';
    if (!groups.has(hour)) {
      groups.set(hour, []);
    }
    groups.get(hour)!.push(event);
  }

  return Array.from(groups.entries())
    .sort((a, b) => {
      // Sort by start minutes of first event in each group
      const aMin = a[1][0].startMinutes;
      const bMin = b[1][0].startMinutes;
      return aMin - bMin;
    })
    .map(([label, events]) => ({
      label,
      events: events.sort((a, b) => a.startMinutes - b.startMinutes),
    }));
}

// ─── Mobile Timeline View ──────────────────────────────────────────

interface MobileTimelineViewProps {
  schedule: {
    day: number;
    label: string;
    date: string;
    stages: { name: string; events: FestivalEvent[] }[];
    startMinute: number;
    endMinute: number;
  };
  selectedIds: Set<string>;
  readOnly: boolean;
  onToggle: (id: string) => void;
}

export function MobileTimelineView({
  schedule,
  selectedIds,
  readOnly,
  onToggle,
}: MobileTimelineViewProps) {
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const stageNames = useMemo(
    () => schedule.stages.map((s) => s.name),
    [schedule.stages]
  );

  const allEvents = useMemo(
    () => schedule.stages.flatMap((s) => s.events),
    [schedule.stages]
  );

  const filteredEvents = useMemo(
    () =>
      activeStage
        ? allEvents.filter((e) => e.stage === activeStage)
        : allEvents,
    [allEvents, activeStage]
  );

  const timeGroups = useMemo(
    () => groupEventsByHour(filteredEvents),
    [filteredEvents]
  );

  const totalSelected = useMemo(
    () => allEvents.filter((e) => selectedIds.has(e.id)).length,
    [allEvents, selectedIds]
  );

  return (
    <div className="mobile-timeline">
      {/* Stage filter chips */}
      <StageFilter
        stages={stageNames}
        activeStage={activeStage}
        onSelect={setActiveStage}
      />

      {/* Quick stats */}
      {totalSelected > 0 && (
        <div className="mobile-timeline__stats">
          <CheckIcon size={14} />
          <span>
            {totalSelected} artista{totalSelected !== 1 ? 's' : ''} en tu agenda
          </span>
        </div>
      )}

      {/* Timeline */}
      <div className="mobile-timeline__list">
        {timeGroups.map((group) => (
          <div key={group.label} className="mobile-time-group">
            <div className="mobile-time-group__header">
              <div className="mobile-time-group__line" />
              <span className="mobile-time-group__label">{group.label}</span>
              <div className="mobile-time-group__line" />
            </div>
            <div className="mobile-time-group__events">
              {group.events.map((event) => (
                <MobileEventCard
                  key={event.id}
                  event={event}
                  isSelected={selectedIds.has(event.id)}
                  readOnly={readOnly}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="mobile-timeline__empty">
          <p>No hay eventos para este filtro.</p>
        </div>
      )}
    </div>
  );
}
