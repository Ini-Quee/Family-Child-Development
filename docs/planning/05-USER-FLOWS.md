# User Flows — FamilyOS

## Overview
This document defines the critical user flows for both parent and child modes. Each flow includes entry points, steps, decision points, error states, and success criteria.

---

## Flow 1: Family Onboarding

### Trigger: Parent downloads app for the first time

```
START
  │
  ├─→ Welcome Screen
  │     "Welcome to FamilyOS — The Family Operating System"
  │     [Get Started]
  │
  ├─→ Parent Registration
  │     ├─ Email + Password
  │     ├─ OR Sign in with Google/Apple
  │     └─ Name, Phone (for notifications)
  │
  ├─→ Family Setup
  │     ├─ "How many children do you have?"
  │     ├─ For each child:
  │     │   ├─ Name
  │     │   ├─ Age (auto-calculates age group)
  │     │   ├─ Avatar selection
  │     │   └─ Device type (iPhone/Android/None)
  │     └─ Partner/co-parent invite (optional)
  │
  ├─→ Quick Tour (skippable)
  │     ├─ 4 screens: Chores, Screen Time, Money, Schedule
  │     └─ "You can customize everything later"
  │
  ├─→ Starter Setup Wizard
  │     ├─ "Would you like to set up chores now?"
  │     │   ├─ Yes → Chore template selection by age
  │     │   └─ No → Skip (AI will suggest later)
  │     ├─ "Set daily screen time limits?"
  │     │   ├─ Yes → Slider per child
  │     │   └─ No → Defaults applied
  │     └─ "Set up allowance/earning system?"
  │         ├─ Yes → Configure base + multipliers
  │         └─ No → Virtual currency only
  │
  ├─→ Child Invite
  │     ├─ QR Code (child scans to join family)
  │     ├─ OR Share Link
  │     └─ OR Parent creates child account directly (under 13)
  │
  └─→ Dashboard
        Parent sees family overview
        Child sees their task list

END
```

---

## Flow 2: Child Daily Routine

### Trigger: Child wakes up / starts their day

```
START
  │
  ├─→ Morning Notification (at scheduled wake time)
  │     "Good morning, Alex! You have 5 tasks today. Let's crush it!"
  │
  ├─→ Open App → Today's View
  │     ├─ Morning Tasks (pre-loaded)
  │     │   ├─ Make bed (5 XP)
  │     │   ├─ Brush teeth (5 XP)
  │     │   ├─ Get dressed (5 XP)
  │     │   └─ Eat breakfast (5 XP)
  │     │
  │     ├─ Afternoon Tasks
  │     │   ├─ Homework: Math (20 XP)
  │     │   ├─ Clean room (15 XP)
  │     │   └─ Practice piano (15 XP)
  │     │
  │     └─ Evening Tasks
  │         ├─ Set out clothes for tomorrow (5 XP)
  │         └─ Read for 20 minutes (10 XP)
  │
  ├─→ Complete Task
  │     ├─ Tap task → [Mark Complete]
  │     ├─ Optional: Take photo proof
  │     ├─ XP animation plays
  │     ├─ Progress bar updates
  │     └─ Streak counter updates (if applicable)
  │
  ├─→ Parent Approval (if required)
  │     ├─ Notification to parent: "Alex completed [task]. Approve?"
  │     ├─ Parent taps [Approve] or [Needs Redo]
  │     └─ If approved: XP + money credited
  │         If redo: "Alex, parent says this needs another try. No worries!"
  │
  ├─→ Earn Rewards
  │     ├─ Screen time unlocked based on task completion
  │     ├─ Money added to virtual wallet
  │     └─ Level progress bar fills
  │
  ├─→ Level Up (when threshold reached)
  │     ├─ Celebration animation
  │     ├─ "You reached Level 12!"
  │     ├─ "New privilege unlocked: Choose your own weekend schedule"
  │     └─ Share to family chat (optional)
  │
  └─→ End of Day Summary
        "Today you earned 85 XP, completed 7/8 tasks, and maintained your 5-day streak!"
        [Share Achievement]

END
```

---

## Flow 3: Screen Time Earning & Enforcement

### Trigger: Child wants to use device / screen time limit reached

