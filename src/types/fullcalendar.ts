// src/types/fullcalendar.ts
// Centralized FullCalendar type definitions to avoid direct imports

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FullCalendar = any; // Re-export the FullCalendar type without importing the package

// Define commonly used FullCalendar types locally to avoid direct imports
export interface EventClickArg {
  event: {
    id: string;
    title: string;
    start: Date | null;
    end: Date | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extendedProps: any;
  };
  el: HTMLElement;
  jsEvent: MouseEvent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  view: any;
}

export interface EventContentArg {
  event: {
    id: string;
    title: string;
    start: Date | null;
    end: Date | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extendedProps: any;
  };
  timeText: string;
  isStart: boolean;
  isEnd: boolean;
  isMirror: boolean;
  isPast: boolean;
  isFuture: boolean;
  isToday: boolean;
  isOther: boolean;
  el: HTMLElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  view: any;
}

export interface EventMountArg {
  event: {
    id: string;
    title: string;
    start: Date | null;
    end: Date | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extendedProps: any;
  };
  el: HTMLElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  view: any;
}

export interface EventHoveringArg {
  event: {
    id: string;
    title: string;
    start: Date | null;
    end: Date | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extendedProps: any;
  };
  el: HTMLElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  view: any;
}
