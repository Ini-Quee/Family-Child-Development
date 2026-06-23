# MVP Plan — FamilyOS

## Overview

The MVP (Minimum Viable Product) delivers the core value proposition — **replace nagging with a gamified family task system** — in the simplest possible form. Every feature in the MVP must pass the test: "Does this directly reduce the #1 parent pain point (constant nagging) while keeping children engaged?"

---

## MVP Scope Definition

### IN SCOPE (Must Have)

| Feature | Rationale |
|---------|-----------|
| Parent registration & family setup | Core onboarding |
| Child account creation (by parent) | Core onboarding |
| Chore creation (parent) | Core value: chore management |
| Chore list with completion (child) | Core value: chore management |
| Photo proof of completion | Trust building, reduces "did you really do it?" fights |
| Parent approval workflow | Core value: accountability without nagging |
| XP and level system | Core gamification |
| Basic streak tracking | Habit formation |
| Simple screen time display | Visibility (not control yet) |
| Virtual wallet with earnings | Financial motivation |
| Push notifications | Reminders and celebrations |
| Basic parent dashboard | Family overview |
| Basic child home screen | Task list and progress |

### OUT OF SCOPE (Phase 2+)

| Feature | Deferred To |
|---------|-------------|
| Automated screen time control (device lock) | Phase 2 — requires platform MDM integration |
| AI assistant | Phase 2 — requires GPT-4/Claude integration |
| Family challenges | Phase 2 — requires multiplayer logic |
| Investment simulator | Phase 3 — requires market data API |
| Study timer with focus mode | Phase 2 — requires app blocking |
| Fitness tracking | Phase 3 — requires health API integration |
| Financial literacy lessons | Phase 3 — requires content creation |
| Co-parent integration | Phase 2 — requires multi-user permissions |
| Savings goals with visual progress | Phase 2 |
| Calendar integration | Phase 2 |
| School/Organization tier | Phase 4 |

---

## MVP User Stories

### Parent Stories

| ID | Story | Priority |
|----|-------|----------|
| P1 | As a parent, I can create an account and add my children with their ages | P0 |
| P2 | As a parent, I can create chores with title, description, frequency, and XP/money value | P0 |
| P3 | As a parent, I can see which chores are completed, pending, or missed | P0 |
| P4 | As a parent, I can approve or reject completed chores | P0 |
| P5 | As a parent, I can see my children's levels and XP progress | P1 |
| P6 | As a parent, I can see a daily summary of family activity | P1 |
| P7 | As a parent, I receive notifications when chores are completed or missed | P1 |
| P8 | As a parent, I can send a "Great job!" encouragement to a child | P2 |

### Child Stories

| ID | Story | Priority |
|----|-------|----------|
| C1 | As a child, I can log in with my name and PIN | P0 |
| C2 | As a child, I can see today's chore list | P0 |
| C3 | As a child, I can mark a chore as complete | P0 |
| C4 | As a child, I can take a photo to prove I did the chore | P0 |
| C5 | As a child, I can see my XP and level progress | P1 |
| C6 | As a child, I can see my streak (consecutive days) | P1 |
| C7 | As a child, I can see how much money I've earned | P1 |
| C8 | As a child, I can see when my chore is approved | P2 |
| C9 | As a child, I earn XP with a satisfying animation when approved | P2 |

---

## Technical Architecture (MVP)

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Mobile App | React Native (Expo) | Cross-platform, fast development, large ecosystem |
| Backend | Node.js + Express | Fast to build, JavaScript ecosystem, good for REST APIs |
| Database | PostgreSQL | Relational data, strong typing, free tier on Supabase/Neon |
| Auth | Firebase Auth | Free tier, handles email + Google/Apple sign-in, COPPA-ready |
| Push Notifications | Firebase Cloud Messaging | Free, cross-platform, reliable |
| File Storage | Firebase Storage | Photo proof storage, free tier generous |
| Hosting | Railway or Render | Simple deployment, free/cheap tiers |
| Monitoring | Sentry | Error tracking, free tier |

### API Design

```
POST   /api/auth/register          — Parent registration
POST   /api/auth/login             — Parent login
POST   /api/auth/child-login       — Child PIN login

GET    /api/family                  — Get family overview
POST   /api/family/children         — Add child
PUT    /api/family/children/:id     — Update child
DELETE /api/family/children/:id     — Remove child

GET    /api/chores                  — List chores (filtered by child/date)
POST   /api/chores                  — Create chore
PUT    /api/chores/:id              — Update chore
DELETE /api/chores/:id              — Delete chore

GET    /api/assignments             — List assignments (filtered by child/date)
POST   /api/assignments/:id/complete — Mark chore complete + upload photo
POST   /api/assignments/:id/approve  — Parent approves
POST   /api/assignments/:id/reject   — Parent rejects

GET    /api/children/:id/progress   — XP, level, streak, earnings
GET    /api/children/:id/wallet     — Balance and transaction history

POST   /api/notifications/send      — Send encouragement
GET    /api/dashboard               — Parent daily summary
```

