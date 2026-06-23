# FamilyOS — Security Architecture

## Overview

FamilyOS handles sensitive data: children's names, ages, behavioral patterns, academic performance, mood data, and financial transactions. A breach isn't just a data incident — it's a child safety emergency.

This document defines every security control, threat vector, and mitigation strategy.

---

## 1. Threat Model

### 1.1 Assets to Protect

| Asset | Sensitivity | Impact if Breached |
|-------|------------|-------------------|
| Child PII (name, age, PIN) | Critical | Identity theft, physical safety |
| Location data (school, home) | Critical | Physical danger to children |
| Behavioral data (mood, grades, chores) | High | Emotional harm, blackmail |
| Financial data (wallets, transactions) | High | Fraud, theft |
| AI Coach conversations | High | Emotional exploitation |
| Parent credentials | Critical | Full account takeover |
| Family invite codes | Medium | Unauthorized family access |

### 1.2 Threat Actors

| Actor | Motivation | Capability |
|-------|-----------|------------|
| Strangers | Predatory, exploitation | Medium-High |
| Sibling rivalry | Competitive advantage, pranks | Low |
| Disgruntled co-parent | Custody disputes, data access | Medium |
| Automated bots | Credential stuffing, scraping | High |
| Insider (employee) | Curiosity, data sale | Medium |

### 1.3 Attack Vectors

| Vector | Likelihood | Impact | Priority |
|--------|-----------|--------|----------|
| SQL Injection | Medium | Critical | P0 |
| Credential stuffing | High | Critical | P0 |
| JWT token theft | Medium | High | P0 |
| API abuse (rate limiting bypass) | High | Medium | P1 |
| Child PIN brute force | Medium | High | P0 |
| Invite code enumeration | Medium | Medium | P1 |
| XSS via user input | Medium | High | P0 |
| Insecure direct object reference (IDOR) | High | Critical | P0 |
| Data exposure in API responses | Medium | High | P1 |
| Unencrypted data at rest | Low | Critical | P0 |

---

## 2. Security Controls

### 2.1 Authentication & Authorization

#### Parent Authentication
- **Password hashing:** bcrypt with cost factor 12
- **JWT tokens:** 15-minute access token + 7-day refresh token (rotating)
- **Rate limiting:** 5 failed login attempts → 15-minute lockout
- **MFA:** TOTP-based (Google Authenticator) — required for accounts with 3+ children

#### Child Authentication
- **PIN-based:** 4-digit PIN, hashed with bcrypt
- **PIN brute force protection:** 3 failed attempts → 5-minute lockout, parent notified
- **Session binding:** Child token bound to device fingerprint
- **No child email/password:** Children never enter email or password

#### Authorization Matrix

| Action | Parent | Child | Co-Parent |
|--------|--------|-------|-----------|
| Create chore | ✅ | ❌ | ✅ |
| Approve chore | ✅ | ❌ | ✅ |
| View child wallet | ✅ (summary) | ✅ (own) | ✅ (summary) |
| View AI Coach chat | ❌ (insights only) | ✅ (own) | ❌ |
| View mood data | ❌ (trend only) | ✅ (own) | ❌ (trend only) |
| Modify economy settings | ✅ (primary only) | ❌ | ❌ |
| Delete child account | ✅ | ❌ | ❌ |
| Export data | ✅ | ✅ (own) | ✅ |

### 2.2 Input Validation

Every API endpoint validates:

| Validation | Implementation |
|-----------|---------------|
| Type checking | JSON Schema validation on all inputs |
| Length limits | Name: 100 chars, Description: 500 chars, PIN: 4 digits exactly |
| Format validation | Email regex, UUID format, date format |
| Range validation | Age: 3-18, XP: 0-999999, Money: 0-99999.99 |
| Whitelist validation | Category, difficulty, status from allowed values |
| SQL injection prevention | Parameterized queries (no string concatenation) |
| XSS prevention | HTML entity encoding on all output |

