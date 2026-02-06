import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { FestivalEvent } from '../lib/types';
import { generateICS, getEventLocalTime } from '../lib/data';
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
  MessageCircleIcon,
  ClockIcon,
  MapPinIcon,
  FilterIcon,
  ListIcon,
  GridIcon,
  ImageIcon,
} from './Icons';
import Toast from './Toast';
import AgendaImagePreview from './AgendaImagePreview';

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

function EventBlock({
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

// ─── Share / Export Panel ──────────────────────────────────────────

interface ScheduleInfo {
  day: number;
  label: string;
  date: string;
}

interface ActionPanelProps {
  selectedIds: Set<string>;
  allEvents: FestivalEvent[];
  readOnly: boolean;
  onSwitchToEdit: () => void;
  schedules: ScheduleInfo[];
}

function ActionPanel({
  selectedIds,
  allEvents,
  readOnly,
  onSwitchToEdit,
  schedules,
}: ActionPanelProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const agendaImageRef = useRef<HTMLDivElement>(null);

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
    const text = encodeURIComponent(
      `¡Mirá mi agenda para el Cosquín Rock 2026! 🎸🔥\n${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setIsShareMenuOpen(false);
  }, [shareUrl]);

  const handleShareX = useCallback(() => {
    const text = encodeURIComponent(
      `¡Mi agenda para el Cosquín Rock 2026! 🎸🔥`
    );
    const url = encodeURIComponent(shareUrl);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank'
    );
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
    setShowToast(true);
  }, [selectedEvents]);

  const handleGoogleCalendar = useCallback(() => {
    if (selectedEvents.length === 0) return;
    const ics = generateICS(selectedEvents);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cosquin-rock-2026.ics';
    a.click();
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
    setShowToast(true);
  }, [selectedEvents]);

  const handleExportImage = useCallback(async () => {
    if (!agendaImageRef.current || selectedEvents.length === 0) return;

    setIsExportingImage(true);
    setIsExportMenuOpen(false);

    try {
      // Small delay to allow menu to close and component to render
      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(agendaImageRef.current, {
        backgroundColor: '#0a0a0f',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = 'mi-agenda-cosquin-rock-2026.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsExportingImage(false);
    }
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
                  Importar en Google Calendar
                </button>
                <button onClick={handleExportICS} className="menu-item">
                  <DownloadIcon />
                  Descargar archivo ICS
                </button>
                <button
                  onClick={handleExportImage}
                  className="menu-item"
                  disabled={isExportingImage}
                >
                  <ImageIcon />
                  {isExportingImage ? 'Generando...' : 'Descargar imagen'}
                </button>
              </div>
            )}
          </div>
        </div>

        <button onClick={onSwitchToEdit} className="btn-secondary">
          <EditIcon />
          Crear mi agenda
        </button>

        {/* Hidden component for image export */}
        <AgendaImagePreview
          ref={agendaImageRef}
          selectedEvents={selectedEvents}
          schedules={schedules}
        />
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
          {selectedIds.size} artista{selectedIds.size !== 1 ? 's' : ''}{' '}
          seleccionado{selectedIds.size !== 1 ? 's' : ''}
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
                Importar en Google Calendar
              </button>
              <button onClick={handleExportICS} className="menu-item">
                <DownloadIcon />
                Descargar archivo ICS
              </button>
              <button
                onClick={handleExportImage}
                className="menu-item"
                disabled={isExportingImage}
              >
                <ImageIcon />
                {isExportingImage ? 'Generando...' : 'Descargar imagen'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showToast && (
        <Toast
          message="Calendario descargado!"
          linkText="Ver cómo importarlo"
          linkUrl="/faq"
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Hidden component for image export */}
      <AgendaImagePreview
        ref={agendaImageRef}
        selectedEvents={selectedEvents}
        schedules={schedules}
      />
    </div>
  );
}

// ─── Mobile detection hook ─────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

// ─── Mobile Timeline Components ────────────────────────────────────

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

function MobileTimelineView({
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

  // Count selected per stage for the filter badge
  const selectedCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of allEvents) {
      if (selectedIds.has(event.id)) {
        counts.set(event.stage, (counts.get(event.stage) || 0) + 1);
      }
    }
    return counts;
  }, [allEvents, selectedIds]);

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

// ─── Main App Component ────────────────────────────────────────────

interface TimetableAppProps {
  schedules: SerializedSchedule[];
}

export default function TimetableApp({ schedules }: TimetableAppProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [readOnly, setReadOnly] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'list'>('auto');
  const isMobile = useIsMobile();

  // Determine effective view
  const showMobileView =
    viewMode === 'list' || (viewMode === 'auto' && isMobile);

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
  const gridHeight =
    (currentSchedule.endMinute - currentSchedule.startMinute) * PX_PER_MINUTE;

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
      />

      {/* Mobile Timeline View */}
      {showMobileView ? (
        <MobileTimelineView
          schedule={currentSchedule}
          selectedIds={selectedIds}
          readOnly={readOnly}
          onToggle={toggleArtist}
        />
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
                  startMinute={currentSchedule.startMinute}
                  endMinute={currentSchedule.endMinute}
                />
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
                        top: `${(m - currentSchedule.startMinute) * PX_PER_MINUTE}px`,
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
                      gridStartMinute={currentSchedule.startMinute}
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
