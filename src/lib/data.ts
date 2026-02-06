import type {
  RawEvent,
  FestivalEvent,
  DaySchedule,
  StageColumn,
} from './types';
import rawData from '../../data.json';

/**
 * The festival grid starts at 14:00 local time (Argentina, UTC-3).
 * Times after midnight (00:00-06:00) are treated as 24:00-30:00
 * so they render at the bottom of the grid.
 *
 * The raw data uses UTC timestamps (Z suffix).
 * Argentina is UTC-3, so we subtract 3 hours to get local time.
 */

const GRID_START_HOUR = 14; // 14:00 local time
const GRID_START_MINUTES = GRID_START_HOUR * 60; // 840
const UTC_OFFSET_HOURS = -3; // Argentina UTC-3

function utcToLocalMinutes(date: Date): number {
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  let localHours = utcHours + UTC_OFFSET_HOURS;
  if (localHours < 0) localHours += 24;

  let totalMinutes = localHours * 60 + utcMinutes;

  // Normalize: if before grid start (14:00), it's after midnight
  // Treat as 24:xx, 25:xx, etc.
  if (totalMinutes < GRID_START_MINUTES) {
    totalMinutes += 24 * 60; // add 24 hours
  }

  return totalMinutes;
}

function normalizeMinutes(minutes: number): number {
  return minutes - GRID_START_MINUTES;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseEvents(): FestivalEvent[] {
  return (rawData as RawEvent[]).map((raw) => {
    const day = raw.day ?? raw.dia ?? 1;
    const startAt = new Date(raw.startAt);
    const endAt = new Date(raw.endAt);
    const startMinutes = normalizeMinutes(utcToLocalMinutes(startAt));
    const endMinutes = normalizeMinutes(utcToLocalMinutes(endAt));
    const duration = endMinutes - startMinutes;
    const id = slugify(raw.artist) + '-d' + day;

    return {
      id,
      artist: raw.artist,
      day,
      stage: raw.stage,
      startAt,
      endAt,
      startMinutes,
      endMinutes,
      duration,
    };
  });
}

// Stage display order
const STAGE_ORDER: string[] = [
  'Norte',
  'Sur',
  'Montaña',
  'Boomerang',
  'Paraguay',
  'La Casita del Blues',
  'La Plaza Electronic Stage',
  'Sorpresa',
];

export function getDaySchedules(): DaySchedule[] {
  const events = parseEvents();
  const days = [1, 2];

  return days.map((day) => {
    const dayEvents = events.filter((e) => e.day === day);
    const stageNames = [...new Set(dayEvents.map((e) => e.stage))];

    // Sort stages by predefined order
    stageNames.sort((a, b) => {
      const ai = STAGE_ORDER.indexOf(a);
      const bi = STAGE_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const stages: StageColumn[] = stageNames.map((name) => ({
      name,
      events: dayEvents
        .filter((e) => e.stage === name)
        .sort((a, b) => a.startMinutes - b.startMinutes),
    }));

    const allMinutes = dayEvents.flatMap((e) => [e.startMinutes, e.endMinutes]);
    const startMinute = Math.floor(Math.min(...allMinutes) / 60) * 60; // round down to hour
    const endMinute = Math.ceil(Math.max(...allMinutes) / 60) * 60; // round up to hour

    return {
      day,
      label: day === 1 ? 'Sábado 14' : 'Domingo 15',
      date: day === 1 ? '2026-02-14' : '2026-02-15',
      stages,
      startMinute,
      endMinute,
    };
  });
}

export function getAllEvents(): FestivalEvent[] {
  return parseEvents();
}

export function formatTime(normalizedMinutes: number): string {
  const totalMinutes = normalizedMinutes + GRID_START_MINUTES;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function getEventLocalTime(date: Date): string {
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  let localHours = utcHours + UTC_OFFSET_HOURS;
  if (localHours < 0) localHours += 24;
  return `${localHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`;
}

export function generateGoogleCalendarUrl(event: FestivalEvent): string {
  const start = formatDateForGCal(event.startAt);
  const end = formatDateForGCal(event.endAt);
  const title = encodeURIComponent(`${event.artist} - Cosquín Rock 2026`);
  const location = encodeURIComponent(
    `Escenario ${event.stage}, Cosquín Rock, Córdoba, Argentina`
  );
  const details = encodeURIComponent(
    `${event.artist} en el escenario ${event.stage} del Cosquín Rock 2026.`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&location=${location}&details=${details}`;
}

function formatDateForGCal(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

export function generateICS(events: FestivalEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cosquin Rock Lineup//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `DTSTART:${formatDateForGCal(event.startAt)}`,
      `DTEND:${formatDateForGCal(event.endAt)}`,
      `SUMMARY:${event.artist} - Cosquín Rock® 2026`,
      `LOCATION:Escenario ${event.stage}\\, Cosquín Rock®\\, Córdoba\\, Argentina`,
      `DESCRIPTION:${event.artist} en el escenario ${event.stage} del Cosquín Rock® 2026.`,
      `UID:${event.id}@cosquin-rock-lineup`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export { GRID_START_MINUTES };