### 2.3 API Security

#### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /auth/login | 5 attempts | 15 minutes |
| POST /auth/child-login | 3 attempts | 5 minutes |
| POST /auth/register | 3 attempts | 1 hour |
| All other endpoints | 100 requests | 15 minutes |
| File upload (evidence) | 10 uploads | 1 hour |

#### CORS Policy
- Only allowed origins (production domain, localhost for dev)
- No wildcard `*` origins
- Credentials required for authenticated requests

### 2.4 Data Protection

#### Encryption at Rest
- Database: AES-256 encryption (PostgreSQL pgcrypto)
- File storage (evidence photos): AES-256 server-side encryption
- Backups: AES-256 encrypted before storage

#### Encryption in Transit
- TLS 1.3 required for all connections
- HSTS headers with 1-year max-age

### 2.5 Child-Specific Protections (COPPA/GDPR-K)

| Requirement | Implementation |
|------------|---------------|
| Verifiable parental consent | Parent creates child account, sets PIN |
| Data minimization | Collect only what's necessary for functionality |
| Parental access | Parent can view, export, delete child data |
| Child data deletion | One-click delete all child data |
| No behavioral advertising | Zero advertising, zero data sharing |
| No child social features | No messaging between children, no public profiles |
| Privacy by default | All child data private by default |

### 2.6 AI Coach Security

| Control | Implementation |
|---------|---------------|
| Content filtering | Block self-harm, abuse, bullying language |
| Crisis detection | Flag crisis keywords → immediate parent notification |
| Privacy firewall | Parent never sees raw conversations, only derived insights |
| Prompt injection prevention | Sanitize all user input before sending to AI |
| Rate limiting | 50 coach messages per day per child |

### 2.7 Financial Security

| Control | Implementation |
|---------|---------------|
| Transaction integrity | Database transactions with rollback on failure |
| Audit log | Every financial transaction logged with timestamp, actor, amount |
| Anti-exploitation | System warns if reward ratios are unfair |
| Parental caps | Maximum daily earning limit (configurable) |
| No real money movement | Virtual currency only — no actual payments |

---

## 3. Common Attack Mitigations

### 3.1 SQL Injection
All queries use parameterized statements. No string concatenation.

### 3.2 JWT Token Theft
Short-lived access tokens (15 minutes), refresh token rotation, device fingerprint binding.

### 3.3 IDOR (Insecure Direct Object Reference)
Every request verifies resource belongs to user's family. Child can only access own data.

### 3.4 PIN Brute Force
3 failed attempts → 5-minute lockout. Escalates: 5min → 15min → 1hr → parent notification.

### 3.5 Invite Code Enumeration
8-character alphanumeric codes (1.8 trillion combinations). Same error for invalid and non-existent codes.

### 3.6 XSS via User Input
Server-side sanitization on all string fields. React auto-escapes on frontend.

---

## 4. Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(), geolocation=()
```

---

## 5. Security Audit Checklist

- [x] All SQL queries parameterized
- [x] All inputs validated and sanitized
- [x] All outputs encoded
- [x] JWT tokens short-lived with refresh rotation
- [x] Rate limiting on all endpoints
- [x] Rate limiting on auth endpoints (strict)
- [x] CORS configured correctly
- [x] Security headers present
- [x] TLS 1.3 enforced
- [x] Database encrypted at rest
- [x] COPPA compliance verified
- [x] GDPR-K compliance verified
- [x] AI Coach content filtering active
- [x] Crisis detection tested
- [x] Privacy firewall verified
- [x] IDOR protection on all endpoints
- [x] PIN brute force protection tested
- [x] Invite code enumeration protection tested
- [x] Audit logging on all sensitive operations
- [x] Incident response plan documented

---

*Document version: 1.0*
*Created: June 2026*
*Classification: Internal — Security Team*
