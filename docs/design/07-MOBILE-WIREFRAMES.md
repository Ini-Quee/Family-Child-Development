# Mobile Wireframes — FamilyOS

## Design System

### Colour Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| Primary | #4F46E5 (Indigo) | #818CF8 | Buttons, accents, progress |
| Secondary | #10B981 (Emerald) | #34D399 | Success, earnings, positive |
| Warning | #F59E0B (Amber) | #FBBF24 | Streaks, alerts |
| Error | #EF4444 (Red) | #F87171 | Missed tasks, negative |
| Background | #F9FAFB | #111827 | App background |
| Surface | #FFFFFF | #1F2937 | Cards, modals |
| Text Primary | #111827 | #F9FAFB | Headings, body |
| Text Secondary | #6B7280 | #9CA3AF | Labels, captions |
| Child Accent | #EC4899 (Pink) | #F472B6 | Child mode accent |
| Tween Accent | #8B5CF6 (Violet) | #A78BFA | Tween mode accent |
| Teen Accent | #06B6D4 (Cyan) | #22D3EE | Teen mode accent |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| H1 | Inter | 28px | 700 |
| H2 | Inter | 22px | 700 |
| H3 | Inter | 18px | 600 |
| Body | Inter | 16px | 400 |
| Caption | Inter | 13px | 400 |
| Button | Inter | 16px | 600 |
| XP/Level | Space Grotesk | 32px | 700 |

### Spacing

Base unit: 4px. Common spacings: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

### Border Radius

| Element | Radius |
|---------|--------|
| Buttons | 12px |
| Cards | 16px |
| Inputs | 10px |
| Avatars | 50% (circle) |
| Badges | 8px |

---

## Screen 1: Child Home (Ages 6-10)

```
┌─────────────────────────────────────────┐
│  ← FamilyOS            👤 Alex    ⚙️   │
├─────────────────────────────────────────┤
│                                         │
│  Good morning, Alex! ☀️                 │
│  Level 7 ████████░░ 450/500 XP          │
│                                         │
│  🔥 5-day streak!                       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  TODAY'S MISSIONS               │    │
│  │                                 │    │
│  │  ┌───┐ Make Bed         5 XP   │    │
│  │  │ ☐ │ ⏰ Before 9am           │    │
│  │  └───┘                         │    │
│  │                                 │    │
│  │  ┌───┐ Brush Teeth      5 XP   │    │
│  │  │ ☐ │ ⏰ Before 9am           │    │
│  │  └───┘                         │    │
│  │                                 │    │
│  │  ┌───┐ Clean Room      15 XP   │    │
│  │  │ ☐ │ ⏰ Before lunch         │    │
│  │  └───┘ 📸 Photo required       │    │
│  │                                 │    │
│  │  ┌───┐ Homework: Math  20 XP   │    │
│  │  │ ☐ │ ⏰ 4:00 PM              │    │
│  │  └───┘                         │    │
│  │                                 │    │
│  │  2/4 complete  ████████░░░░ 50% │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  💰 WALLET                      │    │
│  │  Balance: $12.50                │    │
│  │  Saving for: Headphones 🎧      │    │
│  │  $32.50 / $45.00  ████████░░░  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📱 SCREEN TIME                 │    │
│  │  Earned today: 45 min           │    │
│  │  Used: 20 min  Remaining: 25    │    │
│  │  ████████░░░░░░░░░░░░           │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  🏠     📋      💰      🏆      👤     │
│  Home  Tasks   Wallet  Badges  Profile  │
└─────────────────────────────────────────┘
```

---

## Screen 2: Child Home (Ages 11-14)

```
┌─────────────────────────────────────────┐
│  ← FamilyOS            👤 Sam     ⚙️   │
├─────────────────────────────────────────┤
│                                         │
│  Hey Sam. 3 things on your plate today. │
│                                         │
│  Level 14 ████████░░ 4,200/5,000 XP     │
│  🔥 12-day streak  │  💰 $28.40 earned  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  TODAY                  FILTER ▼ │    │
│  ├─────────────────────────────────┤    │
│  │                                 │    │
│  │  ✅ Dishes              +15 XP  │    │
│  │     Completed 9:32 AM           │    │
│  │     ✓ Approved by Mom           │    │
│  │                                 │    │
│  │  ⬜ Homework: English    +25 XP  │    │
│  │     Due 5:00 PM                 │    │
│  │     [Start Timer] [AI Help]     │    │
│  │                                 │    │
│  │  ⬜ Laundry             +15 XP  │    │
│  │     Fold & put away             │    │
│  │     [Mark Done] [📸 Photo]      │    │
│  │                                 │    │
│  │  ⬜ Piano Practice      +20 XP  │    │
│  │     30 minutes                  │    │
│  │     [Start Timer]               │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌──────────────┐ ┌──────────────┐      │
│  │ 📱 Screen    │ │ 📊 This Week │      │
│  │ Time         │ │              │      │
│  │ Earned: 1h   │ │ Chores: 85%  │      │
│  │ Used: 35m    │ │ Study: 90%   │      │
│  │ Left: 25m    │ │ Exercise: 60%│      │
│  │ [Earn More]  │ │ [Details]    │      │
│  └──────────────┘ └──────────────┘      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🏆 FAMILY CHALLENGE            │    │
│  │  "Weekend Chore Sprint"         │    │
│  │  You: 150 pts  │  Emma: 120 pts│    │
│  │  ⏰ Ends Sunday 8 PM            │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  🏠     📋      💰      📅      👤     │
│  Home  Tasks   Money  Calendar  Profile  │
└─────────────────────────────────────────┘
```

