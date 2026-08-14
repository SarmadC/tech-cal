import * as Sentry from '@sentry/nextjs';
import { mobileProfileStateSchema } from '@kurecal/domain';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

import {
  buildMobileProfileState,
  ensureMobileProfile,
} from '@/app/api/mobile/profileState';
import { MobileAvatarService } from '@/services/mobileAvatarService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
const MAX_AVATAR_INPUT_PIXELS = 40_000_000;
const AVATAR_EDGE = 1024;
const SUPPORTED_AVATAR_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

type AvatarFailureStage =
  | 'authenticate'
  | 'parse-upload'
  | 'ensure-profile'
  | 'normalize-image'
  | 'persist-avatar'
  | 'remove-avatar'
  | 'build-profile-state';

class AvatarRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface AvatarUploadFile {
  arrayBuffer: () => Promise<ArrayBuffer>;
  name: string;
  size: number;
  type: string;
}

function isAvatarUploadFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
      typeof value !== 'string' &&
      typeof value.arrayBuffer === 'function' &&
      typeof value.size === 'number' &&
      typeof value.type === 'string',
  );
}

async function prepareProfileState(
  authContext: NonNullable<
    Awaited<ReturnType<typeof getAuthenticatedRequestContext>>
  >,
  request: Request,
) {
  return buildMobileProfileState(authContext, request);
}

function respondWithProfileState(
  data: Awaited<ReturnType<typeof buildMobileProfileState>>,
  avatarUrl: string | null,
) {
  const nextData = {
    ...data,
    profile: { ...data.profile, avatarUrl },
    socialProfile: { ...data.socialProfile, avatarUrl },
  };

  return NextResponse.json({
    success: true,
    data: mobileProfileStateSchema.parse(nextData),
  });
}

function errorResponse(error: unknown, stage: AvatarFailureStage) {
  const status = error instanceof AvatarRequestError ? error.status : 500;

  if (!(error instanceof AvatarRequestError)) {
    const errorRecord =
      typeof error === 'object' && error !== null
        ? (error as Record<string, unknown>)
        : null;
    const details = {
      code:
        typeof errorRecord?.code === 'string' ? errorRecord.code : undefined,
      message: error instanceof Error ? error.message : String(error),
      stage,
      statusCode:
        typeof errorRecord?.statusCode === 'number'
          ? errorRecord.statusCode
          : undefined,
    };

    console.error('[mobile/profile/avatar] Unexpected failure', details);
    Sentry.captureException(error, {
      extra: details,
      tags: { route: 'mobile-profile-avatar', stage },
    });
  }

  return NextResponse.json(
    {
      success: false,
      error:
        error instanceof AvatarRequestError
          ? error.message
          : 'Unable to update profile photo. Please try again.',
    },
    { status },
  );
}

async function normalizeAvatar(file: AvatarUploadFile): Promise<File> {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new AvatarRequestError('Choose an image smaller than 8 MB.', 413);
  }
  if (!SUPPORTED_AVATAR_TYPES.has(file.type)) {
    throw new AvatarRequestError(
      'Choose a JPEG, PNG, WebP, HEIC, or HEIF image.',
      400,
    );
  }

  try {
    const normalized = await sharp(await file.arrayBuffer(), {
      failOn: 'error',
      limitInputPixels: MAX_AVATAR_INPUT_PIXELS,
    })
      .rotate()
      .resize(AVATAR_EDGE, AVATAR_EDGE, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: 86 })
      .toBuffer();

    return new File([new Uint8Array(normalized)], 'avatar.webp', {
      type: 'image/webp',
    });
  } catch {
    throw new AvatarRequestError(
      'That photo could not be processed. Choose a different image.',
      400,
    );
  }
}

export async function POST(request: Request) {
  let stage: AvatarFailureStage = 'authenticate';

  try {
    const authContext = await getAuthenticatedRequestContext(request as never);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    stage = 'parse-upload';
    const formData = await request.formData();
    const avatar = formData.get('avatar');
    if (!isAvatarUploadFile(avatar) || avatar.size === 0) {
      throw new AvatarRequestError('Choose a profile photo to upload.', 400);
    }

    stage = 'ensure-profile';
    await ensureMobileProfile(authContext, request);
    stage = 'normalize-image';
    const normalizedAvatar = await normalizeAvatar(avatar);
    stage = 'build-profile-state';
    const profileState = await prepareProfileState(authContext, request);
    stage = 'persist-avatar';
    const { avatarUrl } = await MobileAvatarService.replaceAvatar(
      authContext.user.id,
      normalizedAvatar,
      authContext.supabase,
    );

    return respondWithProfileState(profileState, avatarUrl);
  } catch (error) {
    return errorResponse(error, stage);
  }
}

export async function DELETE(request: Request) {
  let stage: AvatarFailureStage = 'authenticate';

  try {
    const authContext = await getAuthenticatedRequestContext(request as never);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    stage = 'ensure-profile';
    await ensureMobileProfile(authContext, request);
    stage = 'build-profile-state';
    const profileState = await prepareProfileState(authContext, request);
    stage = 'remove-avatar';
    await MobileAvatarService.removeAvatar(
      authContext.user.id,
      authContext.supabase,
    );

    return respondWithProfileState(profileState, null);
  } catch (error) {
    return errorResponse(error, stage);
  }
}