### Database Schema (MVP Subset)

Only these tables from the full schema:

1. `families`
2. `users` (parents)
3. `children`
4. `chores`
5. `chore_assignments`
6. `wallets`
7. `financial_transactions`
8. `level_definitions`
9. `streaks`
10. `notifications`

---

## Design System (MVP)

### Approach
- Use a pre-built component library (React Native Paper or NativeBase) to move fast
- Customize colors to match brand palette
- Child mode: playful, colorful, large touch targets
- Parent mode: clean, professional, information-dense

### Key Screens (MVP)

| Screen | Priority | Complexity |
|--------|----------|------------|
| Parent: Registration/Family Setup | P0 | Medium |
| Parent: Dashboard | P0 | Medium |
| Parent: Create Chore | P0 | Low |
| Parent: Approval Queue | P0 | Low |
| Parent: Child Progress | P1 | Low |
| Child: PIN Login | P0 | Low |
| Child: Today's Tasks | P0 | Medium |
| Child: Complete Task + Photo | P0 | Medium |
| Child: Progress/Level | P1 | Low |
| Child: Wallet | P1 | Low |

Total MVP screens: **10**

---

## Development Timeline

### Week 1-2: Foundation

| Task | Hours |
|------|-------|
| Project setup (React Native + Express + PostgreSQL) | 8 |
| Database schema creation | 4 |
| Authentication (parent registration, login, child PIN) | 16 |
| Basic API structure | 8 |
| **Subtotal** | **36** |

### Week 3-4: Core Features

| Task | Hours |
|------|-------|
| Parent: Family setup flow | 12 |
| Parent: Chore CRUD | 16 |
| Child: Task list display | 12 |
| Child: Mark complete + photo upload | 16 |
| Parent: Approval workflow | 12 |
| **Subtotal** | **68** |

### Week 5-6: Gamification & Polish

| Task | Hours |
|------|-------|
| XP/Level system | 12 |
| Streak tracking | 8 |
| Wallet/earnings | 12 |
| Push notifications | 12 |
| Parent dashboard | 12 |
| Child progress screen | 8 |
| **Subtotal** | **64** |

### Week 7-8: Testing & Launch

| Task | Hours |
|------|-------|
| UI polish and animations | 16 |
| Bug fixes | 20 |
| Beta testing (10-20 families) | 16 |
| App store submission | 8 |
| Landing page | 8 |
| **Subtotal** | **68** |

**Total MVP effort: ~236 hours (6 weeks of focused development)**

---

## MVP Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Beta families | 20 | Sign-ups |
| Daily active usage (parent) | 70% | DAU/MAU |
| Daily active usage (child) | 60% | DAU/MAU |
| Chore completion rate | 65%+ | Completed/Assigned |
| 7-day retention | 50% | Day 7 active / Day 0 |
| 30-day retention | 30% | Day 30 active / Day 0 |
| Net Promoter Score | 40+ | Survey |
| Parent-reported nagging reduction | 50%+ | Survey |

---

## MVP Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Children won't use it | High | Co-design with kids, beta test early, iterate on gamification |
| Parents don't trust photo proof | Medium | Make it optional, show that it reduces fights |
| Too complex for 6-year-olds | High | Test with actual 6-year-olds, simplify UI ruthlessly |
| App store rejection (COPPA) | High | Implement verifiable parental consent, review Apple/Google policies early |
| Low conversion to paid | Medium | Free tier must be genuinely useful, paid features must be obviously valuable |
| Technical debt from rushing | Medium | Write tests for core flows, refactor after MVP |

---

## Post-MVP Roadmap

| Phase | Timeline | Key Features |
|-------|----------|--------------|
| Phase 2 | Month 3-4 | Screen time control, AI assistant, family challenges, co-parent |
| Phase 3 | Month 5-7 | Study timer, fitness tracking, financial lessons, investment sim |
| Phase 4 | Month 8-10 | School/organization tier, advanced analytics, API |
| Phase 5 | Month 11-12 | International expansion, localization, partnerships |

---

*Document version: 1.0*
*Created: June 2026*