---

## Screen 3: Child Home (Ages 15-18)

```
┌─────────────────────────────────────────┐
│  FamilyOS                    👤 Jordan  │
├─────────────────────────────────────────┤
│                                         │
│  Good evening, Jordan.                  │
│  Level 28 · $142 earned this month      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  TODAY'S TASKS          3/5 ✓   │    │
│  ├─────────────────────────────────┤    │
│  │                                 │    │
│  │  ✅ Gym                 +30 XP  │    │
│  │     45 min · Logged 7:15 AM     │    │
│  │                                 │    │
│  │  ✅ Dishes              +15 XP  │    │
│  │     Completed · Approved        │    │
│  │                                 │    │
│  │  ✅ AP History Reading  +25 XP  │    │
│  │     Ch. 12 complete             │    │
│  │                                 │    │
│  │  ⬜ SAT Practice        +30 XP  │    │
│  │     Math section · 45 min       │    │
│  │     [Focus Mode]                │    │
│  │                                 │    │
│  │  ⬜ Cook Dinner         +20 XP  │    │
│  │     Recipe: Stir fry            │    │
│  │     [View Recipe] [Mark Done]   │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  💰 FINANCES                    │    │
│  │  Balance: $86.20                │    │
│  │  ├─ Savings: $52.00 (60%)       │    │
│  │  ├─ Spending: $24.20 (28%)      │    │
│  │  └─ Giving: $10.00 (12%)        │    │
│  │  Investment sim: +2.3% this mo  │    │
│  │  [View Details] [Lesson]        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📊 WEEKLY INSIGHT              │    │
│  │  Task completion: 92%           │    │
│  │  Screen time: ↓ 15% vs last wk │    │
│  │  Study time: ↑ 20%              │    │
│  │  "Strong week. Keep it up."     │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  🏠     📋      💰      📅      ⚙️     │
│  Home  Tasks   Money  Calendar Settings │
└─────────────────────────────────────────┘
```

---

## Screen 4: Parent Dashboard

```
┌─────────────────────────────────────────┐
│  FamilyOS                   Hi, Sarah 👋│
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  FAMILY OVERVIEW       TODAY    │    │
│  ├─────────────────────────────────┤    │
│  │                                 │    │
│  │  👧 Emma (10)                   │    │
│  │  Tasks: 5/6 ✅  Screen: 45m/2h  │    │
│  │  Level 12 · 🔥 8-day streak     │    │
│  │                                 │    │
│  │  👦 Jake (13)                   │    │
│  │  Tasks: 2/5 ⚠️  Screen: 1h45/2h │    │
│  │  Level 8 · 🔥 3-day streak      │    │
│  │                                 │    │
│  │  👧 Alex (16)                   │    │
│  │  Tasks: 4/5 ✅  Screen: 30m/1h  │    │
│  │  Level 28 · 🔥 22-day streak    │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ⚠️ NEEDS YOUR ATTENTION        │    │
│  │                                 │    │
│  │  📸 Emma cleaned room → Approve │    │
│  │     [View Photo] [✓] [✗]        │    │
│  │                                 │    │
│  │  ⏰ Jake hasn't started homework │    │
│  │     It's 4:30 PM                │    │
│  │     [Send Nudge] [View Tasks]   │    │
│  │                                 │    │
│  │  🎉 Alex is 50 XP from Level 29 │    │
│  │     [Send Congrats]             │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🤖 AI INSIGHTS                 │    │
│  │  "Jake's task completion drops  │    │
│  │  on Wednesdays. He has soccer   │    │
│  │  practice that day. Consider    │    │
│  │  reducing Wednesday chores."    │    │
│  │  [Apply Suggestion] [Dismiss]   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  QUICK ACTIONS                  │    │
│  │  [+ Add Chore] [+ Add Event]    │    │
│  │  [📊 Weekly Report] [💬 Family]  │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  🏠     👨‍👩‍👧‍👦    📋      📅      ⚙️     │
│  Home  Family  Tasks  Calendar Settings │
└─────────────────────────────────────────┘
```

