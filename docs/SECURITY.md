# FamilyOS — Security Architecture & Threat Model

## Overview

FamilyOS handles sensitive data: children's names, ages, locations, behavioral patterns, academic performance, mood data, and financial transactions. A breach would be catastrophic — not just legally (COPPA, GDPR-K), but emotionally for families who trusted us with their children's data.

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
| State actors | Unlikely but possible | Very High |

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
| Man-in-the-middle | Low | High | P1 |
| Insider threat | Low | Critical | P2 |

---

## 2. Security Controls

### 2.1 Authentication & Authorization

#### Parent Authentication
- **Password hashing:** bcrypt with cost factor 12 (not 10 — we're protecting children)
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

#### Request Validation
- Content-Type enforcement (application/json only)
- Request body size limit: 1MB
- Query parameter sanitization
- Header injection prevention

### 2.4 Data Protection

#### Encryption at Rest
- Database: AES-256 encryption (PostgreSQL pgcrypto)
- File storage (evidence photos): AES-256 server-side encryption
- Backups: AES-256 encrypted before storage

#### Encryption in Transit
- TLS 1.3 required for all connections
- HSTS headers with 1-year max-age
- Certificate pinning for mobile app

#### Data Minimization
- API responses include only necessary fields
- Child location data never stored — only school/activity names
- AI Coach conversations: 90-day retention, then auto-deleted
- Mood data: aggregated after 30 days, raw data deleted

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
| Data portability | Export all data in JSON/CSV format |

### 2.6 AI Coach Security

| Control | Implementation |
|---------|---------------|
| Content filtering | Block self-harm, abuse, bullying language |
| Crisis detection | Flag crisis keywords → immediate parent notification + emergency resources |
| Privacy firewall | Parent never sees raw conversations, only derived insights |
| Prompt injection prevention | Sanitize all user input before sending to AI |
| Response validation | AI responses checked for inappropriate content |
| Rate limiting | 50 coach messages per day per child |
| No persistent memory | Coach doesn't remember across sessions (privacy) |

### 2.7 Financial Security

| Control | Implementation |
|---------|---------------|
| Transaction integrity | Database transactions with rollback on failure |
| Audit log | Every financial transaction logged with timestamp, actor, amount |
| Anti-exploitation | System warns if reward ratios are unfair |
| Parental caps | Maximum daily earning limit (configurable) |
| No real money movement | Virtual currency only — no actual payments |
| Tax pool transparency | Parents can see exactly where tax money goes |

---

## 3. Common Attack Mitigations

### 3.1 SQL Injection

**Attack:** `' OR 1=1; DROP TABLE children; --`

**Mitigation:**
```javascript
// WRONG — vulnerable
db.query(`SELECT * FROM users WHERE email = '${email}'`)

// CORRECT — parameterized
db.prepare('SELECT * FROM users WHERE email = ?').get(email)
```

**Status:** All queries use parameterized statements (SQLite prepared statements).

### 3.2 JWT Token Theft

**Attack:** Stolen token used from different device/location.

**Mitigation:**
- Short-lived access tokens (15 minutes)
- Refresh token rotation (single use)
- Device fingerprint binding
- IP change detection → re-authentication
- Token revocation on logout

### 3.3 IDOR (Insecure Direct Object Reference)

**Attack:** Child A accesses Child B's wallet by changing ID in URL.

**Mitigation:**
```javascript
// Always verify ownership
const wallet = db.prepare('SELECT * FROM wallets WHERE child_id = ?').get(childId);
if (wallet.child_id !== req.user.id) {
  return res.status(403).json({ error: 'Access denied' });
}
```

### 3.4 PIN Brute Force

**Attack:** Try all 10,000 PIN combinations.

**Mitigation:**
- 3 failed attempts → 5-minute lockout
- Lockout escalates: 5min → 15min → 1hr → parent notification
- PIN is bcrypt-hashed (slow to verify)
- Rate limiting on child-login endpoint

### 3.5 Invite Code Enumeration

**Attack:** Guess invite codes to access other families.

**Mitigation:**
- 8-character alphanumeric codes (34^8 = 1.8 trillion combinations)
- Rate limiting: 10 guesses per hour per IP
- No "code exists" feedback — same error for invalid and non-existent
- Codes expire after 30 days if unused

### 3.6 XSS via User Input

**Attack:** `<script>alert('hacked')</script>` in chore title.

**Mitigation:**
```javascript
// Server-side sanitization
function sanitize(input) {
  return input.replace(/[<>\"'&]/g, (match) => ({
    '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;'
  }[match]));
}

// React auto-escapes by default (frontend)
```

### 3.7 Evidence Photo Fraud

**Attack:** Submit old/different photo as evidence.

**Mitigation:**
- EXIF metadata extraction (timestamp, GPS)
- AI similarity detection (compare before/after)
- Random verification challenges ("Take a photo with today's newspaper")
- Parent can request live verification

---

## 4. Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(), geolocation=()
```

---

## 5. Incident Response Plan

| Severity | Response Time | Actions |
|----------|-------------|---------|
| Critical (data breach) | 1 hour | Isolate, notify affected users, engage legal |
| High (auth bypass) | 4 hours | Patch, rotate secrets, audit logs |
| Medium (rate limit bypass) | 24 hours | Patch, monitor |
| Low (information disclosure) | 1 week | Patch in next release |

---

## 6. Security Audit Checklist

- [ ] All SQL queries parameterized
- [ ] All inputs validated and sanitized
- [ ] All outputs encoded
- [ ] JWT tokens short-lived with refresh rotation
- [ ] Rate limiting on all endpoints
- [ ] Rate limiting on auth endpoints (strict)
- [ ] CORS configured correctly
- [ ] Security headers present
- [ ] TLS 1.3 enforced
- [ ] Database encrypted at rest
- [ ] File storage encrypted at rest
- [ ] COPPA compliance verified
- [ ] GDPR-K compliance verified
- [ ] AI Coach content filtering active
- [ ] Crisis detection tested
- [ ] Privacy firewall verified (parent can't see coach chats)
- [ ] IDOR protection on all endpoints
- [ ] PIN brute force protection tested
- [ ] Invite code enumeration protection tested
- [ ] Evidence photo integrity verified
- [ ] Audit logging on all sensitive operations
- [ ] Incident response plan documented
- [ ] Penetration test completed
- [ ] Dependency vulnerability scan clean

---

*Document version: 1.0*
*Created: June 2026*
*Classification: Internal — Security Team*