```
START
  │
  ├─→ Child opens device
  │     ├─ FamilyOS checks remaining screen time
  │     │
  │     ├─ IF screen time available:
  │     │   ├─ Countdown timer visible in notification bar
  │     │   ├─ 15-min warning: "15 minutes remaining"
  │     │   ├─ 5-min warning: "5 minutes! Save your progress"
  │     │   └─ Time up: Device locks (non-emergency apps blocked)
  │     │
  │     ├─ IF screen time exhausted:
  │     │   ├─ Lock screen appears
  │     │   │   "You've used your screen time for today."
  │     │   │   "Complete tasks to earn more!"
  │     │   │   [View Tasks] [Emergency Call]
  │     │   │
  │     │   └─ IF tasks available:
  │     │       ├─ Shows which tasks unlock screen time
  │     │       ├─ "Complete homework: +30 min"
  │     │       └─ "Do dishes: +15 min"
  │     │
  │     └─ IF study/homework time:
  │         ├─ Study mode auto-activates
  │         ├─ Social media + games blocked
  │         ├─ Educational apps accessible
  │         └─ Timer counts down study session
  │
  ├─→ Parent Override (emergency)
  │     ├─ Parent can remotely unlock device
  │     ├─ Reason logged: "Family emergency"
  │     └─ Screen time not deducted
  │
  └─→ Weekly Report
        "This week: 14 hours screen time earned through 28 completed tasks"
        "Efficiency: 87% task completion rate"

END
```

---

## Flow 4: Financial Education Journey

### Trigger: Child earns money from chores

```
START
  │
  ├─→ Chore Completed + Approved
  │     ├─ "You earned $2.00!"
  │     ├─ Breakdown shown:
  │     │   ├─ Gross: $2.00
  │     │   ├─ Family Tax (10%): -$0.20
  │     │   └─ Net: $1.80
  │     └─ Animation: Coins dropping into wallet
  │
  ├─→ Money Distribution
  │     ├─ Automatic allocation:
  │     │   ├─ Savings (20%): $0.36 → Savings Goal
  │     │   ├─ Giving (10%): $0.18 → Charity Fund
  │     │   ├─ Needs (20%): $0.36 → Needs Fund
  │     │   └─ Wants (50%): $0.90 → Spending Money
  │     │
  │     └─ Visual: Pie chart showing allocation
  │
  ├─→ Savings Goal Progress
  │     ├─ "You're saving for: New Headphones ($45)"
  │     ├─ Current savings: $32.50
  │     ├─ Progress bar: 72%
  │     └─ "At this rate, you'll reach your goal in 6 days!"
  │
  ├─→ Spending Decision
  │     ├─ Child wants to buy something
  │     ├─ "V-Bucks: $10.00"
  │     ├─ Current spending money: $15.20
  │     ├─ After purchase: $5.20
  │     ├─ [Buy] [Save for Goal Instead]
  │     └─ If buying: Transaction logged, spending chart updated
  │
  ├─→ Financial Literacy Lesson (weekly)
  │     ├─ "This week's lesson: What is compound interest?"
  │     ├─ Interactive 3-minute lesson
  │     ├─ Quiz: "If you save $10/week at 5% interest..."
  │     └─ Reward: 15 XP for completing lesson
  │
  └─→ Monthly Financial Report
        "This month you earned: $24.00"
        "You saved: $4.80 (20%)"
        "You spent: $12.00 (50%) — mostly on: Games"
        "You gave: $2.40 (10%) — to: Local animal shelter"
        "Your savings grew by: $0.12 (compound interest!)"

END
```

---

## Flow 5: Parent Daily Check-In

### Trigger: Parent opens app

```
START
  │
  ├─→ Dashboard Overview
  │     ├─ Today's Date + Day of Week
  │     ├─ Family Status Bar:
  │     │   ├─ Alex: 4/6 tasks done ✅
  │     │   ├─ Emma: 6/6 tasks done ✅✅
  │     │   └─ Jake: 2/5 tasks done ⚠️
  │     │
  │     ├─ Quick Stats:
  │     │   ├─ Family Chore Completion: 80%
  │     │   ├─ Screen Time Used Today: 2h 15m / 3h limit
  │     │   └─ Family Streak: 12 days
  │     │
  │     └─ AI Insight:
  │         "Jake hasn't started homework yet. It's 4pm. Want me to send a nudge?"
  │
  ├─→ Pending Approvals
  │     ├─ "Emma cleaned her room — awaiting approval"
  │     │   [View Photo] [Approve] [Needs Redo]
  │     ├─ "Alex did dishes — awaiting approval"
  │     │   [View Photo] [Approve] [Needs Redo]
  │     └─ Bulk approve: [Approve All]
  │
  ├─→ Alerts
  │     ├─ "Jake's screen time is 30% higher this week"
  │     │   [View Details] [Adjust Limits]
  │     ├─ "Alex missed 2 days of piano practice"
  │     │   [Send Encouragement] [Adjust Schedule]
  │     └─ "Emma is 5 XP away from Level 20!"
  │         [Send Celebration]
  │
  ├─→ Quick Actions
  │     ├─ [Assign New Chore]
  │     ├─ [Send Family Message]
  │     ├─ [Adjust Screen Time]
  │     ├─ [View Weekly Report]
  │     └─ [AI Chat] — "Ask me anything about your family's patterns"
  │
  └─→ AI Chat Examples
        Parent: "How is Jake doing this week?"
        AI: "Jake completed 72% of tasks this week, down from 85% last week.
             The drop correlates with increased screen time on TikTok.
             His study time decreased by 40 minutes. Would you like me to
             suggest a conversation starter?"

        Parent: "What motivates Emma?"
        AI: "Emma responds best to achievement-based rewards. Her completion
             rate is 94% when there's a level-up within reach. She's 5 XP
             from Level 20. Consider assigning a bonus chore to get her there today."

END
```

