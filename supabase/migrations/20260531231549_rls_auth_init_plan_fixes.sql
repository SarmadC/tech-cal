
-- ==========================================================================
-- PERFORMANCE: Fix RLS policies using bare auth.uid()/auth.role() to use
-- (select auth.uid())/(select auth.role()) — prevents per-row re-evaluation
-- ==========================================================================

-- blocks
ALTER POLICY "blocks_delete_own" ON public.blocks
  USING ((select auth.uid()) = blocker_id);

ALTER POLICY "blocks_insert_own" ON public.blocks
  WITH CHECK ((select auth.uid()) = blocker_id);

ALTER POLICY "blocks_select_own" ON public.blocks
  USING (((select auth.uid()) = blocker_id) OR ((select auth.uid()) = blocked_id));

-- circle_comment_votes
ALTER POLICY "Circle members can insert comment votes" ON public.circle_comment_votes
  WITH CHECK (
    ((select auth.uid()) = user_id) AND
    (EXISTS (
      SELECT 1 FROM ((circle_members cm
        JOIN circle_posts cp ON (cp.circle_id = cm.circle_id))
        JOIN circle_comments cc ON (cc.post_id = cp.id))
      WHERE (cm.user_id = (select auth.uid())) AND (cc.id = circle_comment_votes.comment_id)
    ))
  );

ALTER POLICY "Users can delete their own comment votes" ON public.circle_comment_votes
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can update their own comment votes" ON public.circle_comment_votes
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- circle_comments
ALTER POLICY "Authors can delete their own comments" ON public.circle_comments
  USING ((select auth.uid()) = author_id);

ALTER POLICY "Authors can update their own comments" ON public.circle_comments
  USING ((select auth.uid()) = author_id);

ALTER POLICY "Circle members can create comments" ON public.circle_comments
  WITH CHECK (
    ((select auth.uid()) = author_id) AND
    (EXISTS (
      SELECT 1 FROM (circle_posts p JOIN circle_members m ON (p.circle_id = m.circle_id))
      WHERE (p.id = circle_comments.post_id) AND (m.user_id = (select auth.uid()))
    ))
  );

