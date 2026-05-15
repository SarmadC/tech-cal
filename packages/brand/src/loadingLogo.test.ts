import {
  loadingLogoAnimation,
  loadingLogoArmOrder,
  loadingLogoSpec,
  loadingLogoTones,
} from './loadingLogo';

describe('loadingLogoSpec', () => {
  it('keeps the canonical arm order stable', () => {
    expect(loadingLogoSpec.arms.map((arm) => arm.id)).toEqual(loadingLogoArmOrder);
  });

  it('keeps three faces per arm plus a center cap', () => {
    expect(loadingLogoSpec.arms).toHaveLength(6);
    expect(loadingLogoSpec.arms.map((arm) => arm.polygons.length)).toEqual([3, 3, 3, 3, 3, 3]);
    expect(loadingLogoSpec.centerCap.points).toBe('52,56 60,52 68,56 60,60');
  });

  it('preserves the tone ladder and pulse choreography', () => {
    expect(loadingLogoTones).toEqual({
      dark: 0.3,
      medium: 0.5,
      light: 0.7,
      bright: 0.85,
      brightest: 1,
    });

    expect(loadingLogoAnimation).toMatchObject({
      armOpacityMin: 0.18,
      floatDistancePx: 6,
      floatDurationMs: 3000,
      pulseDurationMs: 3600,
    });

    expect(loadingLogoAnimation.pulseDelaysMs).toEqual({
      top: -1800,
      'front-right': -1200,
      'back-right': -600,
      bottom: 0,
      'back-left': 600,
      'front-left': 1200,
    });
  });
});
