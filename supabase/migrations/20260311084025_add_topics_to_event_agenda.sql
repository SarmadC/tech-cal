alter table public.event_agenda
add column if not exists topics text[];

create or replace function public.replace_event_agenda(
    p_event_id uuid,
    p_items jsonb default '[]'::jsonb
)
returns uuid[]
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_existing_agenda_id uuid;
    v_agenda_item jsonb;
    v_agenda_id uuid;
    v_inserted_ids uuid[] := '{}'::uuid[];
    v_day_number integer;
    v_sort_order integer;
    v_day_sort_counters jsonb := '{}'::jsonb;
begin
    for v_existing_agenda_id in
        select id
        from event_agenda
        where event_id = p_event_id
    loop
        delete from agenda_speakers
        where agenda_id = v_existing_agenda_id;
    end loop;

    delete from event_agenda
    where event_id = p_event_id;

    if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
        return v_inserted_ids;
    end if;

    for v_agenda_item in
        select value
        from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
    loop
        v_day_number := coalesce(nullif(v_agenda_item->>'day_number', '')::integer, 1);
        v_sort_order := coalesce((v_day_sort_counters->>v_day_number::text)::integer, 0);
        v_day_sort_counters := jsonb_set(
            v_day_sort_counters,
            array[v_day_number::text],
            to_jsonb(v_sort_order + 1),
            true
        );

        insert into event_agenda (
            event_id,
            title,
            start_time,
            end_time,
            agenda_type,
            description,
            location,
            day_number,
            track,
            topics,
            sort_order,
            duration_minutes,
            capacity,
            difficulty_level,
            prerequisites,
            is_required
        )
        values (
            p_event_id,
            coalesce(nullif(btrim(v_agenda_item->>'title'), ''), 'Untitled'),
            (v_agenda_item->>'start_time')::timestamptz,
            case
                when coalesce(v_agenda_item->>'end_time', '') <> ''
                    then (v_agenda_item->>'end_time')::timestamptz
                else null
            end,
            coalesce(nullif(btrim(v_agenda_item->>'agenda_type'), ''), 'other'),
            nullif(btrim(v_agenda_item->>'description'), ''),
            nullif(btrim(v_agenda_item->>'location'), ''),
            v_day_number,
            nullif(btrim(v_agenda_item->>'track'), ''),
            case
                when jsonb_typeof(coalesce(v_agenda_item->'topics', '[]'::jsonb)) = 'array'
                    then nullif(
                        array(
                            select nullif(btrim(value), '')
                            from jsonb_array_elements_text(coalesce(v_agenda_item->'topics', '[]'::jsonb))
                            where nullif(btrim(value), '') is not null
                        ),
                        '{}'::text[]
                    )
                else null
            end,
            v_sort_order,
            case
                when coalesce(v_agenda_item->>'duration_minutes', '') <> ''
                    then (v_agenda_item->>'duration_minutes')::integer
                else null
            end,
            case
                when coalesce(v_agenda_item->>'capacity', '') <> ''
                    then (v_agenda_item->>'capacity')::integer
                else null
            end,
            nullif(btrim(v_agenda_item->>'difficulty_level'), ''),
            nullif(btrim(v_agenda_item->>'prerequisites'), ''),
            case
                when coalesce(v_agenda_item->>'is_required', '') <> ''
                    then (v_agenda_item->>'is_required')::boolean
                else null
            end
        )
        returning id into v_agenda_id;

        v_inserted_ids := array_append(v_inserted_ids, v_agenda_id);
    end loop;

    return v_inserted_ids;
end;
$function$;