-- circle_event_links
ALTER POLICY "circle_event_links_write" ON public.circle_event_links
  USING (EXISTS (
    SELECT 1 FROM circles c
    WHERE (c.id = circle_event_links.circle_id) AND (
      (c.owner_id = (select auth.uid())) OR
      (EXISTS (SELECT 1 FROM circle_moderators m WHERE (m.circle_id = c.id) AND (m.user_id = (select auth.uid()))))
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM circles c
    WHERE (c.id = circle_event_links.circle_id) AND (
      (c.owner_id = (select auth.uid())) OR
      (EXISTS (SELECT 1 FROM circle_moderators m WHERE (m.circle_id = c.id) AND (m.user_id = (select auth.uid()))))
    )
  ));

-- circle_members
ALTER POLICY "Users can join circles" ON public.circle_members
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can leave circles" ON public.circle_members
  USING ((select auth.uid()) = user_id);

-- circle_moderators
ALTER POLICY "circle_moderators_write" ON public.circle_moderators
  USING (EXISTS (
    SELECT 1 FROM circles c
    WHERE (c.id = circle_moderators.circle_id) AND (c.owner_id = (select auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM circles c
    WHERE (c.id = circle_moderators.circle_id) AND (c.owner_id = (select auth.uid()))
  ));

-- circle_post_links
ALTER POLICY "circle_post_links_author_write" ON public.circle_post_links
  USING (EXISTS (
    SELECT 1 FROM circle_posts p
    WHERE (p.id = circle_post_links.post_id) AND (p.author_id = (select auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM circle_posts p
    WHERE (p.id = circle_post_links.post_id) AND (p.author_id = (select auth.uid()))
  ));

-- circle_post_media
ALTER POLICY "circle_post_media_delete" ON public.circle_post_media
  USING (EXISTS (
    SELECT 1 FROM circle_posts p
    WHERE (p.id = circle_post_media.post_id) AND (p.author_id = (select auth.uid()))
  ));

ALTER POLICY "circle_post_media_insert" ON public.circle_post_media
  WITH CHECK (EXISTS (
    SELECT 1 FROM circle_posts p
    WHERE (p.id = circle_post_media.post_id) AND (p.author_id = (select auth.uid()))
  ));

-- circle_post_mentions
ALTER POLICY "circle_post_mentions_delete" ON public.circle_post_mentions
  USING (EXISTS (
    SELECT 1 FROM circle_posts p
    WHERE (p.id = circle_post_mentions.post_id) AND (p.author_id = (select auth.uid()))
  ));

ALTER POLICY "circle_post_mentions_insert" ON public.circle_post_mentions
  WITH CHECK (EXISTS (
    SELECT 1 FROM circle_posts p
    WHERE (p.id = circle_post_mentions.post_id) AND (p.author_id = (select auth.uid()))
  ));

-- circle_post_pins
ALTER POLICY "circle_post_pins_write" ON public.circle_post_pins
  USING (EXISTS (
    SELECT 1 FROM circles c
    WHERE (c.id = circle_post_pins.circle_id) AND (
      (c.owner_id = (select auth.uid())) OR
      (EXISTS (SELECT 1 FROM circle_moderators m WHERE (m.circle_id = c.id) AND (m.user_id = (select auth.uid()))))
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM circles c
    WHERE (c.id = circle_post_pins.circle_id) AND (
      (c.owner_id = (select auth.uid())) OR
      (EXISTS (SELECT 1 FROM circle_moderators m WHERE (m.circle_id = c.id) AND (m.user_id = (select auth.uid()))))
    )
  ));

-- circle_post_votes
ALTER POLICY "Circle members can insert post votes" ON public.circle_post_votes
  WITH CHECK (
    ((select auth.uid()) = user_id) AND
    (EXISTS (
      SELECT 1 FROM (circle_members cm JOIN circle_posts cp ON (cp.circle_id = cm.circle_id))
      WHERE (cm.user_id = (select auth.uid())) AND (cp.id = circle_post_votes.post_id)
    ))
  );

ALTER POLICY "Users can delete their own post votes" ON public.circle_post_votes
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can update their own post votes" ON public.circle_post_votes
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- circle_posts
ALTER POLICY "Authors can delete their own posts" ON public.circle_posts
  USING ((select auth.uid()) = author_id);

ALTER POLICY "Authors can update their own posts" ON public.circle_posts
  USING ((select auth.uid()) = author_id);

ALTER POLICY "Circle members can create posts" ON public.circle_posts
  WITH CHECK (
    ((select auth.uid()) = author_id) AND
    (EXISTS (
      SELECT 1 FROM circle_members
      WHERE (circle_members.circle_id = circle_posts.circle_id) AND
            (circle_members.user_id = (select auth.uid()))
    ))
  );

-- community_reports
ALTER POLICY "community_reports_insert_own" ON public.community_reports
  WITH CHECK ((select auth.uid()) = reporter_id);

ALTER POLICY "community_reports_select_own" ON public.community_reports
  USING ((select auth.uid()) = reporter_id);

-- event_field_edits
ALTER POLICY "Admins can view event_field_edits" ON public.event_field_edits
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

-- event_field_protection_config
ALTER POLICY "Admins can manage event_field_protection_config" ON public.event_field_protection_config
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

-- event_moderation_queue
ALTER POLICY "Admins can view event_moderation_queue" ON public.event_moderation_queue
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

-- event_room_thread_comments
ALTER POLICY "event_room_thread_comments_delete" ON public.event_room_thread_comments
  USING (author_id = (select auth.uid()));

ALTER POLICY "event_room_thread_comments_insert" ON public.event_room_thread_comments
  WITH CHECK (author_id = (select auth.uid()));

ALTER POLICY "event_room_thread_comments_select" ON public.event_room_thread_comments
  USING ((select auth.uid()) IS NOT NULL);

ALTER POLICY "event_room_thread_comments_update" ON public.event_room_thread_comments
  USING (author_id = (select auth.uid()))
  WITH CHECK (author_id = (select auth.uid()));

-- event_room_threads
ALTER POLICY "event_room_threads_delete" ON public.event_room_threads
  USING (author_id = (select auth.uid()));

ALTER POLICY "event_room_threads_insert" ON public.event_room_threads
  WITH CHECK (author_id = (select auth.uid()));

ALTER POLICY "event_room_threads_select" ON public.event_room_threads
  USING ((select auth.uid()) IS NOT NULL);

ALTER POLICY "event_room_threads_update" ON public.event_room_threads
  USING (author_id = (select auth.uid()))
  WITH CHECK (author_id = (select auth.uid()));

-- event_update_log
ALTER POLICY "Admins can view event_update_log" ON public.event_update_log
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

-- event_update_queue
ALTER POLICY "Admins can delete event_update_queue" ON public.event_update_queue
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

ALTER POLICY "Admins can update event_update_queue" ON public.event_update_queue
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

ALTER POLICY "Admins can view event_update_queue" ON public.event_update_queue
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

-- event_update_queue_fields
ALTER POLICY "Admins can delete event_update_queue_fields" ON public.event_update_queue_fields
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

ALTER POLICY "Admins can update event_update_queue_fields" ON public.event_update_queue_fields
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

ALTER POLICY "Admins can view event_update_queue_fields" ON public.event_update_queue_fields
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

-- follows
ALTER POLICY "follows_delete_own" ON public.follows
  USING ((select auth.uid()) = follower_id);

ALTER POLICY "follows_insert_own" ON public.follows
  WITH CHECK (
    ((select auth.uid()) = follower_id) AND
    (NOT (EXISTS (
      SELECT 1 FROM blocks b
      WHERE ((b.blocker_id = follows.follower_id) AND (b.blocked_id = follows.following_id)) OR
            ((b.blocker_id = follows.following_id) AND (b.blocked_id = follows.follower_id))
    )))
  );

ALTER POLICY "follows_select_authenticated" ON public.follows
  USING ((select auth.role()) = 'authenticated'::text);

-- hackathon_participants
ALTER POLICY "hackathon_participants_delete_own" ON public.hackathon_participants
  USING ((select auth.uid()) = user_id);

ALTER POLICY "hackathon_participants_insert_own" ON public.hackathon_participants
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "hackathon_participants_update_own" ON public.hackathon_participants
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- hackathon_tags
ALTER POLICY "hackathon_tags_delete_admin" ON public.hackathon_tags
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = (select auth.uid())) AND (p.is_admin = true)
  ));

ALTER POLICY "hackathon_tags_insert_authenticated" ON public.hackathon_tags
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM (hackathon_teams ht JOIN hackathons h ON (h.id = ht.hackathon_id))
      WHERE (h.id = ht.hackathon_id) AND (ht.created_by = (select auth.uid()))
    )) OR
    (EXISTS (
      SELECT 1 FROM profiles p
      WHERE (p.id = (select auth.uid())) AND (p.is_admin = true)
    ))
  );