---

## Screen 5: Chore Completion (Child)

```
┌─────────────────────────────────────────┐
│  ← Back                    Clean Room   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │         🛏️ CLEAN ROOM           │    │
│  │                                 │    │
│  │  Difficulty: ⭐⭐ (Medium)       │    │
│  │  Reward: 15 XP + $1.50          │    │
│  │  Time: ~20 minutes              │    │
│  │                                 │    │
│  │  ┌───────────────────────────┐  │    │
│  │  │                           │  │    │
│  │  │    [CHECKLIST]            │  │    │
│  │  │                           │  │    │
│  │  │  ☐ Pick up clothes        │  │    │
│  │  │  ☐ Make bed               │  │    │
│  │  │  ☐ Put toys away          │  │    │
│  │  │  ☐ Vacuum/sweep           │  │    │
│  │  │  ☐ Desk tidy              │  │    │
│  │  │                           │  │    │
│  │  └───────────────────────────┘  │    │
│  │                                 │    │
│  │  ┌───────────────────────────┐  │    │
│  │  │  📸 Take a photo when     │  │    │
│  │  │     you're done!          │  │    │
│  │  │                           │  │    │
│  │  │    [ 📷 Take Photo ]      │  │    │
│  │  └───────────────────────────┘  │    │
│  │                                 │    │
│  │  ┌───────────────────────────┐  │    │
│  │  │    ✅ MARK COMPLETE       │  │    │
│  │  └───────────────────────────┘  │    │
│  │                                 │    │
│  │  💡 Tip: Start with clothes,    │    │
│  │  then bed, then everything else │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Screen 6: Study Timer (Child/Tween)

```
┌─────────────────────────────────────────┐
│  ← Back                   Study Session │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │         📚 FOCUS MODE           │    │
│  │                                 │    │
│  │           ┌─────┐               │    │
│  │           │     │               │    │
│  │           │25:00│               │    │
│  │           │     │               │    │
│  │           └─────┘               │    │
│  │                                 │    │
│  │       Math · Chapter 5          │    │
│  │                                 │    │
│  │       [ ▶️ START ]              │    │
│  │                                 │    │
│  │  ─────────────────────────────  │    │
│  │                                 │    │
│  │  📱 Distracting apps blocked    │    │
│  │  📖 Educational apps allowed    │    │
│  │                                 │    │
│  │  Tasks in this session:         │    │
│  │  ☐ Problems 1-10                │    │
│  │  ☐ Problems 11-20               │    │
│  │  ☐ Review answers               │    │
│  │                                 │    │
│  │  ─────────────────────────────  │    │
│  │                                 │    │
│  │  🤖 Need help? Ask the AI tutor │    │
│  │     [💬 Ask a Question]         │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Screen 7: Wallet / Financial (Child)

```
┌─────────────────────────────────────────┐
│  ← Back                       💰 Wallet │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │         TOTAL BALANCE           │    │
│  │           $86.20                │    │
│  │                                 │    │
│  │  ┌──────┐ ┌──────┐ ┌──────┐    │    │
│  │  │Spend │ │Save  │ │Give  │    │    │
│  │  │$24.20│ │$52.00│ │$10.00│    │    │
│  │  │ 28%  │ │ 60%  │ │ 12%  │    │    │
│  │  └──────┘ └──────┘ └──────┘    │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🎯 SAVINGS GOAL                │    │
│  │  New Headphones 🎧              │    │
│  │  $52.00 / $75.00                │    │
│  │  ████████████████░░░░ 69%       │    │
│  │  ~12 days to go                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📖 THIS WEEK'S LESSON          │    │
│  │  "What is Compound Interest?"   │    │
│  │  3 min read · 15 XP reward      │    │
│  │  [Start Lesson]                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📜 RECENT TRANSACTIONS         │    │
│  │                                 │    │
│  │  +$3.00  Dishes (today)         │    │
│  │  -$10.00 V-Bucks (yesterday)    │    │
│  │  +$4.50  Laundry (yesterday)    │    │
│  │  +$0.12  Interest (this week)   │    │
│  │                                 │    │
│  │  [View All]                     │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Screen 8: Achievements / Badges (Child)

```
┌─────────────────────────────────────────┐
│  ← Back                     🏆 Badges  │
├─────────────────────────────────────────┤
│                                         │
│  Level 14 · 4,200 / 5,000 XP           │
│  ████████████████░░░░░░░░ 84%           │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🔓 RECENTLY EARNED             │    │
│  │                                 │    │
│  │  🏅 7-Day Streak               │    │
│  │     "You completed tasks 7      │    │
│  │      days in a row!"           │    │
│  │     Earned: 2 days ago          │    │
│  │                                 │    │
│  │  🏅 Homework Hero              │    │
│  │     "5 study sessions this      │    │
│  │      week!"                    │    │
│  │     Earned: 5 days ago          │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🎯 IN PROGRESS                 │    │
│  │                                 │    │
│  │  🔒 30-Day Streak              │    │
│  │     12/30 days  ████████░░░░░░  │    │
│  │                                 │    │
│  │  🔒 Chore Master               │    │
│  │     47/100 chores completed     │    │
│  │                                 │    │
│  │  🔒 Savings Star               │    │
│  │     $52/$100 saved              │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📊 STATS                       │    │
│  │  Total XP: 4,200               │    │
│  │  Tasks completed: 147           │    │
│  │  Money earned: $86.20           │    │
│  │  Longest streak: 12 days        │    │
│  │  Level reached: 14              │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Screen 9: Parent – Add Chore

