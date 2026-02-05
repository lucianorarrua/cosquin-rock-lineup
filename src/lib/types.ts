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
