export interface RawEvent {
  artist: string;
  day?: number;
  dia?: number;
  stage: string;
  startAt: string;
  endAt: string;
}

export interface FestivalEvent {
  id: string;
  artist: string;
  day: number;
  stage: string;
  startAt: Date;
  endAt: Date;
  /** Start time in minutes from midnight of the festival start (14:00 = 840) */
  startMinutes: number;
  /** End time in minutes from midnight of the festival start */
  endMinutes: number;
  /** Duration in minutes */
  duration: number;
}

export interface StageColumn {
  name: string;
  events: FestivalEvent[];
}

export interface DaySchedule {
  day: number;
  label: string;
  date: string;
  stages: StageColumn[];
  startMinute: number;
  endMinute: number;
}

// ─── Serialized types (for Astro → React hydration) ────────────────

export interface SerializedEvent {
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

export interface SerializedSchedule {
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

export interface ScheduleInfo {
  day: number;
  label: string;
  date: string;
}

export function hydrateEvent(e: SerializedEvent): FestivalEvent {
  return {
    ...e,
    startAt: new Date(e.startAt),
    endAt: new Date(e.endAt),
  };
}
