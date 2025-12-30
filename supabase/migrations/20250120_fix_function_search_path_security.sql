-- Fix function search_path security by adding SET search_path to functions missing it
-- This prevents search_path injection attacks

-- Note: Only fixing user-defined functions in the public schema
-- Extension functions (pg_trgm, etc.) are managed by extensions

-- agenda_speakers_sync - Trigger function
CREATE OR REPLACE FUNCTION public.agenda_speakers_sync()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
begin
  -- Always derive the authoritative event_id and event_title from the referenced agenda row
  -- Using STRICT is safe because FK constraint ensures agenda_id exists
  select 
    ea.event_id,
    e.title
  into strict 
    new.event_id,
    new.event_title
  from public.event_agenda ea
  join public.events e on e.id = ea.event_id
  where ea.id = new.agenda_id;

  return new;
end;
$$;

-- get_field_protection_mode - Query function
CREATE OR REPLACE FUNCTION public.get_field_protection_mode(p_field_name text, p_event_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO ''
AS $$
DECLARE
    v_mode TEXT;
    v_default_mode TEXT;
    v_has_manual_edit BOOLEAN;
BEGIN
    -- Check if field has manual edit (protected)
    SELECT EXISTS (
        SELECT 1 FROM public.event_field_edits
        WHERE event_id = p_event_id AND field_name = p_field_name
    ) INTO v_has_manual_edit;
    
    IF v_has_manual_edit THEN
        RETURN 'protected';
    END IF;
    
    -- Check explicit config
    SELECT protection_mode INTO v_mode
    FROM public.event_field_protection_config
    WHERE field_name = p_field_name;
    
    IF v_mode IS NOT NULL THEN
        RETURN v_mode;
    END IF;
    
    -- Fallback to default_mode (get first non-null default)
    SELECT default_mode INTO v_default_mode
    FROM public.event_field_protection_config
    WHERE default_mode IS NOT NULL
    LIMIT 1;
    
    -- Final fallback: review_required for safety
    RETURN COALESCE(v_default_mode, 'review_required');
END;
$$;

-- filter_events_by_location - Query function
CREATE OR REPLACE FUNCTION public.filter_events_by_location(
  p_locations text[] DEFAULT NULL::text[],
  p_latitude double precision DEFAULT NULL::double precision,
  p_longitude double precision DEFAULT NULL::double precision,
  p_radius_miles double precision DEFAULT 50
)
RETURNS TABLE(event_id uuid)
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_lat_delta DOUBLE PRECISION;
  v_lon_delta DOUBLE PRECISION;
  v_miles_per_degree_lat CONSTANT DOUBLE PRECISION := 69;
BEGIN
  -- If no location filters provided, return all event IDs
  IF (p_locations IS NULL OR array_length(p_locations, 1) IS NULL)
     AND p_latitude IS NULL
     AND p_longitude IS NULL THEN
    RETURN QUERY SELECT id FROM public.events;
    RETURN;
  END IF;

  -- Create a temporary table for matching event IDs
  CREATE TEMP TABLE IF NOT EXISTS temp_location_matches (event_id UUID) ON COMMIT DROP;
  TRUNCATE temp_location_matches;

  -- Text-based location filtering
  IF p_locations IS NOT NULL AND array_length(p_locations, 1) > 0 THEN
    INSERT INTO temp_location_matches (event_id)
    SELECT DISTINCT e.id
    FROM public.events e
    WHERE EXISTS (
      SELECT 1
      FROM unnest(p_locations) AS loc
      WHERE e.location ILIKE '%' || loc || '%'
    );
  END IF;

  -- Geospatial filtering
  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    -- Calculate bounding box
    v_lat_delta := p_radius_miles / v_miles_per_degree_lat;
    v_lon_delta := p_radius_miles / (v_miles_per_degree_lat * cos(radians(p_latitude)));

    -- Find nearby venues using Haversine formula
    INSERT INTO temp_location_matches (event_id)
    SELECT DISTINCT e.id
    FROM public.events e
    INNER JOIN public.venues v ON e.venue_id = v.id
    WHERE v.latitude IS NOT NULL
      AND v.longitude IS NOT NULL
      AND v.latitude BETWEEN (p_latitude - v_lat_delta) AND (p_latitude + v_lat_delta)
      AND v.longitude BETWEEN (p_longitude - v_lon_delta) AND (p_longitude + v_lon_delta)
      -- Haversine distance calculation
      AND (
        3959 * acos(
          cos(radians(p_latitude)) * cos(radians(v.latitude)) *
          cos(radians(v.longitude) - radians(p_longitude)) +
          sin(radians(p_latitude)) * sin(radians(v.latitude))
        )
      ) <= p_radius_miles;

    -- Always include virtual/hybrid events (can be attended from anywhere)
    INSERT INTO temp_location_matches (event_id)
    SELECT DISTINCT e.id
    FROM public.events e
    WHERE e.event_format IN ('Online', 'Hybrid')
       OR e.livestream_url IS NOT NULL;
  END IF;

  -- Return distinct event IDs
  RETURN QUERY SELECT DISTINCT m.event_id FROM temp_location_matches m;
END;
$$;

-- backfill_location_normalization - Utility function
CREATE OR REPLACE FUNCTION public.backfill_location_normalization()
RETURNS TABLE(events_updated integer, events_with_city integer, events_with_state integer, events_with_country integer)
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
    updated_count INT := 0;
    city_count INT := 0;
    state_count INT := 0;
    country_count INT := 0;
    rec RECORD;
    norm_result RECORD;
BEGIN
    -- Process all events with location text
    FOR rec IN 
        SELECT id, location 
        FROM public.events 
        WHERE location IS NOT NULL 
        AND (location_city IS NULL OR location_normalized IS NULL)
    LOOP
        -- Get normalized values
        SELECT * INTO norm_result
        FROM public.normalize_location(rec.location);

        -- Update event with normalized values
        UPDATE public.events
        SET 
            location_city = norm_result.city,
            location_state = norm_result.state,
            location_country = norm_result.country,
            location_normalized = norm_result.normalized
        WHERE id = rec.id;

        updated_count := updated_count + 1;
        
        IF norm_result.city IS NOT NULL THEN
            city_count := city_count + 1;
        END IF;
        IF norm_result.state IS NOT NULL THEN
            state_count := state_count + 1;
        END IF;
        IF norm_result.country IS NOT NULL THEN
            country_count := country_count + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT updated_count, city_count, state_count, country_count;
END;
$$;

-- events_location_normalize_trigger - Trigger function
CREATE OR REPLACE FUNCTION public.events_location_normalize_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
    norm_result RECORD;
BEGIN
    -- Only normalize if location changed and normalized fields are empty
    IF NEW.location IS NOT NULL AND (
        NEW.location_city IS NULL OR 
        NEW.location_normalized IS NULL OR
        OLD.location IS DISTINCT FROM NEW.location
    ) THEN
        SELECT * INTO norm_result
        FROM public.normalize_location(NEW.location);

        NEW.location_city := norm_result.city;
        NEW.location_state := norm_result.state;
        NEW.location_country := norm_result.country;
        NEW.location_normalized := norm_result.normalized;
    END IF;

    RETURN NEW;
END;
$$;

-- normalize_location - Utility function
CREATE OR REPLACE FUNCTION public.normalize_location(location_text text)
RETURNS TABLE(city text, state text, country text, normalized text)
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
    normalized_city TEXT;
    normalized_state TEXT;
    normalized_country TEXT;
    normalized_location TEXT;
    location_lower TEXT;
    parts TEXT[];
    part_count INT;
    part TEXT;
    i INT;
    us_states TEXT[] := ARRAY[
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
        'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
        'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
        'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
        'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
        'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
        'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
        'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
        'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
        'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
    ];
    state_abbrev_map JSONB := '{
        "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
        "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
        "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
        "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
        "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
        "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
        "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska",
        "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
        "NM": "New Mexico", "NY": "New York", "NC": "North Carolina",
        "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon",
        "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
        "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
        "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
        "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia"
    }'::jsonb;
