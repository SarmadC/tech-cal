export const loadingLogoTones = {
  dark: 0.3,
  medium: 0.5,
  light: 0.7,
  bright: 0.85,
  brightest: 1,
} as const;

export type LoadingLogoTone = keyof typeof loadingLogoTones;

export const loadingLogoArmOrder = [
  'back-left',
  'back-right',
  'bottom',
  'front-left',
  'front-right',
  'top',
] as const;

export type LoadingLogoArmId = (typeof loadingLogoArmOrder)[number];

export interface LoadingLogoPolygonSpec {
  points: string;
  tone: LoadingLogoTone;
}

export interface LoadingLogoArmSpec {
  id: LoadingLogoArmId;
  polygons: readonly LoadingLogoPolygonSpec[];
}

export const loadingLogoSpec = {
  centerCap: {
    points: '52,56 60,52 68,56 60,60',
    tone: 'brightest',
  } satisfies LoadingLogoPolygonSpec,
  viewBox: '0 0 120 120',
  arms: [
    {
      id: 'back-left',
      polygons: [
        { points: '60,60 52,56 28,68 36,72', tone: 'dark' },
        { points: '36,72 28,68 28,76 36,80', tone: 'dark' },
        { points: '60,60 36,72 36,80 60,68', tone: 'medium' },
      ],
    },
    {
      id: 'back-right',
      polygons: [
        { points: '60,60 68,56 92,68 84,72', tone: 'light' },
        { points: '84,72 92,68 92,76 84,80', tone: 'medium' },
        { points: '60,60 84,72 84,80 60,68', tone: 'light' },
      ],
    },
    {
      id: 'bottom',
      polygons: [
        { points: '52,64 60,68 60,100 52,96', tone: 'medium' },
        { points: '68,64 60,68 60,100 68,96', tone: 'dark' },
        { points: '52,96 60,100 68,96 60,92', tone: 'dark' },
      ],
    },
    {
      id: 'front-left',
      polygons: [
        { points: '60,60 52,64 28,52 36,48', tone: 'bright' },
        { points: '36,48 28,52 28,44 36,40', tone: 'light' },
        { points: '60,60 36,48 36,40 60,52', tone: 'bright' },
      ],
    },
    {
      id: 'front-right',
      polygons: [
        { points: '60,60 68,64 92,52 84,48', tone: 'brightest' },
        { points: '84,48 92,52 92,44 84,40', tone: 'bright' },
        { points: '60,60 84,48 84,40 60,52', tone: 'brightest' },
      ],
    },
    {
      id: 'top',
      polygons: [
        { points: '52,56 60,52 60,20 52,24', tone: 'brightest' },
        { points: '68,56 60,52 60,20 68,24', tone: 'brightest' },
        { points: '52,24 60,20 68,24 60,28', tone: 'brightest' },
      ],
    },
  ] satisfies readonly LoadingLogoArmSpec[],
} as const;

export const loadingLogoAnimation = {
  armOpacityMin: 0.18,
  floatDistancePx: 6,
  floatDurationMs: 3000,
  pulseDurationMs: 3600,
  pulseDelaysMs: {
    top: -1800,
    'front-right': -1200,
    'back-right': -600,
    bottom: 0,
    'back-left': 600,
    'front-left': 1200,
  } satisfies Record<LoadingLogoArmId, number>,
} as const;
