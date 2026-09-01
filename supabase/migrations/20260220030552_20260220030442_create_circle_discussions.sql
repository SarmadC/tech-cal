-- Ensure the handle_updated_at function exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create circle_posts table
CREATE TABLE IF NOT EXISTS public.circle_posts (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    circle_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),

    CONSTRAINT circle_posts_pkey PRIMARY KEY (id),
    CONSTRAINT circle_posts_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES public.circles(id) ON DELETE CASCADE,
    CONSTRAINT circle_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create circle_comments table
CREATE TABLE IF NOT EXISTS public.circle_comments (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    post_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),

    CONSTRAINT circle_comments_pkey PRIMARY KEY (id),
    CONSTRAINT circle_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.circle_posts(id) ON DELETE CASCADE,
    CONSTRAINT circle_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_circle_posts_circle_id_created_at ON public.circle_posts(circle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_circle_comments_post_id_created_at ON public.circle_comments(post_id, created_at ASC);

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_circle_posts_updated_at ON public.circle_posts;
CREATE TRIGGER update_circle_posts_updated_at
    BEFORE UPDATE ON public.circle_posts
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS update_circle_comments_updated_at ON public.circle_comments;
CREATE TRIGGER update_circle_comments_updated_at
    BEFORE UPDATE ON public.circle_comments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Setup Row Level Security (RLS)
ALTER TABLE public.circle_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_comments ENABLE ROW LEVEL SECURITY;

-- Post Policies
-- 1. Anyone can read posts
CREATE POLICY "Public profiles and authenticated users can view posts"
    ON public.circle_posts FOR SELECT
    USING (true);

-- 2. Only circle members can insert posts
CREATE POLICY "Circle members can create posts"
    ON public.circle_posts FOR INSERT
    WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM public.circle_members
            WHERE circle_id = circle_posts.circle_id
            AND user_id = auth.uid()
        )
    );

-- 3. Only the author can update their post
CREATE POLICY "Authors can update their own posts"
    ON public.circle_posts FOR UPDATE
    USING (auth.uid() = author_id);

-- 4. Only the author can delete their post
CREATE POLICY "Authors can delete their own posts"
    ON public.circle_posts FOR DELETE
    USING (auth.uid() = author_id);

-- Comment Policies
-- 1. Anyone can read comments
CREATE POLICY "Public profiles and authenticated users can view comments"
    ON public.circle_comments FOR SELECT
    USING (true);

-- 2. Only circle members can insert comments (must be member of the circle the post belongs to)
CREATE POLICY "Circle members can create comments"
    ON public.circle_comments FOR INSERT
    WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1
            FROM public.circle_posts p
            JOIN public.circle_members m ON p.circle_id = m.circle_id
            WHERE p.id = post_id AND m.user_id = auth.uid()
        )
    );

-- 3. Only the author can update their comment
CREATE POLICY "Authors can update their own comments"
    ON public.circle_comments FOR UPDATE
    USING (auth.uid() = author_id);

-- 4. Only the author can delete their comment
CREATE POLICY "Authors can delete their own comments"
    ON public.circle_comments FOR DELETE
    USING (auth.uid() = author_id);;