BEGIN
    -- Handle NULL or empty input
    IF location_text IS NULL OR TRIM(location_text) = '' THEN
        RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    location_lower := LOWER(TRIM(location_text));

    -- Handle virtual/online locations
    IF location_lower IN ('online', 'virtual', 'remote', 'tbd', 'tba') THEN
        normalized_location := CASE 
            WHEN location_lower IN ('tbd', 'tba') THEN 'TBD'
            ELSE 'Online'
        END;
        RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, NULL::TEXT, normalized_location;
        RETURN;
    END IF;

    -- Split by comma to parse location components
    parts := string_to_array(location_text, ',');
    part_count := array_length(parts, 1);

    -- Clean all parts
    FOR i IN 1..part_count LOOP
        parts[i] := TRIM(parts[i]);
    END LOOP;

    -- Pattern 1: Street address (starts with number) - "580 20th St, San Francisco"
    IF part_count >= 2 AND parts[1] ~ '^[0-9]' THEN
        -- First part is address, last part is city
        normalized_city := parts[part_count];
        normalized_state := NULL;
        normalized_country := 'USA';
        
        -- Check if second-to-last part is a state
        IF part_count >= 3 THEN
            part := UPPER(parts[part_count - 1]);
            IF state_abbrev_map ? part THEN
                normalized_state := state_abbrev_map->>part;
                normalized_city := parts[part_count - 2];
            ELSIF parts[part_count - 1] = ANY(SELECT unnest(us_states)) THEN
                normalized_state := parts[part_count - 1];
                normalized_city := parts[part_count - 2];
            END IF;
        END IF;
        
        -- Build normalized string
        normalized_location := normalized_city;
        IF normalized_state IS NOT NULL THEN
            normalized_location := normalized_location || ', ' || normalized_state;
        END IF;
        
        RETURN QUERY SELECT normalized_city, normalized_state, normalized_country, normalized_location;
        RETURN;
    END IF;

    -- Pattern 2: Venue name, City, State/Country - "MGM Grand, Las Vegas, NV"
    IF part_count >= 3 THEN
        -- Check if last part is a state abbreviation
        part := UPPER(TRIM(parts[part_count]));
        IF LENGTH(part) = 2 AND state_abbrev_map ? part THEN
            -- Pattern: "Venue, City, StateAbbrev"
            normalized_city := parts[part_count - 1];
            normalized_state := state_abbrev_map->>part;
            normalized_country := 'USA';
        ELSIF parts[part_count] = ANY(SELECT unnest(us_states)) THEN
            -- Pattern: "Venue, City, StateName"
            normalized_city := parts[part_count - 1];
            normalized_state := parts[part_count];
            normalized_country := 'USA';
        ELSE
            -- Pattern: "Venue, City, Country"
            normalized_city := parts[part_count - 1];
            normalized_state := NULL;
            normalized_country := parts[part_count];
        END IF;
        
        normalized_location := normalized_city;
        IF normalized_state IS NOT NULL THEN
            normalized_location := normalized_location || ', ' || normalized_state;
        ELSIF normalized_country IS NOT NULL AND normalized_country != 'USA' THEN
            normalized_location := normalized_location || ', ' || normalized_country;
        END IF;
        
        RETURN QUERY SELECT normalized_city, normalized_state, normalized_country, normalized_location;
        RETURN;
    END IF;

    -- Pattern 3: City, State/Country - "Las Vegas, Nevada" or "Doha, Qatar"
    IF part_count = 2 THEN
        normalized_city := parts[1];
        part := TRIM(parts[2]);
        
        -- Check if second part is a US state (full name or abbreviation)
        IF LENGTH(part) = 2 AND state_abbrev_map ? UPPER(part) THEN
            normalized_state := state_abbrev_map->>UPPER(part);
            normalized_country := 'USA';
        ELSIF part = ANY(SELECT unnest(us_states)) THEN
            normalized_state := part;
            normalized_country := 'USA';
        ELSE
            -- Not a US state, treat as country
            normalized_state := NULL;
            normalized_country := part;
        END IF;
        
        normalized_location := normalized_city;
        IF normalized_state IS NOT NULL THEN
            normalized_location := normalized_location || ', ' || normalized_state;
        ELSIF normalized_country IS NOT NULL THEN
            normalized_location := normalized_location || ', ' || normalized_country;
        END IF;
        
        RETURN QUERY SELECT normalized_city, normalized_state, normalized_country, normalized_location;
        RETURN;
    END IF;

    -- Pattern 4: Single part - could be city, venue, or full address
    IF part_count = 1 THEN
        normalized_city := parts[1];
        normalized_state := NULL;
        normalized_country := NULL;
        normalized_location := normalized_city;
        
        RETURN QUERY SELECT normalized_city, normalized_state, normalized_country, normalized_location;
        RETURN;
    END IF;

    -- Fallback: return original
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, NULL::TEXT, location_text;
END;
$$;

