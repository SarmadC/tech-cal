-- Migration: Add Reddit-style threading and voting to Circle Discussions

-- 1. Add parent_id to circle_comments for nested threads
ALTER TABLE public.circle_comments
ADD COLUMN parent_id UUID REFERENCES public.circle_comments(id) ON DELETE CASCADE;

-- Add an index for fetching nested comments quickly
CREATE INDEX IF NOT EXISTS idx_circle_comments_parent_id ON public.circle_comments(parent_id);

-- 2. Create circle_post_votes table
CREATE TABLE IF NOT EXISTS public.circle_post_votes (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.circle_posts(id) ON DELETE CASCADE,
    vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, post_id)
);

-- Indexes for quick vote aggregations
CREATE INDEX IF NOT EXISTS idx_circle_post_votes_post_id ON public.circle_post_votes(post_id);

-- 3. Create circle_comment_votes table
CREATE TABLE IF NOT EXISTS public.circle_comment_votes (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES public.circle_comments(id) ON DELETE CASCADE,
    vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, comment_id)
);

-- Indexes for quick vote aggregations
CREATE INDEX IF NOT EXISTS idx_circle_comment_votes_comment_id ON public.circle_comment_votes(comment_id);

-- 4. Set up Row Level Security (RLS) for Votes

ALTER TABLE public.circle_post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_comment_votes ENABLE ROW LEVEL SECURITY;

-- Post Votes RLS:
-- Anyone can read votes (even non-members can see scores)
CREATE POLICY "Public can view post votes"
    ON public.circle_post_votes FOR SELECT
    USING (true);

-- Only authenticated users who are members of the circle can vote on posts
CREATE POLICY "Circle members can insert post votes"
    ON public.circle_post_votes FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.circle_members cm
            JOIN public.circle_posts cp ON cp.circle_id = cm.circle_id
            WHERE cm.user_id = auth.uid() AND cp.id = post_id
        )
    );

CREATE POLICY "Users can update their own post votes"
    ON public.circle_post_votes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own post votes"
    ON public.circle_post_votes FOR DELETE
    USING (auth.uid() = user_id);

-- Comment Votes RLS:
-- Anyone can read comment votes
CREATE POLICY "Public can view comment votes"
    ON public.circle_comment_votes FOR SELECT
    USING (true);

-- Only authenticated users who are members of the circle can vote on comments
CREATE POLICY "Circle members can insert comment votes"
    ON public.circle_comment_votes FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.circle_members cm
            JOIN public.circle_posts cp ON cp.circle_id = cm.circle_id
            JOIN public.circle_comments cc ON cc.post_id = cp.id
            WHERE cm.user_id = auth.uid() AND cc.id = comment_id
        )
    );

CREATE POLICY "Users can update their own comment votes"
    ON public.circle_comment_votes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment votes"
    ON public.circle_comment_votes FOR DELETE
    USING (auth.uid() = user_id);
;
