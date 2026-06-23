# Database Design — FamilyOS

## Overview
PostgreSQL-based relational database with Redis for caching and real-time features. Designed for scalability, data integrity, and child privacy (COPPA compliant).

---

## Entity Relationship Diagram (Textual)

```
FAMILY ──┬── PARENT (1+)
         │
         └── CHILD (1+)
              │
              ├── CHORE_ASSIGNMENTS ──── CHORES
              │         │
              │         └── APPROVALS
              │
              ├── SCREEN_TIME_SESSIONS
              │
              ├── FINANCIAL_TRANSACTIONS ──── WALLET
              │         │
              │         └── SAVINGS_GOALS
              │
              ├── STUDY_SESSIONS
              │
              ├── FITNESS_LOGS
              │
              ├── ACHIEVEMENTS ──── BADGE_DEFINITIONS
              │
              └── LEVEL_PROGRESS
```

---

## Table Definitions

### 1. families

```sql
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    settings JSONB DEFAULT '{}',
    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMP
);

CREATE INDEX idx_families_invite_code ON families(invite_code);
```

### 2. users (parents)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'parent' CHECK (role IN ('parent', 'guardian')),
    avatar_url TEXT,
    phone VARCHAR(20),
    push_token TEXT,
    notification_preferences JSONB DEFAULT '{
        'chore_approvals': true,
        'missed_tasks': true,
        'streaks': true,
        'level_ups': true,
        'weekly_summary': true
    }',
    is_primary BOOLEAN DEFAULT false,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_family_id ON users(family_id);
CREATE INDEX idx_users_email ON users(email);
```

### 3. children

```sql
CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 3 AND age <= 18),
    age_group VARCHAR(10) GENERATED ALWAYS AS (
        CASE
            WHEN age <= 10 THEN 'child'
            WHEN age <= 14 THEN 'tween'
            ELSE 'teen'
        END
    ) STORED,
    avatar_url TEXT,
    pin VARCHAR(6), -- For quick login on shared devices
    device_tokens JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{
        'privacy_level': 'standard',
        'can_see_leaderboard': true,
        'can_trade_chores': true
    }',
    current_level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    current_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_children_family_id ON children(family_id);
CREATE INDEX idx_children_age_group ON children(age_group);
```

### 4. chores (definitions)

```sql
CREATE TABLE chores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'cleaning', 'kitchen', 'laundry', 'outdoor', 'pet_care',
        'personal_hygiene', 'homework', 'exercise', 'other'
    )),
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    xp_value INTEGER NOT NULL DEFAULT 10,
    money_value DECIMAL(10,2) DEFAULT 0,
    estimated_minutes INTEGER,
    requires_photo BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT true,
    recurrence VARCHAR(20) DEFAULT 'daily' CHECK (recurrence IN (
        'once', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly'
    )),
    recurrence_days INTEGER[], -- [1,3,5] = Mon, Wed, Fri
    min_age INTEGER DEFAULT 6,
    max_age INTEGER DEFAULT 18,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chores_family_id ON chores(family_id);
CREATE INDEX idx_chores_category ON chores(category);
```

### 5. chore_assignments

```sql
CREATE TABLE chore_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chore_id UUID REFERENCES chores(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    due_time TIME,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'approved', 'rejected', 'missed'
    )),
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

CREATE INDEX idx_assignments_child_date ON chore_assignments(child_id, assigned_date);
CREATE INDEX idx_assignments_status ON chore_assignments(status);
CREATE INDEX idx_assignments_date ON chore_assignments(assigned_date);
```

### 6. screen_time_sessions

```sql
CREATE TABLE screen_time_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    app_name VARCHAR(100),
    app_category VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    was_earned BOOLEAN DEFAULT true,
    earned_from VARCHAR(100), -- 'base', 'chore', 'homework', 'exercise'
    device_type VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_screen_time_child_date ON screen_time_sessions(child_id, start_time);