---

## Flow 6: Homework Study Session

### Trigger: Child starts homework

```
START
  │
  ├─→ Child taps [Start Homework]
  │     ├─ "What subject?" → Math / Science / English / Other
  │     ├─ "How long do you think it'll take?" → 30m / 1h / 2h
  │     └─ [Start Timer]
  │
  ├─→ Study Mode Activates
  │     ├─ Focus mode: Social media + games blocked
  │     ├─ Timer visible on screen
  │     ├─ Pomodoro: 25 min work → 5 min break → repeat
  │     └─ Educational apps remain accessible
  │
  ├─→ During Study
  │     ├─ Child can mark tasks complete within session
  │     ├─ AI available for help: "Stuck on a problem? Ask me!"
  │     ├─ Progress bar fills as time passes
  │     └─ Motivational messages at intervals
  │
  ├─→ Break Time (auto)
  │     ├─ "Great focus! Take a 5-minute break."
  │     ├─ Break timer starts
  │     ├─ Suggested: stretch, get water, look away from screen
  │     └─ "Break over! Ready for round 2?"
  │
  ├─→ Session Complete
  │     ├─ "You studied for 47 minutes!"
  │     ├─ "XP earned: 30"
  │     ├─ "Homework streak: 4 days"
  │     └─ Screen time unlocked: +30 minutes
  │
  └─→ Parent Notification
        "Alex completed a 47-minute study session for Math.
         Task completion: 3/4 assignments done."

END
```

---

## Flow 7: Sibling Competition / Family Challenge

### Trigger: Parent creates family challenge OR system auto-generates one

```
START
  │
  ├─→ Challenge Creation
  │     ├─ Parent: "Create Family Challenge"
  │     ├─ Type: Chore Sprint / Step Challenge / Study Marathon / Savings Race
  │     ├─ Duration: 1 day / 3 days / 1 week
  │     ├─ Participants: All kids / Selected kids
  │     ├─ Reward: Bonus XP / Money / Privilege / Trophy
  │     └─ [Launch Challenge]
  │
  ├─→ Challenge Active
  │     ├─ All participants see challenge banner
  │     ├─ Real-time leaderboard updates
  │     ├─ "Alex is in the lead with 150 points!"
  │     ├─ Push notifications for lead changes
  │     └─ "Emma just passed you! 2 hours remaining."
  │
  ├─→ Challenge Complete
  │     ├─ Winner announcement with animation
  │     ├─ "🏆 Alex won the Weekly Chore Sprint!"
  │     ├─ Reward distributed
  │     ├─ Runner-up recognition: "Emma was only 10 points behind!"
  │     └─ Stats: "Together, our family completed 47 chores this week!"
  │
  └─→ Post-Challenge
        ├─ "Want to run it back next week?"
        ├─ Historical leaderboard (all-time wins)
        └─ "Family challenge record: 12 completed, 3 more than last month!"

END
```

---

## Flow 8: Partner/Co-Parent Integration

### Trigger: Second parent joins the family

```
START
  │
  ├─→ Invite Sent
  │     ├─ Parent 1 sends invite link to Parent 2
  │     ├─ Parent 2 downloads app / signs up
  │     └─ Joins existing family circle
  │
  ├─→ Permission Setup
  │     ├─ Both parents have equal access by default
  │     ├─ Can configure:
  │     │   ├─ Who can approve chores (both or one)
  │     │   ├─ Who can adjust screen time
  │     │   ├─ Who can modify allowance
  │     │   └─ Who receives notifications
  │     └─ Single parent can be primary with partner as viewer
  │
  ├─→ Shared Dashboard
  │     ├─ Both see same family data
  │     ├─ Approvals sync in real-time
  │     ├─ "Mom approved Alex's chore" visible to Dad
  │     └─ Conflict prevention: "Dad already assigned this chore"
  │
  └─→ Co-Parenting Features
        ├─ Shared notes on child behavior
        ├─ "Alex had a tough day — go easy on screen time limits"
        ├─ Unified approach to discipline
        └─ Weekly sync summary for both parents

END
```

---

*Document version: 1.0*
*Created: June 2026*
