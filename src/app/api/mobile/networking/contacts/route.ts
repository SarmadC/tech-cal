import {
  mobileNetworkingContactRecordSchema,
  mobileNetworkingContactUpdateSchema,
} from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { UserNetworkingContactService } from '@/services/userNetworkingContactService';
import { createServiceClient } from '@/utils/supabase/service';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const runtimeNetworkingContactUpdateSchema = mobileNetworkingContactUpdateSchema.extend({
  action: z.enum([
    'mark_request_sent',
    'confirm_connection',
    'clear_request',
    'clear_connection',
  ]),
});

export async function PATCH(request: Request) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const payload = runtimeNetworkingContactUpdateSchema.parse(
      await request.json().catch(() => ({}))
    );

    const contact = await UserNetworkingContactService.applyAction(
      {
        viewerUserId: authContext.user.id,
        targetKind: payload.target.kind,
        targetId: payload.target.id,
        action: payload.action,
        sourceEventId: payload.target.sourceEventId ?? null,
      },
      authContext.supabase
    );

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Networking service is not configured.' },
        { status: 500 }
      );
    }

    const readClient = createServiceClient(supabaseUrl, serviceRoleKey);
    const hydratedContact = contact
      ? await UserNetworkingContactService.hydrateContact(contact, readClient)
      : await UserNetworkingContactService.hydrateTarget(
          {
            targetKind: payload.target.kind,
            targetId: payload.target.id,
            sourceEventId: payload.target.sourceEventId ?? null,
          },
          readClient
        );

    if (!hydratedContact) {
      return NextResponse.json(
        { success: false, error: 'Networking target not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mobileNetworkingContactRecordSchema.parse(
        'row' in hydratedContact
          ? {
              contact: hydratedContact.contact,
              networkingState: hydratedContact.networkingState,
            }
          : {
              contact: hydratedContact,
              networkingState: UserNetworkingContactService.toNetworkingState(null),
            }
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update networking contact',
      },
      { status: 500 }
    );
  }
}