```

### 7. screen_time_rules

```sql
CREATE TABLE screen_time_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    day_type VARCHAR(10) CHECK (day_type IN ('weekday', 'weekend')),
    base_minutes INTEGER NOT NULL DEFAULT 60,
    max_minutes INTEGER NOT NULL DEFAULT 180,
    per_chore_bonus INTEGER DEFAULT 15,
    per_study_bonus INTEGER DEFAULT 30,
    per_exercise_bonus INTEGER DEFAULT 30,
    bedtime_lock TIME DEFAULT '21:00',
    morning_unlock TIME DEFAULT '07:00',
    blocked_apps JSONB DEFAULT '[]',
    allowed_during_study JSONB DEFAULT '["calculator", "dictionary", "khan_academy"]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(child_id, day_type)
);
```

### 8. wallets

```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0,
    savings_balance DECIMAL(10,2) DEFAULT 0,
    giving_balance DECIMAL(10,2) DEFAULT 0,
    total_earned DECIMAL(10,2) DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    total_saved DECIMAL(10,2) DEFAULT 0,
    total_given DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 10.00,
    savings_rate DECIMAL(5,2) DEFAULT 20.00,
    giving_rate DECIMAL(5,2) DEFAULT 10.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 9. financial_transactions

```sql
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(id),
    type VARCHAR(20) NOT NULL CHECK (type IN (
        'earning', 'spending', 'saving', 'withdrawal', 'tax', 'giving', 'interest'
    )),
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(50),
    description VARCHAR(200),
    reference_id UUID, -- Links to chore_assignment or savings_goal
    reference_type VARCHAR(50), -- 'chore', 'purchase', 'goal', etc.
    balance_after DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_child ON financial_transactions(child_id);
CREATE INDEX idx_transactions_type ON financial_transactions(type);
CREATE INDEX idx_transactions_date ON financial_transactions(created_at);
```

### 10. savings_goals

```sql
CREATE TABLE savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0,
    image_url TEXT,
    deadline DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'abandoned')),
    achieved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_savings_goals_child ON savings_goals(child_id);
```

### 11. study_sessions

```sql
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    subject VARCHAR(100),
    planned_minutes INTEGER,
    actual_minutes INTEGER,
    tasks_completed INTEGER DEFAULT 0,
    tasks_total INTEGER DEFAULT 0,
    focus_score INTEGER, -- 0-100 based on app switching
    xp_earned INTEGER DEFAULT 0,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_study_child ON study_sessions(child_id);
```

### 12. fitness_logs

```sql
CREATE TABLE fitness_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    steps INTEGER DEFAULT 0,
    active_minutes INTEGER DEFAULT 0,
    exercise_type VARCHAR(50),
    calories_burned INTEGER,
    goal_met BOOLEAN DEFAULT false,
    xp_earned INTEGER DEFAULT 0,
    source VARCHAR(20) DEFAULT 'manual', -- 'manual', 'apple_health', 'google_fit'
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(child_id, date)
);

CREATE INDEX idx_fitness_child_date ON fitness_logs(child_id, date);
```

### 13. achievements

```sql
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    badge_category VARCHAR(50),
    badge_icon VARCHAR(50),
    earned_at TIMESTAMP DEFAULT NOW(),
    xp_reward INTEGER DEFAULT 0,
    UNIQUE(child_id, badge_id)
);

CREATE INDEX idx_achievements_child ON achievements(child_id);
```

### 14. level_definitions

```sql
CREATE TABLE level_definitions (
    level INTEGER PRIMARY KEY,
    xp_required INTEGER NOT NULL,
    title VARCHAR(100),
    privileges JSONB DEFAULT '[]',
    description TEXT
);

-- Pre-populated with levels 1-50
INSERT INTO level_definitions (level, xp_required, title, privileges) VALUES
(1, 0, 'Newcomer', '[]'),
(2, 100, 'Beginner', '["choose_chore_order"]'),
(5, 500, 'Explorer', '["customize_avatar"]'),
(10, 2000, 'Achiever', '["extra_weekend_screen_30m"]'),
(15, 5000, 'Champion', '["choose_own_schedule"]'),
(20, 10000, 'Expert', '["later_weekend_bedtime"]'),
(25, 17500, 'Master', '["choose_family_movie"]'),
(30, 27000, 'Leader', '["reduced_oversight"]'),
(35, 40000, 'Veteran', '["real_money_earning"]'),
(40, 55000, 'Elite', '["set_own_limits"]'),
(45, 75000, 'Mentor', '["help_siblings"]'),
(50, 100000, 'Legend', '["minimal_oversight"]');
```

