# FamilyOS

### The Child Development Operating System

> *"My 10-year-old acts like I'm asking him to climb Everest when I tell him to put his own laundry away."*
>
> *"Homework time is World War III."*
>
> *"He's getting aggressive when I take the phone away."*
>
> *"I feel like a broken record. They don't listen until I yell."*

These are real words from real parents. Not from a focus group — from Reddit threads, Facebook groups, and YouTube comments where thousands of exhausted parents share the same daily battles. The chore chart that worked for three days. The screen time war that ends in tears. The homework fight that ruins every evening.

**The problem isn't the children. The problem is the system.**

Every existing solution is fragmented. One app for chores. Another for screen time. Another for allowance. None of them talk to each other. None of them motivate children. All of them add to the parent's mental load — the parent becomes the project manager, the enforcer, the nag.

**FamilyOS is a different approach.** It doesn't ask "Did the child do the chore?" It asks "Who is this child, and how do we help them grow into a disciplined, resilient, self-aware adult?"

---

## How It Works

FamilyOS turns your household into a **Family Economy**. Children don't do chores because they're told to — they do them because they're earning, competing, and building something.

### The Marketplace

Chores aren't assigned. They're **posted as jobs**. Standard jobs (make your bed, brush your teeth) are always available with fixed rewards. Premium bounties (wash the car, organize the garage) appear with countdown timers — children bid on them. SOS tasks are urgent, time-limited opportunities that pay a premium.

A child opens the app and sees a job board. They choose what they want to do. They decide how much to bid. They take a before photo, do the work, take an after photo, and submit. The parent reviews, rates the quality, and approves. Money moves. XP accumulates. The trust score updates.

**The child feels like an earner, not a servant.**

### Trust Score

Every child has a trust score — a number from 0 to 100 that reflects their reliability. It goes up when they complete jobs on time, submit good evidence, and maintain streaks. It goes down when they miss deadlines or submit low-quality work.

Why does it matter? Because **trust score gates access to premium bounties**. A child with a trust score of 94 can bid on the $8 car wash. A child with a score of 50 can only see standard jobs. This isn't punishment — it's how the real world works. Your reputation determines your opportunities.

### Screen Time as Currency

This is the feature that ends the screen time war.

Screen time isn't taken away. It isn't earned through threats. It's **purchased from the Family Economy**. 30 minutes costs $2.50 in Family Coins. An hour costs $4.00. A gaming session costs $3.00.

The child opens the Screen Time Shop, checks their balance, and decides: "Do I want to spend $4 on an hour of TikTok, or save it toward my headphones goal?" They make the trade-off themselves. They experience the consequence of their own spending decisions.

**The parent stops being the enemy. The economy becomes the teacher.**

### AI Coach (Private)

Every child has access to Coach Lumi — an AI mentor that speaks in growth-mindset language. Not "You failed to do your chores." Instead: "You completed 4 out of 5 tasks yesterday. That's 80% — your best day this week. What made yesterday different?"

The coach asks questions. It notices patterns. It suggests, never demands. And critically — **what the child says to the coach is private**. The parent only sees derived insights and trends, never the raw conversation. Without this trust, teens will reject the system entirely.

The coach can suggest tasks: "You're 20 coins away from your goal. I see a premium chore available — want to bid?" It becomes a financial advisor, a study buddy, and a life coach — all in one.

### Parent Insights

While the child experiences a game, the parent sees a dashboard. But not a surveillance dashboard — an **insight engine**.

Instead of checking boxes, the parent reads observations:

- *"Jake's math grade dropped from B+ to C this week. His screen time increased 40% in the same period. Consider enforcing 9:30pm bedtime — his best grades were when he slept by 9pm."*
- *"Emma completes 90% more chores when rewards are posted within 10 minutes. She responds best to visual progress bars."*
- *"Alex performs best when studying before football practice. His test scores are 15% higher on those days."*

The parent stops guessing. The data speaks.

---

## The Screens

**Parent View — Governor Dashboard:**

![Parent Dashboard](docs/images/screens/parent-dash.png)

The parent sees the family economy at a glance: circulating currency, tax pool, task completion rates, trust scores for each child, mood indicators, and AI-generated insights with actionable buttons.

**Child View — Marketplace:**

![Marketplace](docs/images/screens/child-marketplace.png)

The child sees a job board. Premium bounties with countdown timers and bidding. SOS urgent tasks. Standard daily jobs. Academic study bounties. They choose what to do and when to do it.

