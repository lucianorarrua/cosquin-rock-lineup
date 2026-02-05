import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FestivalEvent } from '../lib/types';
import { generateGoogleCalendarUrl, generateICS, getEventLocalTime } from '../lib/data';
import { 
  CopyIcon, 
  ShareIcon, 
  XIcon,
  CalendarIcon, 
  CheckIcon, 
  GoogleIcon, 
  DownloadIcon, 
  EditIcon,
  ChevronDownIcon,
  MessageCircleIcon
} from './Icons';

// The events arrive from Astro with ISO string dates, so we parse them
interface SerializedEvent {
  id: string;
  artist: string;
  day: number;
  stage: string;
  startAt: string;
  endAt: string;
  startMinutes: number;
  endMinutes: number;
  duration: number;
}

interface SerializedSchedule {
  day: number;
  label: string;
  date: string;
  stages: {
    name: string;
    events: SerializedEvent[];
  }[];
  startMinute: number;
  endMinute: number;
}

function hydrateEvent(e: SerializedEvent): FestivalEvent {
  return {
    ...e,
    startAt: new Date(e.startAt),
    endAt: new Date(e.endAt),
  };
}

// ─── URL State helpers ─────────────────────────────────────────────
function getSelectedIdsFromURL(): Set<string> {
  const params = new URLSearchParams(window.location.search);
  const ids = params.get('ids');
  if (!ids) return new Set();
  return new Set(ids.split(',').filter(Boolean));
}

function isReadOnlyFromURL(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('view') === 'shared';
}

function updateURL(ids: Set<string>, readOnly: boolean) {
  const url = new URL(window.location.href);
  if (ids.size > 0) {
    url.searchParams.set('ids', [...ids].join(','));
  } else {
    url.searchParams.delete('ids');
  }
  if (readOnly) {
    url.searchParams.set('view', 'shared');
  } else {
    url.searchParams.delete('view');
  }
  window.history.replaceState({}, '', url.toString());
}

// ─── Constants ─────────────────────────────────────────────────────
const PX_PER_MINUTE = 2;

// ─── Sub-components ────────────────────────────────────────────────

interface EventBlockProps {
  event: FestivalEvent;
  isSelected: boolean;
  readOnly: boolean;
  onToggle: (id: string) => void;
  gridStartMinute: number;
}

function EventBlock({ event, isSelected, readOnly, onToggle, gridStartMinute }: EventBlockProps) {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        <span className="event-artist">{event.artist}</span>
        {isSelected && <div style={{ flexShrink: 0, opacity: 0.8 }}><CheckIcon size={14} /></div>}
      </div>
      {height >= 40 && (
        <span className="event-time">
          {startTime} - {endTime}
        </span>
      )}
    </button>
  );
}

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

function TimeAxis({ startMinute, endMinute }: TimeAxisProps) {
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
          style={{ top: `${(m - startMinute) * PX_PER_MINUTE + LABEL_OFFSET}px` }}
        >
          {formatHour(m)}
        </div>
      ))}
    </>
  );
}

// ─── Share / Export Panel ──────────────────────────────────────────

interface ActionPanelProps {
  selectedIds: Set<string>;
  allEvents: FestivalEvent[];
  readOnly: boolean;
  onSwitchToEdit: () => void;
}

