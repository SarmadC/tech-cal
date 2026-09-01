SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'event_agenda' AND column_name IN ('start_time', 'end_time');;