**AI Coach:**

![AI Coach](docs/images/screens/ai-coach.png)

Private conversations. Growth-mindset language. Goal tracking. The coach notices when a child is struggling and asks "Is everything okay?" instead of "Why didn't you do your homework?"

**Parent Insights:**

![Insights](docs/images/screens/parent-insights.png)

AI-powered observations that connect the dots the parent can't see: grade/sleep correlations, behavioral patterns, sibling dynamics, and recommendations for intervention.

**Child Profile Survey:**

![Profile Survey](docs/images/screens/profile-survey.png)

During onboarding, the child tells the system how they learn (visual, auditory, reading, kinesthetic), what they're dealing with (ADHD, anxiety, autism), their personality type (competitive, creative, social), and what they want most (money, screen time, grades, achievement). The entire system adapts.

---

## The Psychology

This isn't a gamified chore chart. It's built on three decades of developmental psychology research.

**Self-Determination Theory** (Deci & Ryan): Humans are motivated by autonomy (choice), competence (mastery), and relatedness (connection). The marketplace gives autonomy. The leveling system gives competence. The family challenge gives relatedness.

**Operant Conditioning** (Skinner): Positive reinforcement is 4x more effective than punishment. Variable ratio reinforcement (unpredictable rewards) creates the strongest habits. The bidding system uses both.

**Growth Mindset** (Dweck): We praise effort, not talent. The AI coach says "You stuck with that tough problem until you solved it" — not "You're so smart." Failures are learning opportunities, never shame events.

**Flow State** (Csikszentmihalyi): Optimal experience occurs when challenge matches skill. The trust score system automatically adjusts difficulty — higher trust = harder jobs = bigger rewards = maintained engagement.

---

## Security

FamilyOS handles children's names, ages, behavioral patterns, academic performance, mood data, and financial transactions. A breach isn't just a data incident — it's a child safety emergency.

| Control | Implementation |
|---------|---------------|
| Password hashing | bcrypt, cost factor 12 |
| JWT tokens | 15-minute access, rotating refresh |
| PIN protection | 3 failed attempts → 5-minute lockout |
| SQL injection | 100% parameterized queries |
| IDOR | Every request verified for ownership |
| Rate limiting | Strict on auth, standard on everything else |
| Encryption | AES-256 at rest, TLS 1.3 in transit |
| COPPA/GDPR-K | Verifiable parental consent, data minimization |
| Privacy Firewall | Parents never see AI Coach conversations |
| Crisis detection | Self-harm keywords → immediate parent alert |

Full threat model: [docs/SECURITY.md](docs/SECURITY.md)

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Mobile | React Native (Expo) | Cross-platform, fast iteration |
| Backend | Node.js + Express | JavaScript ecosystem, rapid development |
| Database | PostgreSQL (prod) / SQLite (dev) | Relational integrity, parameterized queries |
| Auth | JWT + bcrypt | Stateless, secure, no third-party dependency |
| AI | OpenAI GPT-4 / Claude | Best-in-class language understanding |
| Push | Firebase Cloud Messaging | Free, reliable, cross-platform |

---

## Getting Started

```bash
git clone https://github.com/Ini-Quee/Family-Child-Development.git
cd Family-Child-Development

# Backend
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npx expo start
```

**Demo logins:**
- Parent: `sarah@demo.com` / `password123`
- Emma (10): PIN `1234` · Jake (13): PIN `5678` · Alex (16): PIN `9012`

---

## What's Next

- [x] **MVP** — Chore management, gamification, wallet, XP/levels
- [ ] **Phase 2** — Marketplace with bidding, trust scores, evidence system
- [ ] **Phase 3** — AI Coach with privacy firewall, academic tracking
- [ ] **Phase 4** — Parent insights engine, mood tracking, athlete mode
- [ ] **Phase 5** — Screen time shop, family challenges, co-parent support
- [ ] **Phase 6** — School integration, third-party API, white-label

---

## The Vision

Most parenting apps treat children as problems to be managed. FamilyOS treats them as people to be developed.

The child who learns to bid on a car wash bounty at 10 is learning resource allocation. The teen who buys screen time with their own earnings is learning opportunity cost. The child whose trust score drops after a lazy submission is learning that reputation matters.

**We're not building a chore app. We're building a childhood.**

---

*MIT License · Built for families who want cooperation, not conflict.*