### 15. family_events (calendar)

```sql
CREATE TABLE family_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) CHECK (event_type IN (
        'school', 'sports', 'music', 'social', 'medical', 'family', 'chore', 'other'
    )),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    all_day BOOLEAN DEFAULT false,
    recurrence VARCHAR(20),
    recurrence_days INTEGER[],
    location TEXT,
    color VARCHAR(7),
    assigned_children UUID[], -- Array of child IDs
    reminder_minutes INTEGER DEFAULT 30,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_family ON family_events(family_id);
CREATE INDEX idx_events_time ON family_events(start_time);
```

### 16. ai_conversations

```sql
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Can be parent or child
    user_type VARCHAR(10) CHECK (user_type IN ('parent', 'child')),
    child_id UUID REFERENCES children(id), -- NULL if parent conversation
    message_role VARCHAR(10) CHECK (message_role IN ('user', 'assistant')),
    message_content TEXT NOT NULL,
    context_data JSONB, -- What data was available to AI
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
```

### 17. notifications

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL,
    recipient_type VARCHAR(10) CHECK (recipient_type IN ('parent', 'child')),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    body TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read);
```

### 18. streaks

```sql
CREATE TABLE streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    streak_type VARCHAR(50) NOT NULL CHECK (streak_type IN (
        'chore', 'homework', 'exercise', 'reading', 'savings', 'overall'
    )),
    current_count INTEGER DEFAULT 0,
    longest_count INTEGER DEFAULT 0,
    last_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(child_id, streak_type)
);
```

### 19. challenges

```sql
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50) CHECK (challenge_type IN (
        'chore_sprint', 'step_challenge', 'study_marathon', 'savings_race', 'custom'
    )),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reward_type VARCHAR(50),
    reward_value VARCHAR(100),
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
    winner_id UUID REFERENCES children(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    rank INTEGER,
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(challenge_id, child_id)
);
```

### 20. financial_lessons

```sql
CREATE TABLE financial_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    age_group VARCHAR(10) CHECK (age_group IN ('child', 'tween', 'teen')),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    quiz_questions JSONB,
    xp_reward INTEGER DEFAULT 15,
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE child_lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES financial_lessons(id),
    completed BOOLEAN DEFAULT false,
    score INTEGER,
    completed_at TIMESTAMP,
    UNIQUE(child_id, lesson_id)
);
```

---

## Indexes Summary

| Table | Index | Purpose |
|-------|-------|---------|
| children | family_id | Fast family member lookup |
| chore_assignments | child_id, assigned_date | Daily task view |
| chore_assignments | status | Pending approvals |
| screen_time_sessions | child_id, start_time | Daily/weekly reports |
| financial_transactions | child_id, type | Spending analysis |
| fitness_logs | child_id, date | Progress charts |
| achievements | child_id | Badge display |
| notifications | recipient_id, is_read | Unread count |
| streaks | child_id, streak_type | Streak display |

---

## Data Retention & Privacy

| Data Type | Retention | Notes |
|-----------|-----------|-------|
| Chore records | 1 year | Archived after |
| Screen time data | 90 days | Aggregated after |
| Financial data | 7 years | Legal requirement |
| Chat/AI history | 90 days | Parent can export |
| Photos | Until deleted | User-controlled |
| Fitness data | 1 year | Archived after |
| Child account data | Until deleted | COPPA right to deletion |

---

## Backup Strategy

- **Real-time:** PostgreSQL streaming replication
- **Daily:** Full encrypted backup to S3
- **Weekly:** Backup verification and restore test
- **Monthly:** Archive to cold storage

---

*Document version: 1.0*
*Created: June 2026*
