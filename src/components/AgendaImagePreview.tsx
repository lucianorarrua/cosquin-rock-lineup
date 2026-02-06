import { useMemo, forwardRef } from 'react';
import type { FestivalEvent } from '../lib/types';
import { getEventLocalTime } from '../lib/data';

// Stage colors matching global.css
const STAGE_COLORS: Record<
  string,
  { border: string; bg: string; text: string }
> = {
  Norte: { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5' },
  Sur: { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)', text: '#93c5fd' },
  Montaña: {
    border: '#10b981',
    bg: 'rgba(16, 185, 129, 0.2)',
    text: '#6ee7b7',
  },
  Boomerang: {
    border: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.2)',
    text: '#fcd34d',
  },
  Paraguay: {
    border: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.2)',
    text: '#c4b5fd',
  },
  'La Casita del Blues': {
    border: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.2)',
    text: '#67e8f9',
  },
  'La Plaza Electronic Stage': {
    border: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.2)',
    text: '#f9a8d4',
  },
  Sorpresa: {
    border: '#f97316',
    bg: 'rgba(249, 115, 22, 0.2)',
    text: '#fdba74',
  },
};

interface DaySchedule {
  day: number;
  label: string;
  date: string;
}

interface AgendaImagePreviewProps {
  selectedEvents: FestivalEvent[];
  schedules: DaySchedule[];
}

const AgendaImagePreview = forwardRef<HTMLDivElement, AgendaImagePreviewProps>(
  ({ selectedEvents, schedules }, ref) => {
    // Group events by day and then by stage
    const groupedByDay = useMemo(() => {
      const grouped = new Map<number, Map<string, FestivalEvent[]>>();

      for (const event of selectedEvents) {
        if (!grouped.has(event.day)) {
          grouped.set(event.day, new Map());
        }
        const dayMap = grouped.get(event.day)!;
        if (!dayMap.has(event.stage)) {
          dayMap.set(event.stage, []);
        }
        dayMap.get(event.stage)!.push(event);
      }

      // Sort events within each stage by start time
      for (const dayMap of grouped.values()) {
        for (const events of dayMap.values()) {
          events.sort((a, b) => a.startMinutes - b.startMinutes);
        }
      }

      return grouped;
    }, [selectedEvents]);

    // Get days that have events, sorted
    const daysWithEvents = useMemo(() => {
      return Array.from(groupedByDay.keys()).sort((a, b) => a - b);
    }, [groupedByDay]);

    if (selectedEvents.length === 0) {
      return null;
    }

    return (
      <div
        ref={ref}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '800px',
          padding: '32px',
          background:
            'linear-gradient(135deg, #0a0a0f 0%, #141418 50%, #0a0a0f 100%)',
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#e4e4e8',
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '28px',
            paddingBottom: '20px',
            borderBottom: '1px solid #2a2a35',
          }}
        >
          <h1
            style={{
              fontFamily: '"Impact", "Arial Black", sans-serif',
              fontSize: '28px',
              textTransform: 'uppercase',
              color: '#eab308',
              margin: '0 0 8px 0',
              letterSpacing: '0.05em',
              textShadow: '0 2px 10px rgba(234, 179, 8, 0.3)',
            }}
          >
            🎸 Mi Agenda Cosquín Rock 2026 🎸
          </h1>
          <p
            style={{
              color: '#8a8a96',
              margin: 0,
              fontSize: '14px',
            }}
          >
            {selectedEvents.length} artista
            {selectedEvents.length !== 1 ? 's' : ''} seleccionado
            {selectedEvents.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Days */}
        {daysWithEvents.map((day) => {
          const dayInfo = schedules.find((s) => s.day === day);
          const stagesMap = groupedByDay.get(day)!;
          const stages = Array.from(stagesMap.keys());

          return (
            <div key={day} style={{ marginBottom: '24px' }}>
              {/* Day Header */}
              <div
                style={{
                  background: '#1c1c22',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  border: '1px solid #2a2a35',
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#eab308',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Día {day} — {dayInfo?.label || ''}
                  <span
                    style={{
                      color: '#5a5a66',
                      fontWeight: '400',
                      fontSize: '13px',
                      marginLeft: '10px',
                      textTransform: 'none',
                    }}
                  >
                    {dayInfo?.date || ''}
                  </span>
                </h2>
              </div>

              {/* Stages Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                }}
              >
                {stages.map((stage) => {
                  const events = stagesMap.get(stage)!;
                  const stageColor = STAGE_COLORS[stage] || {
                    border: '#5a5a66',
                    bg: 'rgba(90, 90, 102, 0.2)',
                    text: '#8a8a96',
                  };

                  return (
                    <div
                      key={stage}
                      style={{
                        background: '#141418',
                        borderRadius: '10px',
                        border: `1px solid #2a2a35`,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Stage Header */}
                      <div
                        style={{
                          padding: '10px 14px',
                          borderBottom: `2px solid ${stageColor.border}`,
                          background: 'rgba(0,0,0,0.2)',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            color: '#5a5a66',
                            display: 'block',
                            marginBottom: '2px',
                          }}
                        >
                          Escenario
                        </span>
                        <span
                          style={{
                            fontFamily: '"Impact", "Arial Black", sans-serif',
                            fontSize: '14px',
                            color: stageColor.text,
                            textTransform: 'uppercase',
                          }}
                        >
                          {stage}
                        </span>
                      </div>

                      {/* Events */}
                      <div style={{ padding: '10px' }}>
                        {events.map((event) => (
                          <div
                            key={event.id}
                            style={{
                              background: stageColor.bg,
                              borderLeft: `3px solid ${stageColor.border}`,
                              borderRadius: '6px',
                              padding: '10px 12px',
                              marginBottom: '8px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#fff',
                                marginBottom: '6px',
                              }}
                            >
                              {event.artist}
                            </div>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#8a8a96',
                              }}
                            >
                              🕐 {getEventLocalTime(event.startAt)} -{' '}
                              {getEventLocalTime(event.endAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            paddingTop: '16px',
            marginTop: '8px',
            borderTop: '1px solid #2a2a35',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              color: '#5a5a66',
            }}
          >
            Generado en cosquin-rock.vercel.app
          </p>
        </div>
      </div>
    );
  }
);

AgendaImagePreview.displayName = 'AgendaImagePreview';

export default AgendaImagePreview;
