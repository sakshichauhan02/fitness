-- Supabase Schema for FitAI Profiles

-- 1. Create the profiles table linked to Supabase Auth users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    gender TEXT, -- 'Male', 'Female', 'Other'
    date_of_birth DATE,
    height NUMERIC, -- stored in cm (can be converted in UI)
    height_unit TEXT, -- 'cm' or 'ft-in'
    weight NUMERIC, -- stored in kg
    weight_unit TEXT, -- 'kg' or 'lbs'
    target_weight NUMERIC, -- stored in kg
    target_weight_unit TEXT, -- 'kg' or 'lbs'
    current_physique TEXT, -- 'Skinny', 'Skinny-Fat', 'Average', 'Athletic', 'Overweight'
    target_goal TEXT, -- 'V-Taper Focus', 'Lean Bulk', 'Aggressive Cut', 'Strength & Performance'
    dietary_identity TEXT, -- 'Strict Veg', 'Eggitarian', 'Non-Veg', 'Dairy-Free'
    equipment_access TEXT, -- 'Commercial Gym', 'Home Dumbbells', 'Bodyweight'
    onboarded BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create security policies
-- Allow users to view any profile (or we can restrict to own, but public viewable is common if profiles are shareable)
CREATE POLICY "Profiles are viewable by owner" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- 4. Trigger function to automatically create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, name, onboarded)
    VALUES (
        new.id,
        coalesce(new.raw_user_meta_data->>'name', ''),
        false
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 5. Create gamification tables
CREATE TABLE IF NOT EXISTS public.user_streaks (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    current_streak INT DEFAULT 0 NOT NULL,
    longest_streak INT DEFAULT 0 NOT NULL,
    last_completed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.streak_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    completed_date DATE NOT NULL,
    meals_logged BOOLEAN DEFAULT FALSE NOT NULL,
    macros_met BOOLEAN DEFAULT FALSE NOT NULL,
    calories_logged INT DEFAULT 0 NOT NULL,
    protein_logged INT DEFAULT 0 NOT NULL,
    carbs_logged INT DEFAULT 0 NOT NULL,
    fats_logged INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_date UNIQUE (user_id, completed_date)
);

CREATE TABLE IF NOT EXISTS public.user_badges (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    badge_name TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_badge UNIQUE (user_id, badge_name)
);

-- Enable RLS for gamification tables
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Create security policies for gamification tables
CREATE POLICY "Users can view their own streaks" 
    ON public.user_streaks FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks" 
    ON public.user_streaks FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own streak history" 
    ON public.streak_history FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own badges" 
    ON public.user_badges FOR SELECT 
    USING (auth.uid() = user_id);

-- 6. Create historical tracking tables
CREATE TABLE IF NOT EXISTS public.daily_summaries (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight NUMERIC,
    water_intake NUMERIC DEFAULT 0 NOT NULL,
    workout_completed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS public.meal_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    name TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    calories INT NOT NULL,
    protein INT NOT NULL,
    carbs INT NOT NULL,
    fats INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for history tables
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

-- Create security policies for history tables
CREATE POLICY "Users can view their own daily summaries" 
    ON public.daily_summaries FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily summaries" 
    ON public.daily_summaries FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own meal logs" 
    ON public.meal_logs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own meal logs" 
    ON public.meal_logs FOR ALL 
    USING (auth.uid() = user_id);


