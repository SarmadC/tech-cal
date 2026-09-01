-- Create circles table
CREATE TABLE IF NOT EXISTS public.circles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    href TEXT NOT NULL,
    member_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: We could add an updated_at trigger, but let's keep it simple for now if it's not strictly required.

-- Create circle_members table
CREATE TABLE IF NOT EXISTS public.circle_members (
    circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (circle_id, user_id)
);

-- Add index on user_id for faster lookups when finding a user's circles
CREATE INDEX IF NOT EXISTS idx_circle_members_user_id ON public.circle_members(user_id);

-- Enable RLS
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

-- Policies for circles
-- Anyone can read active circles
CREATE POLICY "Circles are viewable by everyone"
    ON public.circles
    FOR SELECT
    USING (true);

-- Only service role / admins can insert, update, or delete circles for now.
-- By default, RLS blocks mutations if no policy exists, so we don't strictly need a policy here for normal users,
-- but the service role can bypass RLS anyway.

-- Policies for circle_members
-- Anyone can read who is in a circle
CREATE POLICY "Circle members are viewable by everyone"
    ON public.circle_members
    FOR SELECT
    USING (true);

-- Users can only join circles themselves (insert)
CREATE POLICY "Users can join circles"
    ON public.circle_members
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only leave circles themselves (delete)
CREATE POLICY "Users can leave circles"
    ON public.circle_members
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create a function/trigger to update the member_count on circles
CREATE OR REPLACE FUNCTION public.handle_circle_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.circles
        SET member_count = member_count + 1
        WHERE id = NEW.circle_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.circles
        SET member_count = member_count - 1
        WHERE id = OLD.circle_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_circle_member_change
    AFTER INSERT OR DELETE ON public.circle_members
    FOR EACH ROW EXECUTE FUNCTION public.handle_circle_member_count();

-- Insert initial seed data for circles
INSERT INTO public.circles (id, slug, name, description, href) VALUES
    ('11111111-1111-1111-1111-111111111111', 'ai', 'AI Circle', 'Find builders shipping LLM apps, agents, and infra this quarter.', '/events?circle=ai'),
    ('22222222-2222-2222-2222-222222222222', 'product', 'Product Circle', 'For PMs, designers, and growth folks building products people love.', '/events?circle=product'),
    ('33333333-3333-3333-3333-333333333333', 'design', 'Design Circle', 'For designers, UX researchers, and creative technologists.', '/events?circle=design'),
    ('44444444-4444-4444-4444-444444444444', 'founder', 'Founder Circle', 'For early-stage founders navigating 0 to 1 and beyond.', '/events?circle=founder')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    href = EXCLUDED.href;;