```
┌─────────────────────────────────────────┐
│  ← Back                     Add Chore  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  CHORE TITLE                    │    │
│  │  ┌───────────────────────────┐  │    │
│  │  │ e.g. Clean bathroom       │  │    │
│  │  └───────────────────────────┘  │    │
│  │                                 │    │
│  │  DESCRIPTION (optional)         │    │
│  │  ┌───────────────────────────┐  │    │
│  │  │ Wipe counter, mirror,     │  │    │
│  │  │ sweep floor               │  │    │
│  │  └───────────────────────────┘  │    │
│  │                                 │    │
│  │  ASSIGN TO                      │    │
│  │  [👧 Emma] [👦 Jake] [👧 Alex] │    │
│  │                                 │    │
│  │  CATEGORY                       │    │
│  │  [Cleaning ▼]                   │    │
│  │                                 │    │
│  │  DIFFICULTY                     │    │
│  │  (●) Easy  (○) Medium  (○) Hard │    │
│  │                                 │    │
│  │  REWARDS                        │    │
│  │  XP: [ 15 ]  Money: [ $1.50 ]  │    │
│  │                                 │    │
│  │  SCHEDULE                       │    │
│  │  Frequency: [Daily ▼]          │    │
│  │  Due time:  [5:00 PM ▼]        │    │
│  │                                 │    │
│  │  OPTIONS                        │    │
│  │  [✓] Requires photo proof      │    │
│  │  [✓] Requires parent approval  │    │
│  │  [ ] Available as bonus chore  │    │
│  │                                 │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │    CREATE CHORE         │    │    │
│  │  └─────────────────────────┘    │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Screen 10: Parent – AI Chat

```
┌─────────────────────────────────────────┐
│  ← Back                     🤖 AI Chat │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  💬 ASK ANYTHING ABOUT YOUR     │    │
│  │     FAMILY'S PATTERNS           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🤖 "Hi Sarah! I've been        │    │
│  │  analyzing your family's data.   │    │
│  │  What would you like to know?"   │    │
│  │                          2:30 PM │    │
│  └─────────────────────────────────┘    │
│                                         │
│     ┌─────────────────────────────┐     │
│     │ How is Jake doing this week?│     │
│     │                     2:31 PM │     │
│     └─────────────────────────────┘     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🤖 Jake completed 72% of tasks │    │
│  │  this week, down from 85% last  │    │
│  │  week. The drop correlates with  │    │
│  │  increased TikTok use (+40 min).│    │
│  │                                 │    │
│  │  His study time also dropped    │    │
│  │  30 min on Wednesdays — he has  │    │
│  │  soccer those days and seems    │    │
│  │  drained after.                 │    │
│  │                                 │    │
│  │  Suggestion: Reduce Wednesday   │    │
│  │  chores to 2 and shift study to │    │
│  │  Thursday when he has more      │    │
│  │  energy.                        │    │
│  │                                 │    │
│  │  [Apply Suggestion] [Dismiss]   │    │
│  │                          2:31 PM│    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  💡 SUGGESTED QUESTIONS         │    │
│  │  "What motivates Emma?"         │    │
│  │  "Compare this week to last"    │    │
│  │  "Who needs attention?"         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Type a message...        [📤]  │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Navigation Structure

### Child Mode (6-10)
```
Tab Bar: Home | Tasks | Wallet | Badges | Profile
```

### Child Mode (11-14)
```
Tab Bar: Home | Tasks | Money | Calendar | Profile
```

### Child Mode (15-18)
```
Tab Bar: Home | Tasks | Money | Calendar | Settings
```

### Parent Mode
```
Tab Bar: Home | Family | Tasks | Calendar | Settings
```

---

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, bottom tab bar |
| Tablet | 640-1024px | Two column, side navigation |
| Desktop | > 1024px | Full dashboard layout |

---

*Document version: 1.0*
*Created: June 2026*
