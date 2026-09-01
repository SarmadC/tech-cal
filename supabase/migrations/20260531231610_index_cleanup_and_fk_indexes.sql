
-- ==========================================================================
-- PERFORMANCE: Drop duplicate indexes, add indexes for unindexed FK columns
-- ==========================================================================

-- Drop duplicate indexes (identical definitions, keep the more descriptive name)
DROP INDEX IF EXISTS public.event_update_queue_fields_queue_field_idx;
DROP INDEX IF EXISTS public.idx_user_submitted_events_status;

-- Add indexes for unindexed foreign keys

-- circle_comments
CREATE INDEX IF NOT EXISTS idx_circle_comments_author_id ON public.circle_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_circle_comments_moderated_by ON public.circle_comments(moderated_by) WHERE moderated_by IS NOT NULL;

-- circle_event_links
CREATE INDEX IF NOT EXISTS idx_circle_event_links_created_by ON public.circle_event_links(created_by) WHERE created_by IS NOT NULL;

-- circle_moderators
CREATE INDEX IF NOT EXISTS idx_circle_moderators_user_id ON public.circle_moderators(user_id);

-- circle_post_pins
CREATE INDEX IF NOT EXISTS idx_circle_post_pins_post_id ON public.circle_post_pins(post_id);
CREATE INDEX IF NOT EXISTS idx_circle_post_pins_pinned_by ON public.circle_post_pins(pinned_by) WHERE pinned_by IS NOT NULL;

-- circle_posts
CREATE INDEX IF NOT EXISTS idx_circle_posts_author_id ON public.circle_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_circle_posts_moderated_by ON public.circle_posts(moderated_by) WHERE moderated_by IS NOT NULL;

-- circles
CREATE INDEX IF NOT EXISTS idx_circles_owner_id ON public.circles(owner_id) WHERE owner_id IS NOT NULL;

-- community_reports
CREATE INDEX IF NOT EXISTS idx_community_reports_reviewed_by ON public.community_reports(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- event_networking_summary
CREATE INDEX IF NOT EXISTS idx_event_networking_summary_event_id ON public.event_networking_summary(event_id);

-- event_update_queue
CREATE INDEX IF NOT EXISTS idx_event_update_queue_latest_source_event_id ON public.event_update_queue(latest_source_event_id) WHERE latest_source_event_id IS NOT NULL;

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_circle_id ON public.notifications(circle_id) WHERE circle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_comment_id ON public.notifications(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_post_id ON public.notifications(post_id) WHERE post_id IS NOT NULL;

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_community_moderated_by ON public.profiles(community_moderated_by) WHERE community_moderated_by IS NOT NULL;

-- subscription_events
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON public.subscription_events(subscription_id) WHERE subscription_id IS NOT NULL;

-- team_invites
CREATE INDEX IF NOT EXISTS idx_team_invites_hackathon_id ON public.team_invites(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_invitee_id ON public.team_invites(invitee_id) WHERE invitee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_invites_inviter_id ON public.team_invites(inviter_id) WHERE inviter_id IS NOT NULL;

-- team_messages
CREATE INDEX IF NOT EXISTS idx_team_messages_team_id ON public.team_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_user_id ON public.team_messages(user_id);

-- user_networking_contacts
CREATE INDEX IF NOT EXISTS idx_user_networking_contacts_source_event_id ON public.user_networking_contacts(source_event_id) WHERE source_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_networking_contacts_target_speaker_id ON public.user_networking_contacts(target_speaker_id) WHERE target_speaker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_networking_contacts_target_user_id ON public.user_networking_contacts(target_user_id) WHERE target_user_id IS NOT NULL;

-- user_submitted_events
CREATE INDEX IF NOT EXISTS idx_user_submitted_events_event_id ON public.user_submitted_events(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_submitted_events_reviewed_by ON public.user_submitted_events(reviewed_by) WHERE reviewed_by IS NOT NULL;
;