-- hackathon_teams
ALTER POLICY "hackathon_teams_delete_own" ON public.hackathon_teams
  USING ((select auth.uid()) = created_by);

ALTER POLICY "hackathon_teams_insert_own" ON public.hackathon_teams
  WITH CHECK ((select auth.uid()) = created_by);

ALTER POLICY "hackathon_teams_update_own" ON public.hackathon_teams
  USING ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

-- notification_preferences
ALTER POLICY "users manage own prefs" ON public.notification_preferences
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- notifications
ALTER POLICY "users read own notifications" ON public.notifications
  USING ((select auth.uid()) = recipient_id);

ALTER POLICY "users update own notifications" ON public.notifications
  USING ((select auth.uid()) = recipient_id)
  WITH CHECK ((select auth.uid()) = recipient_id);

-- post_categories
ALTER POLICY "Admins can delete categories" ON public.post_categories
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

ALTER POLICY "Admins can insert categories" ON public.post_categories
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

ALTER POLICY "Admins can update categories" ON public.post_categories
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

-- profiles
ALTER POLICY "Users can update own profile" ON public.profiles
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "Users can view own profile" ON public.profiles
  USING ((select auth.uid()) = id);

-- recommendation_batches
ALTER POLICY "recommendation_batches_insert_own" ON public.recommendation_batches
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "recommendation_batches_select_own" ON public.recommendation_batches
  USING ((select auth.uid()) = user_id);

-- source_allowlist
ALTER POLICY "Admins can view source_allowlist" ON public.source_allowlist
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

-- source_blocklist
ALTER POLICY "Admins can view source_blocklist" ON public.source_blocklist
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = (select auth.uid())) AND (profiles.is_admin = true)
  ));

-- subscription_events
ALTER POLICY "Service role full access to subscription_events" ON public.subscription_events
  USING ((select auth.role()) = 'service_role'::text);

-- subscription_events_dlq
ALTER POLICY "Service role full access to subscription_events_dlq" ON public.subscription_events_dlq
  USING ((select auth.role()) = 'service_role'::text);

-- subscriptions
ALTER POLICY "Service role full access to subscriptions" ON public.subscriptions
  USING ((select auth.role()) = 'service_role'::text);

ALTER POLICY "Users can read own subscription" ON public.subscriptions
  USING ((select auth.uid()) = user_id);

-- team_invites
ALTER POLICY "Invitees can update invite status" ON public.team_invites
  USING ((select auth.uid()) = invitee_id);

ALTER POLICY "Team creators can send invites" ON public.team_invites
  WITH CHECK (
    ((select auth.uid()) = inviter_id) AND
    (EXISTS (
      SELECT 1 FROM hackathon_teams
      WHERE (hackathon_teams.id = team_invites.team_id) AND
            (hackathon_teams.created_by = (select auth.uid()))
    ))
  );

ALTER POLICY "Users can view their own invites" ON public.team_invites
  USING (((select auth.uid()) = invitee_id) OR ((select auth.uid()) = inviter_id));

-- team_messages
ALTER POLICY "Team members can read messages" ON public.team_messages
  USING (EXISTS (
    SELECT 1 FROM hackathon_participants
    WHERE (hackathon_participants.team_id = team_messages.team_id) AND
          (hackathon_participants.user_id = (select auth.uid()))
  ));

ALTER POLICY "Team members can send messages" ON public.team_messages
  WITH CHECK (
    ((select auth.uid()) = user_id) AND
    (EXISTS (
      SELECT 1 FROM hackathon_participants
      WHERE (hackathon_participants.team_id = team_messages.team_id) AND
            (hackathon_participants.user_id = (select auth.uid()))
    ))
  );

-- trust_levels
ALTER POLICY "trust_levels_insert_own" ON public.trust_levels
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "trust_levels_select_own" ON public.trust_levels
  USING ((select auth.uid()) = user_id);

ALTER POLICY "trust_levels_update_own" ON public.trust_levels
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- user_social_stats
ALTER POLICY "user_social_stats_select_authenticated" ON public.user_social_stats
  USING ((select auth.role()) = 'authenticated'::text);

-- user_submitted_events
ALTER POLICY "users_insert_own_submissions" ON public.user_submitted_events
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "users_read_own_submissions" ON public.user_submitted_events
  USING ((select auth.uid()) = user_id);
;
