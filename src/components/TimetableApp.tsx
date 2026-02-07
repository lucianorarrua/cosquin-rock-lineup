import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { SerializedSchedule } from '../lib/types';
import { hydrateEvent } from '../lib/types';
import { PX_PER_MINUTE } from '../lib/constants';
import {
  getSelectedIdsFromURL,
  isReadOnlyFromURL,
  isShowOnlySelectedFromURL,
  updateURL,
} from '../lib/url-state';
import { useIsMobile } from '../hooks/useIsMobile';
import { CheckIcon, ListIcon, GridIcon, EyeOffIcon } from './Icons';
import { EventBlock } from './EventBlock';
import { TimeAxis } from './TimeAxis';
import { ActionPanel } from './ActionPanel';
import { MobileTimelineView } from './MobileTimelineView';

// ─── Main App Component ────────────────────────────────────────────

interface TimetableAppProps {
  schedules: SerializedSchedule[];
}

export default function TimetableApp({ schedules }: TimetableAppProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [readOnly, setReadOnly] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'list'>('auto');
  const isMobile = useIsMobile();
  const hasHydratedRef = useRef(false);

  // Determine effective view
  const showMobileView =
    viewMode === 'list' || (viewMode === 'auto' && isMobile);

  // Ensure component is mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Hydrate from URL on mount
  useEffect(() => {
    if (!mounted) return;
    setSelectedIds(getSelectedIdsFromURL());
    setReadOnly(isReadOnlyFromURL());
    setShowOnlySelected(isShowOnlySelectedFromURL());
    hasHydratedRef.current = true;
  }, [mounted]);

  // Sync to URL on change
  useEffect(() => {
    if (!mounted || !hasHydratedRef.current) return;
    updateURL(selectedIds, readOnly, showOnlySelected);
  }, [selectedIds, readOnly, showOnlySelected]);

  const toggleArtist = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const switchToEdit = useCallback(() => {
    setReadOnly(false);
  }, []);

  // Hydrate all events with Date objects
  const allEvents = useMemo(
    () =>
      schedules.flatMap((s) =>
        s.stages.flatMap((st) => st.events.map(hydrateEvent))
      ),
    [schedules]
  );

  // Also hydrate events for the current schedule rendering
  const hydratedSchedules = useMemo(
    () =>
      schedules.map((s) => ({
        ...s,
        stages: s.stages.map((st) => ({
          ...st,
          events: st.events.map(hydrateEvent),
        })),
      })),
    [schedules]
  );

  const currentSchedule =
    hydratedSchedules.find((s) => s.day === activeDay) ?? hydratedSchedules[0];

  // Filter schedule based on showOnlySelected - hide unselected events and empty stages
  const filteredSchedule = useMemo(() => {
    if (!showOnlySelected || selectedIds.size === 0) {
      return currentSchedule;
    }

    const filteredStages = currentSchedule.stages
      .map((stage) => ({
        ...stage,
        events: stage.events.filter((event) => selectedIds.has(event.id)),
      }))
      .filter((stage) => stage.events.length > 0);

    return {
      ...currentSchedule,
      stages: filteredStages,
    };
  }, [currentSchedule, showOnlySelected, selectedIds]);

  const gridHeight =
    (filteredSchedule.endMinute - filteredSchedule.startMinute) * PX_PER_MINUTE;

  // Generate hour grid lines
  const gridLines = useMemo(() => {
    const lines: number[] = [];
    for (
      let m = currentSchedule.startMinute;
      m <= currentSchedule.endMinute;
      m += 60
    ) {
      lines.push(m);
    }
    return lines;
  }, [currentSchedule.startMinute, currentSchedule.endMinute]);

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div
        style={{
          width: '100%',
          maxWidth: '100vw',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: '#888' }}>Cargando grilla...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100vw' }}>
      {/* Day Tabs */}
      <div className="day-tabs" role="tablist" aria-label="Días del festival">
        {hydratedSchedules.map((s) => (
          <button
            key={s.day}
            role="tab"
            aria-selected={activeDay === s.day}
            aria-controls={`day-panel-${s.day}`}
            className="day-tab"
            onClick={() => setActiveDay(s.day)}
          >
            Día {s.day} — {s.label}
          </button>
        ))}
      </div>

      {/* View Toggle (visible on mobile) */}
      {isMobile && (
        <div className="mobile-view-toggle">
          <button
            className={`mobile-view-toggle__btn ${showMobileView ? 'mobile-view-toggle__btn--active' : ''}`}
            onClick={() => setViewMode(showMobileView ? 'grid' : 'list')}
            aria-label={
              showMobileView
                ? 'Cambiar a vista grilla'
                : 'Cambiar a vista lista'
            }
            title={showMobileView ? 'Ver grilla' : 'Ver lista'}
          >
            {showMobileView ? <GridIcon size={16} /> : <ListIcon size={16} />}
            {showMobileView ? 'Ver grilla' : 'Ver timeline'}
          </button>
        </div>
      )}

      {/* Actions */}
      <ActionPanel
        selectedIds={selectedIds}
        allEvents={allEvents}
        readOnly={readOnly}
        onSwitchToEdit={switchToEdit}
        schedules={hydratedSchedules.map((s) => ({
          day: s.day,
          label: s.label,
          date: s.date,
        }))}
        showOnlySelected={showOnlySelected}
        onToggleShowOnlySelected={() => setShowOnlySelected((prev) => !prev)}
      />

      {/* Mobile Timeline View */}
      {showMobileView ? (
        <MobileTimelineView
          schedule={filteredSchedule}
          selectedIds={selectedIds}
          readOnly={readOnly}
          onToggle={toggleArtist}
          showOnlySelected={showOnlySelected}
          allSchedules={hydratedSchedules}
          onNavigateToDay={setActiveDay}
        />
      ) : filteredSchedule.stages.length === 0 && showOnlySelected ? (
        /* Empty state when filter is active but no selected artists in current day */
        <div className="empty-filtered-state">
          <div className="empty-filtered-state__content">
            <EyeOffIcon size={48} />
            <h3>No hay artistas seleccionados este día</h3>
            <p>Tu agenda no tiene artistas del día {currentSchedule.day}.</p>
            <button
              className="btn-secondary"
              onClick={() => {
                // Find next day or cycle back to first day
                const currentIndex = hydratedSchedules.findIndex(
                  (s) => s.day === activeDay
                );
                const nextIndex = (currentIndex + 1) % hydratedSchedules.length;
                setActiveDay(hydratedSchedules[nextIndex].day);
              }}
            >
              Ir al Día{' '}
              {
                hydratedSchedules[
                  (hydratedSchedules.findIndex((s) => s.day === activeDay) +
                    1) %
                    hydratedSchedules.length
                ].day
              }
            </button>
          </div>
        </div>
      ) : (
        /* Desktop Timetable Grid */
        <div
          id={`day-panel-${currentSchedule.day}`}
          role="tabpanel"
          aria-label={`Grilla día ${currentSchedule.day}`}
          className="timetable-wrapper"
        >
          <div className="timetable-inner">
            {/* Sticky time column */}
            <div className="time-column">
              <div className="time-corner" />
              <div className="time-body" style={{ height: `${gridHeight}px` }}>
                <TimeAxis
                  startMinute={filteredSchedule.startMinute}
                  endMinute={filteredSchedule.endMinute}
                />
              </div>
            </div>

            {/* Stage columns */}
            {filteredSchedule.stages.map((stage) => (
              <div key={stage.name} className="stage-column">
                {/* Sticky stage header */}
                <div className="stage-header">
                  <div className="stage-header-inner" data-stage={stage.name}>
                    <span className="stage-label-small">Escenario</span>
                    <span className="stage-label-large">{stage.name}</span>
                  </div>
                </div>

                {/* Events container */}
                <div
                  className="stage-events"
                  style={{ height: `${gridHeight}px` }}
                >
                  {/* Hour grid lines */}
                  {gridLines.map((m) => (
                    <div
                      key={m}
                      className="grid-line"
                      style={{
                        top: `${(m - filteredSchedule.startMinute) * PX_PER_MINUTE}px`,
                      }}
                    />
                  ))}

                  {/* Event blocks */}
                  {stage.events.map((event) => (
                    <EventBlock
                      key={event.id}
                      event={event}
                      isSelected={selectedIds.has(event.id)}
                      readOnly={readOnly}
                      onToggle={toggleArtist}
                      gridStartMinute={filteredSchedule.startMinute}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected artists summary */}
      {selectedIds.size > 0 && (
        <div className="selected-summary">
          <h3 className="selected-title">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckIcon /> Tu agenda ({selectedIds.size})
            </span>
          </h3>
          <div className="selected-tags">
            {allEvents
              .filter((e) => selectedIds.has(e.id))
              .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
              .map((e) => (
                <span key={e.id} className="selected-tag" data-stage={e.stage}>
                  {e.artist}
                  {!readOnly && (
                    <button
                      onClick={() => toggleArtist(e.id)}
                      className="selected-tag-remove"
                      aria-label={`Quitar ${e.artist}`}
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
