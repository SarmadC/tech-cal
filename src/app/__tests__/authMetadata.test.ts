import { describe, expect, it } from 'vitest';
import { metadata as signupMetadata } from '@/app/signup/layout';
import { metadata as loginMetadata } from '@/app/login/layout';
import { metadata as forgotPasswordMetadata } from '@/app/forgot-password/layout';
import { metadata as resetPasswordMetadata } from '@/app/auth/reset-password/page';

describe('auth metadata', () => {
  it('marks signup page as noindex', () => {
    const robots = signupMetadata.robots;
    expect(robots).toMatchObject({
      index: false,
      follow: true,
    });
  });

  it('marks login page as noindex', () => {
    const robots = loginMetadata.robots;
    expect(robots).toMatchObject({
      index: false,
      follow: true,
    });
  });

  it('marks forgot password page as noindex', () => {
    const robots = forgotPasswordMetadata.robots;
    expect(robots).toMatchObject({
      index: false,
      follow: true,
    });
  });

  it('marks reset password page as noindex', () => {
    const robots = resetPasswordMetadata.robots;
    expect(robots).toMatchObject({
      index: false,
      follow: true,
    });
  });
});
