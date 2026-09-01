CREATE OR REPLACE FUNCTION public.set_attendance_status(p_user_id uuid, p_event_id uuid, p_status text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_existing_row public.user_events%ROWTYPE;
    v_previous_status TEXT;
    v_is_new_row BOOLEAN := false;
    v_auto_bookmarked BOOLEAN := false;
    v_was_tracked BOOLEAN;
    v_will_be_tracked BOOLEAN;
    v_result JSONB;
BEGIN
    IF p_status IS NOT NULL AND p_status NOT IN ('attending', 'attended', 'cancelled') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid status. Must be one of: attending, attended, cancelled, or NULL'
        );
    END IF;

    SELECT * INTO v_existing_row
    FROM public.user_events
    WHERE user_id = p_user_id AND event_id = p_event_id
    FOR UPDATE;

    v_previous_status := v_existing_row.status;
    v_was_tracked := COALESCE(v_existing_row.is_bookmarked, false) OR
                     (v_existing_row.status IN ('attending', 'attended'));

    IF NOT FOUND THEN
        -- Create new row with specified status
        -- DECOUPLED: is_bookmarked defaults to false even for 'attending'/'attended'
        INSERT INTO public.user_events (
            user_id,
            event_id,
            status,
            notes,
            is_bookmarked,
            bookmarked_at,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_event_id,
            p_status,
            p_notes,
            false, -- DECOUPLED
            NULL,  -- DECOUPLED
            NOW(),
            NOW()
        );
        v_is_new_row := true;
        v_was_tracked := false;
        v_will_be_tracked := true;

        IF NOT v_was_tracked AND v_will_be_tracked THEN
            UPDATE public.profiles
            SET
                tracked_events_count = COALESCE(tracked_events_count, 0) + 1,
                updated_at = NOW()
            WHERE id = p_user_id;
        END IF;
    ELSE
        -- Update existing row status
        -- DECOUPLED: No longer updating is_bookmarked to true here
        UPDATE public.user_events
        SET
            status = p_status,
            notes = COALESCE(p_notes, notes),
            updated_at = NOW()
        WHERE user_id = p_user_id AND event_id = p_event_id;

        v_will_be_tracked := COALESCE(v_existing_row.is_bookmarked, false) OR
                            (p_status IN ('attending', 'attended'));

        IF v_was_tracked != v_will_be_tracked THEN
            IF v_will_be_tracked THEN
                UPDATE public.profiles
                SET
                    tracked_events_count = COALESCE(tracked_events_count, 0) + 1,
                    updated_at = NOW()
                WHERE id = p_user_id;
            ELSE
                UPDATE public.profiles
                SET
                    tracked_events_count = GREATEST(COALESCE(tracked_events_count, 0) - 1, 0),
                    updated_at = NOW()
                WHERE id = p_user_id;
            END IF;
        END IF;
    END IF;

    v_result := jsonb_build_object(
        'success', true,
        'previous_status', v_previous_status,
        'new_status', p_status,
        'auto_bookmarked', false -- DECOUPLED
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$function$;