function ActionPanel({ selectedIds, allEvents, readOnly, onSwitchToEdit }: ActionPanelProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedEvents = useMemo(
    () => allEvents.filter((e) => selectedIds.has(e.id)),
    [allEvents, selectedIds]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('ids', [...selectedIds].join(','));
    url.searchParams.set('view', 'shared');
    setShareUrl(url.toString());
  }, [selectedIds]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsShareMenuOpen(false);
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setIsShareMenuOpen(false);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setIsShareMenuOpen(false);
    }
  }, [shareUrl]);

  const handleShareWhatsApp = useCallback(() => {
    const text = encodeURIComponent(`¡Mirá mi agenda para el Cosquín Rock 2026! 🎸🔥\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setIsShareMenuOpen(false);
  }, [shareUrl]);

  const handleShareX = useCallback(() => {
    const text = encodeURIComponent(`¡Mi agenda para el Cosquín Rock 2026! 🎸🔥`);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    setIsShareMenuOpen(false);
  }, [shareUrl]);

  const handleExportICS = useCallback(() => {
    const ics = generateICS(selectedEvents);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cosquin-rock-2026.ics';
    a.click();
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  }, [selectedEvents]);

  const handleGoogleCalendar = useCallback(() => {
    if (selectedEvents.length === 0) return;
    for (const ev of selectedEvents) {
      window.open(generateGoogleCalendarUrl(ev), '_blank');
    }
    setIsExportMenuOpen(false);
  }, [selectedEvents]);

  if (readOnly) {
    return (
      <div className="action-panel">
        <div className="action-status">
          <div className="status-indicator active" />
          <span className="action-panel-text">
            Agenda compartida ({selectedIds.size} artistas)
          </span>
        </div>
        <button onClick={onSwitchToEdit} className="btn-primary">
          <EditIcon />
          Crear mi agenda
        </button>
      </div>
    );
  }

  if (selectedIds.size === 0) {
    return (
      <div className="action-panel-hint">
        <p>Seleccioná los artistas en la grilla para armar tu recorrido.</p>
      </div>
    );
  }

  return (
    <div className="action-panel">
      <div className="action-status">
        <div className="status-indicator active" />
        <span className="action-panel-text">
          {selectedIds.size} artista{selectedIds.size !== 1 ? 's' : ''} seleccionados
        </span>
      </div>

      <div className="action-menus" ref={menuRef}>
        <div className="menu-container">
          <button 
            className="btn-primary" 
            onClick={() => {
              setIsShareMenuOpen(!isShareMenuOpen);
              setIsExportMenuOpen(false);
            }}
            aria-haspopup="true"
            aria-expanded={isShareMenuOpen}
          >
            <ShareIcon />
            Compartir
            <ChevronDownIcon />
          </button>

          {isShareMenuOpen && (
            <div className="dropdown-menu">
              <button onClick={handleCopy} className="menu-item">
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? 'Copiado al portapapeles' : 'Copiar enlace'}
              </button>
              <button onClick={handleShareWhatsApp} className="menu-item">
                <MessageCircleIcon />
                Enviar por WhatsApp
              </button>
              <button onClick={handleShareX} className="menu-item">
                <XIcon />
                Compartir en X
              </button>
            </div>
          )}
        </div>

        <div className="menu-container">
          <button 
            className="btn-secondary" 
            onClick={() => {
              setIsExportMenuOpen(!isExportMenuOpen);
              setIsShareMenuOpen(false);
            }}
            aria-haspopup="true"
            aria-expanded={isExportMenuOpen}
          >
            <CalendarIcon />
            Exportar
            <ChevronDownIcon />
          </button>

          {isExportMenuOpen && (
            <div className="dropdown-menu">
              <button onClick={handleGoogleCalendar} className="menu-item">
                <GoogleIcon />
                Agregar a Google Calendar
              </button>
              <button onClick={handleExportICS} className="menu-item">
                <DownloadIcon />
                Descargar archivo ICS
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App Component ────────────────────────────────────────────

interface TimetableAppProps {
  schedules: SerializedSchedule[];
}

export default function TimetableApp({ schedules }: TimetableAppProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [readOnly, setReadOnly] = useState(false);
  const [activeDay, setActiveDay] = useState(1);

  // Hydrate from URL on mount
  useEffect(() => {
    setSelectedIds(getSelectedIdsFromURL());
    setReadOnly(isReadOnlyFromURL());
  }, []);

  // Sync to URL on change
  useEffect(() => {
    updateURL(selectedIds, readOnly);
  }, [selectedIds, readOnly]);

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
    () => schedules.flatMap((s) => s.stages.flatMap((st) => st.events.map(hydrateEvent))),
    [schedules]
  );

  // Also hydrate events for the current schedule rendering
  const hydratedSchedules = useMemo(
    () => schedules.map(s => ({
      ...s,
      stages: s.stages.map(st => ({
        ...st,
        events: st.events.map(hydrateEvent),
      })),
    })),
    [schedules]
  );

  const currentSchedule = hydratedSchedules.find((s) => s.day === activeDay) ?? hydratedSchedules[0];
  const gridHeight = (currentSchedule.endMinute - currentSchedule.startMinute) * PX_PER_MINUTE;

  // Generate hour grid lines
  const gridLines = useMemo(() => {
    const lines: number[] = [];
    for (let m = currentSchedule.startMinute; m <= currentSchedule.endMinute; m += 60) {
      lines.push(m);
    }
    return lines;
  }, [currentSchedule.startMinute, currentSchedule.endMinute]);

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

      {/* Actions */}
      <ActionPanel
        selectedIds={selectedIds}
        allEvents={allEvents}
        readOnly={readOnly}
        onSwitchToEdit={switchToEdit}
      />

      {/* Timetable Grid */}
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
              <TimeAxis startMinute={currentSchedule.startMinute} endMinute={currentSchedule.endMinute} />
            </div>
          </div>

          {/* Stage columns */}
          {currentSchedule.stages.map((stage) => (
            <div key={stage.name} className="stage-column">
              {/* Sticky stage header */}
              <div className="stage-header">
                <div className="stage-header-inner" data-stage={stage.name}>
                  <span className="stage-label-small">Escenario</span>
                  <span className="stage-label-large">{stage.name}</span>
                </div>
              </div>

              {/* Events container */}
              <div className="stage-events" style={{ height: `${gridHeight}px` }}>
                {/* Hour grid lines */}
                {gridLines.map((m) => (
                  <div
                    key={m}
                    className="grid-line"
                    style={{ top: `${(m - currentSchedule.startMinute) * PX_PER_MINUTE}px` }}
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
                    gridStartMinute={currentSchedule.startMinute}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected artists summary */}
      {selectedIds.size > 0 && (
        <div className="selected-summary">
          <h3 className="selected-title">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
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
