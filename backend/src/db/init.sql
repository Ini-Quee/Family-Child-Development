-- ============================================
-- FamilyOS — PostgreSQL Schema
-- ============================================
-- This file runs automatically when the PostgreSQL container
-- starts for the first time. It creates all your tables.

-- Families
CREATE TABLE IF NOT EXISTS families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Parents
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'parent',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Children
CREATE TABLE IF NOT EXISTS children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 3 AND age <= 18),
    avatar_url TEXT,
    pin VARCHAR(6) NOT NULL,
    current_level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    current_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chores / Jobs
CREATE TABLE IF NOT EXISTS chores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'other',
    difficulty VARCHAR(20) DEFAULT 'medium',
    xp_value INTEGER NOT NULL DEFAULT 10,
    money_value DECIMAL(10,2) DEFAULT 0,
    estimated_minutes INTEGER,
    requires_photo BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT true,
    recurrence VARCHAR(20) DEFAULT 'daily',
    job_type VARCHAR(20) DEFAULT 'standard',
    min_trust_score INTEGER DEFAULT 0,
    max_bidders INTEGER DEFAULT 1,
    bidding_window_minutes INTEGER DEFAULT 30,
    bidding_ends_at TIMESTAMP,
    slots_filled INTEGER DEFAULT 0,
    min_age INTEGER DEFAULT 6,
    max_age INTEGER DEFAULT 18,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chore Assignments
CREATE TABLE IF NOT EXISTS chore_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chore_id UUID REFERENCES chores(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    completed_at TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    photo_url TEXT,
    notes TEXT,
    xp_earned INTEGER DEFAULT 0,
    money_earned DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bids
CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chore_id UUID REFERENCES chores(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    bid_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(chore_id, child_id)
);

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID UNIQUE REFERENCES children(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0,
    total_earned DECIMAL(10,2) DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Financial Transactions
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(id),
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(50),
    description VARCHAR(200),
    balance_after DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trust Scores
CREATE TABLE IF NOT EXISTS trust_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID UNIQUE REFERENCES children(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 50,
    on_time_completions INTEGER DEFAULT 0,
    evidence_quality_total REAL DEFAULT 0,
    evidence_count INTEGER DEFAULT 0,
    parent_ratings_total REAL DEFAULT 0,
    parent_ratings_count INTEGER DEFAULT 0,
    streak_bonus INTEGER DEFAULT 0,
    rejections INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Level Definitions
CREATE TABLE IF NOT EXISTS level_definitions (
    level INTEGER PRIMARY KEY,
    xp_required INTEGER NOT NULL,
    title VARCHAR(100),
    privileges JSONB DEFAULT '[]'
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    badge_category VARCHAR(50),
    earned_at TIMESTAMP DEFAULT NOW(),
    xp_reward INTEGER DEFAULT 0,
    UNIQUE(child_id, badge_id)
);

-- Streaks
CREATE TABLE IF NOT EXISTS streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    streak_type VARCHAR(50) NOT NULL,
    current_count INTEGER DEFAULT 0,
    longest_count INTEGER DEFAULT 0,
    last_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(child_id, streak_type)
);

-- Screen Time Purchases
CREATE TABLE IF NOT EXISTS screen_time_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    minutes INTEGER NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    platform VARCHAR(50),
    used_minutes INTEGER DEFAULT 0,
    remaining_minutes INTEGER,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Mood Check-ins
CREATE TABLE IF NOT EXISTS mood_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    mood VARCHAR(10) NOT NULL,
    energy INTEGER DEFAULT 5,
    context_tags JSONB,
    private_note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Academic Subjects
CREATE TABLE IF NOT EXISTS academic_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    current_grade VARCHAR(5),
    grade_numeric REAL,
    trend VARCHAR(10) DEFAULT 'stable',
    icon VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Study Sessions
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES academic_subjects(id),
    planned_minutes INTEGER,
    actual_minutes INTEGER,
    completed BOOLEAN DEFAULT false,
    xp_earned INTEGER DEFAULT 0,
    money_earned DECIMAL(10,2) DEFAULT 0,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reading Log
CREATE TABLE IF NOT EXISTS reading_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    book_title VARCHAR(200),
    minutes_read INTEGER,
    pages_read INTEGER,
    streak_day INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Exercise Log
CREATE TABLE IF NOT EXISTS exercise_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    exercise_type VARCHAR(50),
    duration_minutes INTEGER,
    steps INTEGER,
    calories INTEGER,
    personal_best BOOLEAN DEFAULT false,
    xp_earned INTEGER DEFAULT 0,
    money_earned DECIMAL(10,2) DEFAULT 0,
    screen_time_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL,
    recipient_type VARCHAR(10) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    body TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Economy Config
CREATE TABLE IF NOT EXISTS economy_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID UNIQUE REFERENCES families(id) ON DELETE CASCADE,
    coin_name VARCHAR(50) DEFAULT 'Family Coins',
    tax_rate REAL DEFAULT 10.0,
    screen_time_rate REAL DEFAULT 2.50,
    savings_interest_rate REAL DEFAULT 0.0,
    min_reward_per_hour REAL DEFAULT 1.00,
    max_daily_earnings REAL DEFAULT 50.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_children_family ON children(family_id);
CREATE INDEX IF NOT EXISTS idx_chores_family ON chores(family_id);
CREATE INDEX IF NOT EXISTS idx_assignments_child_date ON chore_assignments(child_id, assigned_date);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON chore_assignments(status);
CREATE INDEX IF NOT EXISTS idx_bids_chore ON bids(chore_id);
CREATE INDEX IF NOT EXISTS idx_bids_child ON bids(child_id);
CREATE INDEX IF NOT EXISTS idx_transactions_child ON financial_transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_achievements_child ON achievements(child_id);
CREATE INDEX IF NOT EXISTS idx_streaks_child ON streaks(child_id);
CREATE INDEX IF NOT EXISTS idx_mood_child ON mood_checkins(child_id);
CREATE INDEX IF NOT EXISTS idx_subjects_child ON academic_subjects(child_id);
CREATE INDEX IF NOT EXISTS idx_study_child ON study_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_reading_child ON reading_log(child_id);
CREATE INDEX IF NOT EXISTS idx_exercise_child ON exercise_log(child_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);

-- Seed level definitions
INSERT INTO level_definitions (level, xp_required, title, privileges) VALUES
(1, 0, 'Newcomer', '[]'),
(2, 100, 'Beginner', '["choose_chore_order"]'),
(3, 250, 'Explorer', '[]'),
(4, 400, 'Achiever', '[]'),
(5, 600, 'Champion', '["customize_avatar"]'),
(6, 850, 'Adventurer', '[]'),
(7, 1150, 'Hero', '[]'),
(8, 1500, 'Master', '[]'),
(9, 1900, 'Legend', '[]'),
(10, 2400, 'Grandmaster', '["extra_weekend_screen_30m"]'),
(15, 5000, 'Veteran', '["choose_own_schedule"]'),
(20, 10000, 'Elite', '["later_weekend_bedtime"]'),
(25, 17500, 'Titan', '["choose_family_movie"]'),
(30, 27000, 'Mythic', '["reduced_oversight"]'),
(40, 55000, 'Transcendent', '["set_own_limits"]'),
(50, 100000, 'Immortal', '["minimal_oversight"]')
ON CONFLICT (level) DO NOTHING;