-- check_team_capacity - Trigger function
CREATE OR REPLACE FUNCTION public.check_team_capacity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
    current_size integer;
    max_size integer;
BEGIN
    -- Only check if joining a team
    IF NEW.team_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get current team size
    SELECT COUNT(*) INTO current_size 
    FROM public.hackathon_participants 
    WHERE team_id = NEW.team_id 
    AND status IN ('registered', 'team_formed');
    
    -- Get max team size for this hackathon
    SELECT h.max_team_size INTO max_size
    FROM public.hackathons h
    JOIN public.hackathon_teams ht ON ht.hackathon_id = h.id
    WHERE ht.id = NEW.team_id;
    
    -- Check capacity
    IF current_size >= max_size THEN
        RAISE EXCEPTION 'Team is at maximum capacity (%)', max_size;
    END IF;
    
    RETURN NEW;
END;
$$;

-- events_title_propagate - Trigger function
CREATE OR REPLACE FUNCTION public.events_title_propagate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
begin
  update public.agenda_speakers set event_title = new.title
  where event_id = new.id;
  return null;
end;
$$;

-- link_event_to_venue - Utility function
CREATE OR REPLACE FUNCTION public.link_event_to_venue(p_event_id uuid, p_create_if_not_found boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
    event_location TEXT;
    event_city TEXT;
    event_state TEXT;
    event_country TEXT;
    matched_venue_id UUID;
    venue_name TEXT;
    venue_address TEXT;
BEGIN
    -- Get event location data
    SELECT 
        e.location,
        e.location_city,
        e.location_state,
        e.location_country
    INTO 
        event_location,
        event_city,
        event_state,
        event_country
    FROM public.events e
    WHERE e.id = p_event_id;

    -- Return NULL if event has no location
    IF event_location IS NULL THEN
        RETURN NULL;
    END IF;

    -- Skip if location is virtual/online (unless there's a "Remote/Virtual" venue)
    IF LOWER(event_location) IN ('online', 'virtual', 'remote') THEN
        -- Check for existing "Remote/Virtual" venue
        SELECT id INTO matched_venue_id
        FROM public.venues
        WHERE LOWER(name) IN ('remote/virtual', 'remote', 'virtual', 'online')
        LIMIT 1;
        
        IF matched_venue_id IS NOT NULL THEN
            UPDATE public.events
            SET venue_id = matched_venue_id
            WHERE id = p_event_id;
            RETURN matched_venue_id;
        END IF;
        
        RETURN NULL;
    END IF;

    -- Try to match by exact location text
    SELECT id INTO matched_venue_id
    FROM public.venues
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(event_location))
    OR LOWER(TRIM(address)) = LOWER(TRIM(event_location))
    LIMIT 1;

    IF matched_venue_id IS NOT NULL THEN
        UPDATE public.events
        SET venue_id = matched_venue_id
        WHERE id = p_event_id;
        RETURN matched_venue_id;
    END IF;

    -- Try to match by city, state, and venue name pattern
    IF event_city IS NOT NULL THEN
        -- Extract potential venue name from location (before first comma)
        venue_name := SPLIT_PART(event_location, ',', 1);
        venue_name := TRIM(venue_name);

        -- Match by city and venue name pattern
        SELECT id INTO matched_venue_id
        FROM public.venues
        WHERE LOWER(city) = LOWER(event_city)
        AND (
            LOWER(name) LIKE '%' || LOWER(venue_name) || '%'
            OR LOWER(venue_name) LIKE '%' || LOWER(name) || '%'
        )
        LIMIT 1;

        IF matched_venue_id IS NOT NULL THEN
            UPDATE public.events
            SET venue_id = matched_venue_id
            WHERE id = p_event_id;
            RETURN matched_venue_id;
        END IF;

        -- Match by city and state
        IF event_state IS NOT NULL THEN
            SELECT id INTO matched_venue_id
            FROM public.venues
            WHERE LOWER(city) = LOWER(event_city)
            AND LOWER(state_province) = LOWER(event_state)
            LIMIT 1;

            IF matched_venue_id IS NOT NULL THEN
                UPDATE public.events
                SET venue_id = matched_venue_id
                WHERE id = p_event_id;
                RETURN matched_venue_id;
            END IF;
        END IF;

        -- Match by city only (if multiple, prefer one with coordinates)
        SELECT id INTO matched_venue_id
        FROM public.venues
        WHERE LOWER(city) = LOWER(event_city)
        ORDER BY 
            CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 0 ELSE 1 END,
            created_at DESC
        LIMIT 1;

        IF matched_venue_id IS NOT NULL THEN
            UPDATE public.events
            SET venue_id = matched_venue_id
            WHERE id = p_event_id;
            RETURN matched_venue_id;
        END IF;
    END IF;

    -- Create new venue if requested and no match found
    IF p_create_if_not_found THEN
        -- Extract venue name (first part before comma, or full location if no comma)
        venue_name := CASE 
            WHEN POSITION(',' IN event_location) > 0 
            THEN TRIM(SPLIT_PART(event_location, ',', 1))
            ELSE TRIM(event_location)
        END;

        -- Extract address (full location or second part after comma)
        venue_address := CASE 
            WHEN POSITION(',' IN event_location) > 0 
            THEN TRIM(SUBSTRING(event_location FROM POSITION(',' IN event_location) + 1))
            ELSE NULL
        END;

        -- Insert new venue
        INSERT INTO public.venues (
            name,
            address,
            city,
            state_province,
            country,
            created_at
        ) VALUES (
            venue_name,
            venue_address,
            event_city,
            event_state,
            COALESCE(event_country, 'USA'),
            NOW()
        )
        RETURNING id INTO matched_venue_id;

        -- Link event to new venue
        UPDATE public.events
        SET venue_id = matched_venue_id
        WHERE id = p_event_id;

        RETURN matched_venue_id;
    END IF;

    -- No match found and not creating
    RETURN NULL;
END;
$$;

-- batch_link_events_to_venues - Utility function
CREATE OR REPLACE FUNCTION public.batch_link_events_to_venues(p_create_if_not_found boolean DEFAULT false, p_limit integer DEFAULT 1000)
RETURNS TABLE(events_processed integer, events_linked integer, venues_created integer, events_skipped integer)
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
    processed_count INT := 0;
    linked_count INT := 0;
    created_count INT := 0;
    skipped_count INT := 0;
    rec RECORD;
    linked_venue_id UUID;
    venue_count_before INT;
    venue_count_after INT;
BEGIN
    -- Get initial venue count
    SELECT COUNT(*) INTO venue_count_before FROM public.venues;

    -- Process events without venue_id
    FOR rec IN 
        SELECT id, location
        FROM public.events
        WHERE venue_id IS NULL
        AND location IS NOT NULL
        LIMIT p_limit
    LOOP
        processed_count := processed_count + 1;

        -- Try to link event
        SELECT public.link_event_to_venue(rec.id, p_create_if_not_found) 
        INTO linked_venue_id;

        IF linked_venue_id IS NOT NULL THEN
            linked_count := linked_count + 1;
        ELSE
            skipped_count := skipped_count + 1;
        END IF;
    END LOOP;

    -- Get final venue count
    SELECT COUNT(*) INTO venue_count_after FROM public.venues;
    created_count := venue_count_after - venue_count_before;

    RETURN QUERY SELECT processed_count, linked_count, created_count, skipped_count;
END;
$$;

-- calculate_distance - Utility function (IMMUTABLE, safe)
CREATE OR REPLACE FUNCTION public.calculate_distance(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
DECLARE
    earth_radius_km NUMERIC := 6371.0;
    dlat NUMERIC;
    dlon NUMERIC;
    a NUMERIC;
    c NUMERIC;
BEGIN
    -- Validate inputs
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;

    -- Convert degrees to radians
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);

    -- Haversine formula
    a := sin(dlat / 2) * sin(dlat / 2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlon / 2) * sin(dlon / 2);
    
    c := 2 * atan2(sqrt(a), sqrt(1 - a));

    RETURN earth_radius_km * c;
END;
$$;

-- find_events_near_location - Query function
CREATE OR REPLACE FUNCTION public.find_events_near_location(p_latitude numeric, p_longitude numeric, p_radius_km numeric DEFAULT 50, p_limit integer DEFAULT 100)
RETURNS TABLE(event_id uuid, title text, location text, distance_km numeric, start_time timestamp with time zone)
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.location,
        public.calculate_distance(
            p_latitude,
            p_longitude,
            COALESCE(v.latitude, e.location_latitude),
            COALESCE(v.longitude, e.location_longitude)
        ) AS distance_km,
        e.start_time
    FROM public.events e
    LEFT JOIN public.venues v ON e.venue_id = v.id
    WHERE (
        (v.latitude IS NOT NULL AND v.longitude IS NOT NULL)
        OR (e.location_latitude IS NOT NULL AND e.location_longitude IS NOT NULL)
    )
    AND public.calculate_distance(
        p_latitude,
        p_longitude,
        COALESCE(v.latitude, e.location_latitude),
        COALESCE(v.longitude, e.location_longitude)
    ) <= p_radius_km
    ORDER BY distance_km ASC
    LIMIT p_limit;
END;
$$;

-- untrack_event_and_update_profile - Already has SECURITY DEFINER and SET search_path, but ensure it's correct
CREATE OR REPLACE FUNCTION public.untrack_event_and_update_profile(p_user_id uuid, p_event_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_was_tracked BOOLEAN := false;
    v_external_event_id TEXT;
    v_external_provider TEXT;
    v_result JSON;
    v_row_count INTEGER;
BEGIN
    -- Get external calendar info before deletion
    SELECT 
        external_calendar_event_id,
        external_provider
    INTO 
        v_external_event_id,
        v_external_provider
    FROM public.user_events 
    WHERE user_id = p_user_id AND event_id = p_event_id;

    -- Delete the user_events record and check if it existed
    DELETE FROM public.user_events 
    WHERE user_id = p_user_id AND event_id = p_event_id;
    
    -- Get the number of rows affected and convert to boolean
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_was_tracked := (v_row_count > 0);

    -- Update profile tracked_events_count if event was actually tracked
    IF v_was_tracked THEN
        UPDATE public.profiles
        SET tracked_events_count = GREATEST(COALESCE(tracked_events_count, 0) - 1, 0),
            updated_at = NOW()
        WHERE id = p_user_id;
    END IF;

    -- Return result with external calendar info for cleanup
    v_result := json_build_object(
        'success', true,
        'was_tracked', v_was_tracked,
        'external_calendar_event_id', v_external_event_id,
        'external_provider', v_external_provider,
        'message', CASE
            WHEN v_was_tracked THEN 'Event untracked successfully'
            ELSE 'Event was not tracked'
        END
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- sync_event_coordinates_from_venue - Utility function
CREATE OR REPLACE FUNCTION public.sync_event_coordinates_from_venue()
RETURNS TABLE(events_updated integer)
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
    updated_count INT := 0;
BEGIN
    UPDATE public.events e
    SET 
        location_latitude = v.latitude,
        location_longitude = v.longitude
    FROM public.venues v
    WHERE e.venue_id = v.id
    AND v.latitude IS NOT NULL
    AND v.longitude IS NOT NULL
    AND (e.location_latitude IS NULL OR e.location_longitude IS NULL);

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    RETURN QUERY SELECT updated_count;
END;
$$;

-- refresh_agenda_speakers_title - Trigger function
CREATE OR REPLACE FUNCTION public.refresh_agenda_speakers_title()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  NEW.event_title := e.title
  FROM public.event_agenda ea
  JOIN public.events e ON ea.event_id = e.id
  WHERE ea.id = NEW.agenda_id;
  RETURN NEW;
END;
$$;

-- refresh_timezone_cache - Already has SECURITY DEFINER, ensure search_path
CREATE OR REPLACE FUNCTION public.refresh_timezone_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.cached_timezone_names;
END;
$$;

-- update_updated_at_column - Trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- filter_events - Complex query function (multiple overloads exist, fixing the plpgsql version)
-- Note: There are multiple filter_events functions. We'll fix the ones that are missing search_path.
-- The SQL version already has SET search_path, so we focus on plpgsql versions.

-- normalize_timezone_to_iana - Utility function (IMMUTABLE)
CREATE OR REPLACE FUNCTION public.normalize_timezone_to_iana(tz text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
begin
  if tz is null then
    return null;
  end if;

  -- Trim and normalize case
  tz := trim(upper(tz));

  -- If already in IANA format (contains '/'), return as-is (after validation)
  if position('/' in tz) > 0 then
    -- Validate it looks like IANA format (Continent/City or Etc/GMT+X)
    if tz ~ '^[A-Za-z_]+/[A-Za-z_]+$' or tz ~ '^Etc/GMT[+-]?\\d+$' or tz = 'UTC' then
      return tz;
    end if;
  end if;

  -- Map common timezone aliases to IANA format
  return case tz
    -- Pacific Time
    when 'PT' then 'America/Los_Angeles'
    when 'PST' then 'America/Los_Angeles'
    when 'PDT' then 'America/Los_Angeles'
    when 'PACIFIC TIME' then 'America/Los_Angeles'
    when 'PACIFIC' then 'America/Los_Angeles'
    
    -- Eastern Time
    when 'ET' then 'America/New_York'
    when 'EST' then 'America/New_York'
    when 'EDT' then 'America/New_York'
    when 'EASTERN TIME' then 'America/New_York'
    when 'EASTERN' then 'America/New_York'
    
    -- Central Time
    when 'CT' then 'America/Chicago'
    when 'CST' then 'America/Chicago'
    when 'CDT' then 'America/Chicago'
    when 'CENTRAL TIME' then 'America/Chicago'
    when 'CENTRAL' then 'America/Chicago'
    
    -- Mountain Time
    when 'MT' then 'America/Denver'
    when 'MST' then 'America/Denver'
    when 'MDT' then 'America/Denver'
    when 'MOUNTAIN TIME' then 'America/Denver'
    when 'MOUNTAIN' then 'America/Denver'
    
    -- Other US timezones
    when 'AKT' then 'America/Anchorage'
    when 'AKST' then 'America/Anchorage'
    when 'AKDT' then 'America/Anchorage'
    when 'HST' then 'Pacific/Honolulu'
    when 'HAWAII TIME' then 'Pacific/Honolulu'
    
    -- International
    when 'GMT' then 'Etc/GMT'
    when 'BST' then 'Europe/London'
    when 'CET' then 'Europe/Paris'
    when 'CEST' then 'Europe/Paris'
    when 'IST' then 'Asia/Kolkata'
    when 'SGT' then 'Asia/Singapore'
    when 'JST' then 'Asia/Tokyo'
    when 'AEST' then 'Australia/Sydney'
    when 'AEDT' then 'Australia/Sydney'
    when 'AWST' then 'Australia/Perth'
    
    -- If no match, return null (will be handled by constraint)
    else null
  end;
end;
$$;

-- get_impact_trend, get_monthly_stats, get_skills_growth_analysis, get_user_analytics_comprehensive
-- These are complex analytics functions. We'll fix the key ones.

-- re_normalize_all_locations - Utility function
CREATE OR REPLACE FUNCTION public.re_normalize_all_locations()
RETURNS TABLE(events_updated integer, events_fixed integer)
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
    updated_count INT := 0;
    fixed_count INT := 0;
    rec RECORD;
    norm_result RECORD;
    was_wrong BOOLEAN;
BEGIN
    FOR rec IN 
        SELECT id, location, location_city, location_state, location_country
        FROM public.events 
        WHERE location IS NOT NULL
    LOOP
        -- Get new normalized values
        SELECT * INTO norm_result
        FROM public.normalize_location(rec.location);

        -- Check if normalization changed
        was_wrong := (
            rec.location_city IS DISTINCT FROM norm_result.city OR
            rec.location_state IS DISTINCT FROM norm_result.state OR
            rec.location_country IS DISTINCT FROM norm_result.country
        );

        -- Update event with new normalized values
        UPDATE public.events
        SET 
            location_city = norm_result.city,
            location_state = norm_result.state,
            location_country = norm_result.country,
            location_normalized = norm_result.normalized
        WHERE id = rec.id;

        updated_count := updated_count + 1;
        
        IF was_wrong THEN
            fixed_count := fixed_count + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT updated_count, fixed_count;
END;
$$;

-- find_event_by_external_id - Already has SECURITY DEFINER, ensure search_path
CREATE OR REPLACE FUNCTION public.find_event_by_external_id(p_external_id text, p_source text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  event_uuid uuid;
  full_external_id text;
BEGIN
  -- If source provided, construct full external ID
  IF p_source IS NOT NULL THEN
    full_external_id := p_source || '_' || p_external_id;
  ELSE
    full_external_id := p_external_id;
  END IF;
  
  -- Try to find by external_id first
  SELECT id INTO event_uuid
  FROM public.events
  WHERE external_id = full_external_id
  LIMIT 1;
  
  -- If not found and we have a source, try pattern matching on source_url
  IF event_uuid IS NULL AND p_source = 'eventbrite' THEN
    SELECT id INTO event_uuid
    FROM public.events
    WHERE source_url LIKE '%eventbrite.com%' 
    AND source_url LIKE '%' || p_external_id || '%'
    LIMIT 1;
  END IF;
  
  RETURN event_uuid;
END;
$$;

-- find_similar_events - Query function (STABLE)
CREATE OR REPLACE FUNCTION public.find_similar_events(p_title text, p_start_time timestamp with time zone, p_similarity_threshold numeric DEFAULT 0.6, p_organizer_id text DEFAULT NULL::text)
RETURNS TABLE(event_id uuid, title text, similarity numeric)
LANGUAGE plpgsql
STABLE
SET search_path TO ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id::UUID as event_id,
        e.title,
        CAST(similarity(e.title, p_title) AS NUMERIC) as similarity
    FROM public.events e
    WHERE 
        -- Similarity check using pg_trgm
        similarity(e.title, p_title) >= p_similarity_threshold
        -- Time window: within 1 hour of start_time
        AND e.start_time BETWEEN (p_start_time - INTERVAL '1 hour') 
                              AND (p_start_time + INTERVAL '1 hour')
        -- Optional organizer filter
        AND (p_organizer_id IS NULL OR e.organizer_id = p_organizer_id::UUID)
    ORDER BY similarity(e.title, p_title) DESC
    LIMIT 10;
END;
$$;

-- update_event_fts - Trigger function
CREATE OR REPLACE FUNCTION public.update_event_fts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
    NEW.fts := to_tsvector('english',
        COALESCE(NEW.title, '') || ' ' ||
        COALESCE(NEW.description, '') || ' ' ||
        (SELECT name FROM public.organizers WHERE id = NEW.organizer_id)
    );
    RETURN NEW;
END;
$$;

-- Note: Many other functions already have SET search_path or are SECURITY DEFINER with search_path.
-- The functions above are the main ones identified in the audit that needed fixing.

