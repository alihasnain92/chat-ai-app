# 🔒 Security Documentation

This document outlines the security measures, policies, and best practices implemented in the Chat AI App backend.

---

## 1. 🔐 Password Policy

### Minimum Requirements

- **Minimum length:** 8 characters
- **Validation:** Enforced at the application level before hashing
- **Storage:** Never stored in plaintext; only hashed versions are persisted

### Hashing Algorithm

**Algorithm:** bcrypt with 10 salt rounds

**Implementation:**
```typescript
const SALT_ROUNDS = 10;
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
```

### Why bcrypt?

bcrypt is specifically designed for password hashing and provides several security advantages:

1. **Adaptive:** The number of rounds can be increased as hardware becomes faster, maintaining security over time
2. **Salted by default:** Each password gets a unique salt, preventing rainbow table attacks
3. **Slow by design:** Computationally expensive to hash, making brute-force attacks impractical
4. **Industry standard:** Widely tested and trusted in production systems
5. **Timing attack resistant:** Comparison operations take constant time, preventing timing-based attacks

**Why 10 rounds?**
- Balances security with performance
- Takes ~100-150ms to hash (acceptable for login/registration)
- Exponentially increases difficulty for attackers (2^10 = 1,024 iterations)

### Password Validation Rules

Currently implemented:
- ✅ Minimum 8 characters
- ✅ Required for registration and login

Future considerations (not yet implemented):
- ⏳ Maximum length (to prevent DoS via extremely long passwords)
- ⏳ Complexity requirements (uppercase, lowercase, numbers, special characters)
- ⏳ Common password blacklist
- ⏳ Password history (prevent reuse)

---

## 2. 🎟️ JWT Implementation

### Token Configuration

**Expiration:** 7 days (604,800 seconds)

**Algorithm:** HS256 (HMAC with SHA-256)

**Payload structure:**
```json
{
  "userId": "user-uuid-here",
  "iat": 1699200000,
  "exp": 1699804800
}
```

**Implementation:**
```typescript
const token = jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET!,
  { expiresIn: '7d' }
);
```

### Token Storage

**Client-side storage:** localStorage (browser)

⚠️ **Security Implications:**

**Vulnerabilities:**
- Accessible via JavaScript (vulnerable to XSS attacks)
- Persists across browser sessions
- No automatic expiration on browser close
- Can be stolen if XSS vulnerability exists

**Why we're using it anyway:**
- Simple implementation for development/MVP
- Works across tabs and browser restarts
- Adequate for low-to-medium security requirements

**Better alternatives for production:**
- **httpOnly cookies:** Not accessible via JavaScript, protects against XSS
- **Secure + SameSite cookies:** Additional CSRF protection
- **Memory-only storage:** Most secure but lost on page refresh

### Token Refresh Strategy

**Current implementation:** Not implemented (TBD)

**Planned approach:**
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Refresh endpoint to exchange refresh token for new access token
- Refresh tokens stored in httpOnly cookies

**Benefits:**
- Limits exposure window if access token is compromised
- Allows token revocation without affecting user experience
- Standard OAuth 2.0 pattern

**Timeline:** To be implemented in Phase 2

---

## 3. 🛡️ Common Vulnerabilities Addressed

### SQL Injection

**Protection:** Prisma ORM with parameterized queries

**How it works:**
- Prisma automatically parameterizes all queries
- User input is never directly interpolated into SQL
- Type-safe query building prevents injection

**Example safe query:**
```typescript
// This is SAFE - Prisma parameterizes the email value
const user = await prisma.user.findUnique({
  where: { email: userInput }
});

// Prisma generates: SELECT * FROM users WHERE email = $1
// Parameter: [userInput]
```

**Status:** ✅ Fully protected

---

### Password Timing Attacks

**Protection:** bcrypt's constant-time comparison

**How it works:**
- bcrypt.compare() uses constant-time comparison algorithms
- Comparison takes the same time regardless of how many characters match
- Prevents attackers from learning about password structure through timing analysis

**Why this matters:**
```typescript
// VULNERABLE - string comparison
if (password === storedPassword) {
  // Fails fast - timing reveals position of first wrong character
}

// SECURE - bcrypt comparison
const isValid = await bcrypt.compare(password, hashedPassword);
// Always takes same time, reveals nothing about password
```

**Status:** ✅ Fully protected

---

### Cross-Site Scripting (XSS)

**Protection:** Partial (TBD for full coverage)

**Current measures:**
- Database stores raw user input (no HTML)
- Frontend framework (React) auto-escapes by default

**Remaining vulnerabilities:**
- User-generated content in chat messages
- Profile names and avatars
- File uploads (future feature)

**Planned mitigations:**
- Input sanitization library (DOMPurify)
- Content Security Policy (CSP) headers
- HTML entity encoding for user content
- Strict validation of file uploads

**Timeline:** To be implemented in Phase 2

**Status:** ⚠️ Partial protection - needs enhancement

---

### Cross-Site Request Forgery (CSRF)

**Protection:** CORS configuration