create or replace function public.apply_event_update_queue_approval(
    p_queue_id uuid,
    p_reviewed_by uuid,
    p_scalar_updates jsonb default '{}'::jsonb,
    p_relationship_updates jsonb default '{}'::jsonb,
    p_speaker_updates jsonb default '[]'::jsonb,
    p_agenda_updates jsonb default '[]'::jsonb,
    p_approved_field_ids uuid[] default '{}'::uuid[],
    p_rejected_field_ids uuid[] default '{}'::uuid[],
    p_sanitized_field_updates jsonb default '[]'::jsonb,
    p_reject_remaining_pending boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_queue event_update_queue%rowtype;
    v_event_id uuid;
    v_reviewed_at timestamptz := now();
    v_next_status text;
    v_has_pending boolean;
    v_has_approved boolean;
    v_scalar_updates jsonb := coalesce(p_scalar_updates, '{}'::jsonb);
    v_relationship_updates jsonb := coalesce(p_relationship_updates, '{}'::jsonb);
    v_speaker_updates jsonb := coalesce(p_speaker_updates, '[]'::jsonb);
    v_agenda_updates jsonb := coalesce(p_agenda_updates, '[]'::jsonb);
    v_sanitized_field_updates jsonb := coalesce(p_sanitized_field_updates, '[]'::jsonb);
    v_sanitized_item jsonb;
    v_speaker_item jsonb;
    v_agenda_item jsonb;
    v_existing_agenda_id uuid;
    v_speaker_id uuid;
    v_agenda_id uuid;
    v_speaker_name text;
    v_linkedin_url text;
    v_day_number integer;
    v_sort_order integer;
    v_day_sort_counters jsonb := '{}'::jsonb;
    v_speaker_ids uuid[] := '{}'::uuid[];
    v_speaker_id_text text;
begin
    select *
    into v_queue
    from event_update_queue
    where id = p_queue_id
    for update;

    if not found then
        raise exception 'Queue item not found: %', p_queue_id;
    end if;

    if v_queue.event_id is null then
        raise exception 'Queue item % is missing event_id', p_queue_id;
    end if;

    v_event_id := v_queue.event_id;

    if jsonb_typeof(v_sanitized_field_updates) = 'array' then
        for v_sanitized_item in
            select value
            from jsonb_array_elements(v_sanitized_field_updates)
        loop
            if coalesce(v_sanitized_item->>'id', '') <> '' then
                update event_update_queue_fields
                set new_value = v_sanitized_item->'newValue'
                where id = (v_sanitized_item->>'id')::uuid
                    and queue_id = p_queue_id;
            end if;
        end loop;
    end if;

    update events
    set
        description = case when v_scalar_updates ? 'description' then v_scalar_updates->>'description' else description end,
        location = case when v_scalar_updates ? 'location' then v_scalar_updates->>'location' else location end,
        timezone = case when v_scalar_updates ? 'timezone' then v_scalar_updates->>'timezone' else timezone end,
        start_time = case
            when v_scalar_updates ? 'start_time' and coalesce(v_scalar_updates->>'start_time', '') <> ''
                then (v_scalar_updates->>'start_time')::timestamptz
            else start_time
        end,
        end_time = case
            when v_scalar_updates ? 'end_time' and coalesce(v_scalar_updates->>'end_time', '') <> ''
                then (v_scalar_updates->>'end_time')::timestamptz
            when v_scalar_updates ? 'end_time'
                then null
            else end_time
        end,
        language = case when v_scalar_updates ? 'language' then v_scalar_updates->>'language' else language end,
        registration_url = case when v_scalar_updates ? 'registration_url' then v_scalar_updates->>'registration_url' else registration_url end,
        livestream_url = case when v_scalar_updates ? 'livestream_url' then v_scalar_updates->>'livestream_url' else livestream_url end,
        event_image_url = case when v_scalar_updates ? 'event_image_url' then v_scalar_updates->>'event_image_url' else event_image_url end,
        agenda_url = case when v_scalar_updates ? 'agenda_url' then v_scalar_updates->>'agenda_url' else agenda_url end,
        price_min = case
            when v_scalar_updates ? 'price_min' and coalesce(v_scalar_updates->>'price_min', '') <> ''
                then (v_scalar_updates->>'price_min')::numeric
            when v_scalar_updates ? 'price_min'
                then null
            else price_min
        end,
        price_max = case
            when v_scalar_updates ? 'price_max' and coalesce(v_scalar_updates->>'price_max', '') <> ''
                then (v_scalar_updates->>'price_max')::numeric
            when v_scalar_updates ? 'price_max'
                then null
            else price_max
        end,
        currency = case when v_scalar_updates ? 'currency' then v_scalar_updates->>'currency' else currency end,
        pricing_type = case
            when v_scalar_updates ? 'pricing_type' and coalesce(v_scalar_updates->>'pricing_type', '') <> ''
                then (v_scalar_updates->>'pricing_type')::pricing_type_enum
            when v_scalar_updates ? 'pricing_type'
                then null
            else pricing_type
        end,
        difficulty_level = case when v_scalar_updates ? 'difficulty_level' then v_scalar_updates->>'difficulty_level' else difficulty_level end,
        event_format = case
            when v_scalar_updates ? 'event_format' and coalesce(v_scalar_updates->>'event_format', '') <> ''
                then (v_scalar_updates->>'event_format')::event_format_enum
            when v_scalar_updates ? 'event_format'
                then null
            else event_format
        end,
        status = case when v_scalar_updates ? 'status' then v_scalar_updates->>'status' else status end,
        prerequisites = case when v_scalar_updates ? 'prerequisites' then v_scalar_updates->>'prerequisites' else prerequisites end,
        target_audience = case when v_scalar_updates ? 'target_audience' then v_scalar_updates->>'target_audience' else target_audience end,
        certificate_offered = case
            when v_scalar_updates ? 'certificate_offered' and coalesce(v_scalar_updates->>'certificate_offered', '') <> ''
                then (v_scalar_updates->>'certificate_offered')::boolean
            when v_scalar_updates ? 'certificate_offered'
                then null
            else certificate_offered
        end,
        recording_available = case
            when v_scalar_updates ? 'recording_available' and coalesce(v_scalar_updates->>'recording_available', '') <> ''
                then (v_scalar_updates->>'recording_available')::boolean
            when v_scalar_updates ? 'recording_available'
                then null
            else recording_available
        end,
        accessibility_features = case when v_scalar_updates ? 'accessibility_features' then v_scalar_updates->'accessibility_features' else accessibility_features end,
        social_media_hashtag = case when v_scalar_updates ? 'social_media_hashtag' then v_scalar_updates->>'social_media_hashtag' else social_media_hashtag end,
        virtual_platform = case when v_scalar_updates ? 'virtual_platform' then v_scalar_updates->>'virtual_platform' else virtual_platform end,
        capacity = case
            when v_scalar_updates ? 'capacity' and coalesce(v_scalar_updates->>'capacity', '') <> ''
                then (v_scalar_updates->>'capacity')::integer
            when v_scalar_updates ? 'capacity'
                then null
            else capacity
        end,
        attendee_count = case
            when v_scalar_updates ? 'attendee_count' and coalesce(v_scalar_updates->>'attendee_count', '') <> ''
                then (v_scalar_updates->>'attendee_count')::integer
            when v_scalar_updates ? 'attendee_count'
                then null
            else attendee_count
        end,
        registration_deadline = case
            when v_scalar_updates ? 'registration_deadline' and coalesce(v_scalar_updates->>'registration_deadline', '') <> ''
                then (v_scalar_updates->>'registration_deadline')::timestamptz
            when v_scalar_updates ? 'registration_deadline'
                then null
            else registration_deadline
        end,
        is_multi_day = case
            when v_scalar_updates ? 'is_multi_day' and coalesce(v_scalar_updates->>'is_multi_day', '') <> ''
                then (v_scalar_updates->>'is_multi_day')::boolean
            when v_scalar_updates ? 'is_multi_day'
                then null
            else is_multi_day
        end,
        daily_schedule = case when v_scalar_updates ? 'daily_schedule' then v_scalar_updates->'daily_schedule' else daily_schedule end,
        event_type_id = case
            when v_scalar_updates ? 'event_type_id' and coalesce(v_scalar_updates->>'event_type_id', '') <> ''
                then (v_scalar_updates->>'event_type_id')::uuid
            when v_scalar_updates ? 'event_type_id'
                then null
            else event_type_id
        end,
        venue_id = case
            when v_scalar_updates ? 'venue_id' and coalesce(v_scalar_updates->>'venue_id', '') <> ''
                then (v_scalar_updates->>'venue_id')::uuid
            when v_scalar_updates ? 'venue_id'
                then null
            else venue_id
        end,
        series_id = case
            when v_scalar_updates ? 'series_id' and coalesce(v_scalar_updates->>'series_id', '') <> ''
                then (v_scalar_updates->>'series_id')::uuid
            when v_scalar_updates ? 'series_id'
                then null
            else series_id
        end,
        organizer_id = case
            when v_scalar_updates ? 'organizer_id' and coalesce(v_scalar_updates->>'organizer_id', '') <> ''
                then (v_scalar_updates->>'organizer_id')::uuid
            when v_scalar_updates ? 'organizer_id'
                then null
            else organizer_id
        end
    where id = v_event_id;

    if v_relationship_updates ? 'tagIds' then
        delete from event_tag_relations
        where event_id = v_event_id;

        insert into event_tag_relations (event_id, tag_id)
        select v_event_id, value::uuid
        from jsonb_array_elements_text(coalesce(v_relationship_updates->'tagIds', '[]'::jsonb));
    end if;

    if v_relationship_updates ? 'audienceIds' then
        delete from event_target_audiences
        where event_id = v_event_id;

        insert into event_target_audiences (event_id, audience_id)
        select v_event_id, value::uuid
        from jsonb_array_elements_text(coalesce(v_relationship_updates->'audienceIds', '[]'::jsonb));
    end if;

    if v_relationship_updates ? 'prerequisiteIds' then
        delete from event_prerequisites
        where event_id = v_event_id;

        insert into event_prerequisites (event_id, prerequisite_id)
        select v_event_id, value::uuid
        from jsonb_array_elements_text(coalesce(v_relationship_updates->'prerequisiteIds', '[]'::jsonb));
    end if;

    if jsonb_typeof(v_speaker_updates) = 'array' and jsonb_array_length(v_speaker_updates) > 0 then
        for v_speaker_item in
            select value
            from jsonb_array_elements(v_speaker_updates)
        loop
            v_speaker_id := null;
            v_speaker_name := nullif(btrim(coalesce(v_speaker_item->>'name', '')), '');
            v_linkedin_url := nullif(btrim(coalesce(v_speaker_item->>'linkedinUrl', '')), '');

            if v_speaker_name is null then
                continue;
            end if;

            if v_linkedin_url is not null then
                select id
                into v_speaker_id
                from speakers
                where lower(linkedin_url) = lower(v_linkedin_url)
                order by id
                limit 1;
            end if;

            if v_speaker_id is null then
                select id
                into v_speaker_id
                from speakers
                where lower(btrim(name)) = lower(v_speaker_name)
                order by id
                limit 1;
            end if;

            if v_speaker_id is null then
                insert into speakers (
                    name,
                    linkedin_url,
                    title,
                    company,
                    bio,
                    photo_url,
                    twitter_url,
                    website_url
                )
                values (
                    v_speaker_name,
                    v_linkedin_url,
                    nullif(btrim(v_speaker_item->>'title'), ''),
                    nullif(btrim(v_speaker_item->>'company'), ''),
                    nullif(btrim(v_speaker_item->>'bio'), ''),
                    nullif(btrim(v_speaker_item->>'photoUrl'), ''),
                    nullif(btrim(v_speaker_item->>'twitterUrl'), ''),
                    nullif(btrim(v_speaker_item->>'websiteUrl'), '')
                )
                returning id into v_speaker_id;
            else
                update speakers
                set
                    name = v_speaker_name,
                    linkedin_url = case
                        when v_linkedin_url is not null and linkedin_url is null then v_linkedin_url
                        else linkedin_url
                    end,
                    title = case when v_speaker_item ? 'title' then nullif(btrim(v_speaker_item->>'title'), '') else title end,
                    company = case when v_speaker_item ? 'company' then nullif(btrim(v_speaker_item->>'company'), '') else company end,
                    bio = case when v_speaker_item ? 'bio' then nullif(btrim(v_speaker_item->>'bio'), '') else bio end,
                    photo_url = case when v_speaker_item ? 'photoUrl' then nullif(btrim(v_speaker_item->>'photoUrl'), '') else photo_url end,
                    twitter_url = case when v_speaker_item ? 'twitterUrl' then nullif(btrim(v_speaker_item->>'twitterUrl'), '') else twitter_url end,
                    website_url = case when v_speaker_item ? 'websiteUrl' then nullif(btrim(v_speaker_item->>'websiteUrl'), '') else website_url end
                where id = v_speaker_id;
            end if;
        end loop;

        update events
        set speaker_lineup = v_speaker_updates
        where id = v_event_id;
    end if;

    if jsonb_typeof(v_agenda_updates) = 'array' and jsonb_array_length(v_agenda_updates) > 0 then
        for v_existing_agenda_id in
            select id
            from event_agenda
            where event_id = v_event_id
        loop
            delete from agenda_speakers
            where agenda_id = v_existing_agenda_id;
        end loop;

        delete from event_agenda
        where event_id = v_event_id;

        for v_agenda_item in
            select value
            from jsonb_array_elements(v_agenda_updates)
        loop
            v_day_number := coalesce(nullif(v_agenda_item->>'day_number', '')::integer, 1);
            v_sort_order := coalesce((v_day_sort_counters->>v_day_number::text)::integer, 0);
            v_day_sort_counters := jsonb_set(
                v_day_sort_counters,
                array[v_day_number::text],
                to_jsonb(v_sort_order + 1),
                true
            );

            insert into event_agenda (
                event_id,
                title,
                start_time,
                end_time,
                agenda_type,
                description,
                location,
                day_number,
                track,
                topics,
                sort_order,
                duration_minutes,
                capacity,
                difficulty_level,
                prerequisites,
                is_required
            )
            values (
                v_event_id,
                coalesce(nullif(btrim(v_agenda_item->>'title'), ''), 'Untitled'),
                (v_agenda_item->>'start_time')::timestamptz,
                case
                    when coalesce(v_agenda_item->>'end_time', '') <> ''
                        then (v_agenda_item->>'end_time')::timestamptz
                    else null
                end,
                coalesce(nullif(btrim(v_agenda_item->>'agenda_type'), ''), 'other'),
                nullif(btrim(v_agenda_item->>'description'), ''),
                nullif(btrim(v_agenda_item->>'location'), ''),
                v_day_number,
                nullif(btrim(v_agenda_item->>'track'), ''),
                case
                    when jsonb_typeof(coalesce(v_agenda_item->'topics', '[]'::jsonb)) = 'array'
                        then nullif(
                            array(
                                select nullif(btrim(value), '')
                                from jsonb_array_elements_text(coalesce(v_agenda_item->'topics', '[]'::jsonb))
                                where nullif(btrim(value), '') is not null
                            ),
                            '{}'::text[]
                        )
                    else null
                end,
                v_sort_order,
                case
                    when coalesce(v_agenda_item->>'duration_minutes', '') <> ''
                        then (v_agenda_item->>'duration_minutes')::integer
                    else null
                end,
                case
                    when coalesce(v_agenda_item->>'capacity', '') <> ''
                        then (v_agenda_item->>'capacity')::integer
                    else null
                end,
                nullif(btrim(v_agenda_item->>'difficulty_level'), ''),
                nullif(btrim(v_agenda_item->>'prerequisites'), ''),
                case
                    when coalesce(v_agenda_item->>'is_required', '') <> ''
                        then (v_agenda_item->>'is_required')::boolean
                    else null
                end
            )
            returning id into v_agenda_id;

            v_speaker_ids := '{}'::uuid[];

            if jsonb_typeof(coalesce(v_agenda_item->'speakerIds', '[]'::jsonb)) = 'array' then
                for v_speaker_id_text in
                    select value
                    from jsonb_array_elements_text(coalesce(v_agenda_item->'speakerIds', '[]'::jsonb))
                loop
                    if coalesce(v_speaker_id_text, '') <> '' and not ((v_speaker_id_text)::uuid = any(v_speaker_ids)) then
                        v_speaker_ids := array_append(v_speaker_ids, (v_speaker_id_text)::uuid);
                    end if;
                end loop;
            end if;

            if jsonb_typeof(coalesce(v_agenda_item->'speakers', '[]'::jsonb)) = 'array' then
                for v_speaker_name in
                    select nullif(btrim(value), '')
                    from jsonb_array_elements_text(coalesce(v_agenda_item->'speakers', '[]'::jsonb))
                loop
                    continue when v_speaker_name is null;

                    select id
                    into v_speaker_id
                    from speakers
                    where lower(btrim(name)) = lower(v_speaker_name)
                    order by case when linkedin_url is null then 1 else 0 end, id
                    limit 1;

                    if v_speaker_id is not null and not (v_speaker_id = any(v_speaker_ids)) then
                        v_speaker_ids := array_append(v_speaker_ids, v_speaker_id);
                    end if;
                end loop;
            end if;

            if array_length(v_speaker_ids, 1) is not null then
                insert into agenda_speakers (agenda_id, event_id, speaker_id)
                select v_agenda_id, v_event_id, unnest(v_speaker_ids);
            end if;
        end loop;
    end if;

    if coalesce(array_length(p_approved_field_ids, 1), 0) > 0 then
        update event_update_queue_fields
        set
            field_status = 'approved',
            reviewed_by = p_reviewed_by,
            reviewed_at = v_reviewed_at
        where queue_id = p_queue_id
            and field_status = 'pending'
            and id = any(p_approved_field_ids);
    end if;

    if coalesce(array_length(p_rejected_field_ids, 1), 0) > 0 then
        update event_update_queue_fields
        set
            field_status = 'rejected',
            reviewed_by = p_reviewed_by,
            reviewed_at = v_reviewed_at
        where queue_id = p_queue_id
            and field_status = 'pending'
            and id = any(p_rejected_field_ids);
    end if;

    if p_reject_remaining_pending then
        update event_update_queue_fields
        set
            field_status = 'rejected',
            reviewed_by = p_reviewed_by,
            reviewed_at = v_reviewed_at
        where queue_id = p_queue_id
            and field_status = 'pending';
    end if;

    select exists(
        select 1
        from event_update_queue_fields
        where queue_id = p_queue_id
            and field_status = 'pending'
    )
    into v_has_pending;

    select exists(
        select 1
        from event_update_queue_fields
        where queue_id = p_queue_id
            and field_status = 'approved'
    )
    into v_has_approved;

    v_next_status := case
        when v_has_pending then
            case when v_has_approved then 'partially_approved' else 'pending' end
        else
            case when v_has_approved then 'approved' else 'rejected' end
    end;

    update event_update_queue
    set
        status = v_next_status,
        reviewed_by = p_reviewed_by,
        reviewed_at = v_reviewed_at
    where id = p_queue_id;

    return jsonb_build_object(
        'status', v_next_status
    );
end;
$function$;;
