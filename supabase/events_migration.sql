-- Events table for crowdsourced city incident reporting
CREATE TABLE IF NOT EXISTS public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('infrastructure', 'emergency', 'urban', 'events')),
    media_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    impact_level INTEGER DEFAULT 1 CHECK (impact_level BETWEEN 1 AND 3),
    lifecycle TEXT DEFAULT 'active' CHECK (lifecycle IN ('planned', 'active', 'resolving')),
    smart_tags TEXT[] DEFAULT '{}',
    description TEXT,
    trust_score INTEGER DEFAULT 0,
    effect_radius INTEGER DEFAULT 100
);

-- Indexes for geospatial and category queries
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_lifecycle ON public.events(lifecycle);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);

-- RLS policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Anyone can read events
CREATE POLICY "Events are viewable by everyone" ON public.events
    FOR SELECT USING (true);

-- Authenticated users can create events
CREATE POLICY "Authenticated users can create events" ON public.events
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Authors can update their own events
CREATE POLICY "Users can update own events" ON public.events
    FOR UPDATE USING (auth.uid() = user_id);

-- Authors can delete their own events
CREATE POLICY "Users can delete own events" ON public.events
    FOR DELETE USING (auth.uid() = user_id);