**Current implementation:**
```typescript
// CORS configuration in Express
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

**How it protects:**
- Only allows requests from specified frontend origin
- Blocks requests from malicious websites
- Credentials (cookies) only sent to allowed origins

**Limitations:**
- CORS alone doesn't protect against all CSRF if using localStorage for tokens
- CSRF tokens needed when using cookies for auth

**Future enhancements:**
- CSRF tokens for state-changing operations
- SameSite cookie attribute
- Double-submit cookie pattern

**Status:** ✅ Basic protection via CORS

---

### Authorization Bypass

**Protection:** Middleware-based authentication

**How it works:**
```typescript
// Auth middleware checks token on every protected route
authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  
  req.userId = payload.userId;
  next();
}
```

**Protected routes:**
```typescript
router.get('/me', authenticateToken, getMe);
// Token must be valid before getMe is called
```

**Status:** ✅ Fully implemented for auth routes

---

### User Enumeration

**Protection:** Generic error messages

**Implementation:**
- Login returns "Invalid credentials" for both wrong email and wrong password
- Registration returns "Email already exists" (acceptable tradeoff for UX)
- No user listing endpoints without authentication

**Why this matters:**
- Prevents attackers from discovering valid email addresses
- Makes targeted attacks more difficult

**Status:** ✅ Implemented

---

## 4. 🔑 Environment Variables Security

### Critical Secrets

**Never commit these to version control:**
- `JWT_SECRET` - Used to sign authentication tokens
- `DATABASE_URL` - Contains database credentials
- API keys for external services (future)

### Best Practices

**1. Use .gitignore**
```gitignore
# Never commit environment files
.env
.env.local
.env.*.local
```

**2. Use strong secrets**
```bash
# Generate secure JWT_SECRET (32+ random characters)
openssl rand -base64 32

# Example output: 
# r7K9mP2xQ5vL8nW3zH6jC1tY4uB0aE+F
```

**3. Different secrets per environment**
```
Development:  JWT_SECRET=dev-secret-key-12345
Staging:      JWT_SECRET=staging-abc-xyz-789
Production:   JWT_SECRET=prod-[64-character-random-string]
```

**4. Secret rotation schedule**
- **Production:** Rotate every 90 days
- **After security incident:** Rotate immediately
- **Employee departure:** Rotate all secrets they had access to

### Secret Management Tools

**For production:**
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Cloud Secret Manager

**For development:**
- `.env` file (never committed)
- Team password manager for shared secrets
- Environment variables in CI/CD pipelines

### Example .env.example

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/chatdb"

# Authentication
JWT_SECRET="your-super-secret-key-change-in-production"

# Server
PORT=4000
NODE_ENV=development

# Frontend (for CORS)
FRONTEND_URL="http://localhost:3000"
```

**Instructions for team:**
1. Copy `.env.example` to `.env`
2. Replace placeholder values with real credentials
3. Never commit `.env` to git

---

## 5. 🚦 Rate Limiting

**Status:** ⏳ To be implemented on Day 12

### Planned Implementation

**Endpoints to protect:**
- `/api/auth/register` - Prevent mass account creation
- `/api/auth/login` - Prevent brute-force attacks
- `/api/messages` - Prevent spam
- `/api/ai/*` - Prevent API cost abuse

**Strategy:**
```typescript
// Example with express-rate-limit
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);
```

**Rate limits (planned):**
- **Auth endpoints:** 5 requests per 15 minutes per IP
- **API endpoints:** 100 requests per 15 minutes per user
- **AI endpoints:** 20 requests per hour per user

**Storage backend:**
- Development: Memory (simple)
- Production: Redis (distributed, persistent)

---

## 6. 📋 Security Checklist

### ✅ Implemented

- [x] Password hashing with bcrypt
- [x] JWT authentication
- [x] SQL injection protection (Prisma)
- [x] Timing attack protection (bcrypt)
- [x] CORS configuration
- [x] Environment variable management
- [x] Generic error messages (user enumeration prevention)
- [x] Authorization middleware

### ⏳ Planned / TBD

- [ ] Input sanitization for XSS
- [ ] CSRF tokens
- [ ] Rate limiting
- [ ] Token refresh mechanism
- [ ] Content Security Policy headers
- [ ] Secure cookie configuration (httpOnly, Secure, SameSite)
- [ ] Account lockout after failed login attempts
- [ ] Password complexity requirements
- [ ] Audit logging
- [ ] Security headers (helmet.js)

### 🔮 Future Considerations

- [ ] Two-factor authentication (2FA)
- [ ] OAuth integration (Google, GitHub)
- [ ] Session management
- [ ] IP-based access control
- [ ] Webhook signature verification
- [ ] File upload security
- [ ] API key management for external integrations

---

## 7. 🚨 Incident Response

### If a security breach occurs:

1. **Immediately:**
   - Rotate all secrets (JWT_SECRET, database passwords)
   - Force logout all users (invalidate all tokens)
   - Block compromised IPs if identifiable

2. **Within 24 hours:**
   - Assess scope of breach
   - Notify affected users
   - Document incident timeline

3. **Within 72 hours:**
   - Patch vulnerability
   - Deploy security updates
   - Review and update security practices

4. **Follow-up:**
   - Post-mortem analysis
   - Update security documentation
   - Implement additional safeguards

---

## 8. 📚 Resources

### Documentation
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [bcrypt documentation](https://github.com/kelektiv/node.bcrypt.js)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Prisma Security](https://www.prisma.io/docs/concepts/components/prisma-client/security)

### Tools
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Dependency vulnerabilities
- [Snyk](https://snyk.io/) - Continuous security monitoring

---

**Maintained by:** chat-ai-app team  
**Last updated:** November 5, 2025  
**Next review:** December 5, 2025