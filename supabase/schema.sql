-- Create Enum for User Roles
CREATE TYPE user_role AS ENUM ('citizen', 'volunteer', 'emergency', 'government', 'admin');

-- Create Profiles Table (Extends Supabase Auth Auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'citizen',
    points INT DEFAULT 0, -- Used for volunteer gamification
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
ON profiles FOR SELECT
USING ( true );

CREATE POLICY "Users can insert their own profile."
ON profiles FOR INSERT
WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
ON profiles FOR UPDATE
USING ( auth.uid() = id );

-- Create Tasks Table (For Volunteer Gamification)
CREATE TYPE task_status AS ENUM ('pending', 'assigned', 'completed', 'cancelled');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID REFERENCES profiles(id) NOT NULL, -- The disabled user requesting help
    volunteer_id UUID REFERENCES profiles(id), -- The volunteer assisting
    title TEXT NOT NULL,
    description TEXT,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    status task_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks are viewable by everyone."
ON tasks FOR SELECT USING ( true );

CREATE POLICY "Citizens can create tasks."
ON tasks FOR INSERT WITH CHECK ( auth.uid() = citizen_id );

CREATE POLICY "Participants can update tasks."
ON tasks FOR UPDATE USING ( auth.uid() = citizen_id OR auth.uid() = volunteer_id OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin') );

-- Create Emergency Alerts Table (112)
CREATE TYPE alert_status AS ENUM ('active', 'resolved', 'false_alarm');

CREATE TABLE emergency_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    status alert_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- RLS for emergency alerts
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;

-- Anyone can read alerts
CREATE POLICY "Emergency alerts are viewable by everyone."
ON emergency_alerts FOR SELECT USING ( true );

-- Anyone authenticated can create an alert
CREATE POLICY "Authenticated users can create emergency alerts."
ON emergency_alerts FOR INSERT WITH CHECK ( auth.role() = 'authenticated' );

-- Only Emergency, Government, or Admin can update an alert status
CREATE POLICY "Authorized personnel can update alerts."
ON emergency_alerts FOR UPDATE USING ( 
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('emergency', 'government', 'admin')) 
);

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_tasks_modtime
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
