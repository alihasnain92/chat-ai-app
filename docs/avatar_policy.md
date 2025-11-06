# 🖼️ Avatar Upload Policy

**Document Version:** 1.0  
**Last Updated:** November 7, 2025  
**Status:** Active  
**Owner:** Chat AI App Backend Team

---

## 📋 Overview

This document defines the policy and technical requirements for user avatar uploads in the Chat AI App. It covers allowed file types, size limits, storage strategy, security measures, and future plans for scaling.

---

## 1. 🎨 Allowed File Types

### Supported Formats

| Format | MIME Type | Extension | Status |
|--------|-----------|-----------|--------|
| JPEG | `image/jpeg` | `.jpg`, `.jpeg` | ✅ Allowed |
| PNG | `image/png` | `.png` | ✅ Allowed |
| GIF | `image/gif` | `.gif` | ✅ Allowed |
| WebP | `image/webp` | `.webp` | ✅ Allowed |

### Rationale

**Why JPEG?**
- Universal browser support
- Efficient compression for photographs
- Smaller file sizes for realistic images
- Industry standard for profile pictures

**Why PNG?**
- Supports transparency (useful for logo-style avatars)
- Lossless compression for graphics and icons
- Better quality for images with text or sharp edges
- No compression artifacts

**Why GIF?**
- Wide browser support
- Simple format, easy to handle
- Supports basic transparency
- Allows animated avatars (adds personality)

**Why WebP?**
- Modern format with excellent compression
- Smaller file sizes than JPEG/PNG (20-30% reduction)
- Supports both lossy and lossless compression
- Growing browser support (all modern browsers)

**Why Not Other Formats?**

| Format | Reason for Exclusion |
|--------|---------------------|
| SVG | Security risks (embedded scripts); complex validation required |
| BMP | Uncompressed format; excessively large file sizes |
| TIFF | Not web-optimized; poor browser support |
| HEIC | Apple-specific; requires server-side conversion |

---

## 2. 📏 Size Limits

### File Size Constraints

```
Maximum file size: 5 MB (5,242,880 bytes)
Recommended size: < 2 MB
Minimum dimensions: 100 x 100 pixels (recommended)
Maximum dimensions: 4000 x 4000 pixels (recommended)
```

### Rationale

**5 MB Maximum Limit:**
- Prevents abuse and storage bloat
- Ensures reasonable upload times on slow connections
- Standard limit across most social platforms (Twitter: 5MB, LinkedIn: 8MB, Facebook: 4MB)
- Balances quality with performance
- Accommodates animated GIFs and high-quality images

**Recommended < 2 MB:**
- Modern smartphones produce 2-4 MB images at high quality
- 2 MB is sufficient for 1500x1500px at high JPEG quality
- Faster uploads improve user experience
- Reduces storage costs at scale

**Dimension Guidelines:**
- **Minimum 100x100px:** Ensures avatars are usable at display sizes
- **Maximum 4000x4000px:** Prevents memory issues during processing; no practical need for larger profile images

### Upload Time Estimates

| File Size | 3G (1 Mbps) | 4G (10 Mbps) | 5G/WiFi (50 Mbps) |
|-----------|-------------|--------------|-------------------|
| 500 KB | ~4 seconds | ~0.4 seconds | ~0.08 seconds |
| 2 MB | ~16 seconds | ~1.6 seconds | ~0.3 seconds |
| 5 MB | ~40 seconds | ~4 seconds | ~0.8 seconds |

---

## 3. 💾 Storage Location

### Development Environment (MVP)

**Local File System Storage**

```
Storage path: /uploads/avatars/
Physical location: ./server/uploads/avatars/
URL pattern: http://localhost:4000/uploads/avatars/{filename}
```

**Directory Structure:**
```
project-root/
├── server/
│   ├── uploads/
│   │   └── avatars/
│   │       ├── a1b2c3d4-uuid-1699564800000.jpg
│   │       ├── e5f6g7h8-uuid-1699564900000.png
│   │       └── ...
│   ├── src/
│   └── ...
└── ...
```

**Permissions:**
- Read: Public (served via Express static middleware)
- Write: Application only
- Directory permissions: `755`
- File permissions: `644`

**Git Configuration:**
```gitignore
# Uploaded files
/server/uploads/
```

**Advantages for Development:**
- Simple setup, no external dependencies
- Fast iteration and testing
- No API keys or configuration required
- Easy file inspection and debugging
- Zero cost for local development

**Limitations:**
- Not suitable for production at scale
- No redundancy or backups
- Doesn't scale horizontally (multiple server instances)
- Lost when container restarts (if Dockerized)

---

## 4. 🏷️ Naming Convention

### File Naming Strategy

**Format:**
```
{userId}-{timestamp}.{extension}

Example: 550e8400-e29b-41d4-a716-446655440000-1699564800000.jpg
```

**Components:**

1. **User ID (UUID):**
   - Ensures uniqueness across users
   - Prevents filename collisions
   - Easy lookup and association
   - Example: `550e8400-e29b-41d4-a716-446655440000`

2. **Timestamp (Unix milliseconds):**
   - Allows multiple uploads per user (history tracking)
   - Enables cache busting (URL changes on update)
   - Helps with debugging and audit trails
   - Example: `1699564800000`

3. **Extension:**
   - Preserves original file type
   - Assists browser content-type detection
   - Examples: `.jpg`, `.png`, `.gif`, `.webp`

**Implementation Example:**
```typescript
const userId = req.userId;
const timestamp = Date.now();
const extension = path.extname(file.originalname);
const filename = `${userId}-${timestamp}${extension}`;
```

**Alternative Approaches Considered:**

| Approach | Reason Not Used |
|----------|----------------|
| Original filename | Security risk (path traversal, special characters) |
| Hash-based | Harder to debug; requires database lookup for ownership |
| Random strings | No semantic meaning; collision risk without proper generation |

---

## 5. 🔒 Security Considerations

### 5.1 File Type Validation

**⚠️ CRITICAL: Do Not Trust File Extensions**

```javascript
// ❌ INSECURE - Never do this
if (filename.endsWith('.jpg')) {
  // Extension can be faked
}

// ✅ SECURE - Validate MIME type
const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
if (!allowedMimes.includes(file.mimetype)) {
  throw new Error('Invalid file type');
}
```

**Validation Strategy:**

1. **MIME Type Validation:**
   - Check `file.mimetype` from Multer
   - Whitelist allowed types only
   - Reject any file not matching the whitelist

2. **Magic Number Validation (Advanced):**
   - Read first bytes of file (file signature)
   - JPEG: `FF D8 FF`
   - PNG: `89 50 4E 47 0D 0A 1A 0A`
   - GIF: `47 49 46 38`
   - WebP: `52 49 46 46 ... 57 45 42 50`

3. **File Extension Check:**
   - Validate extension matches MIME type
   - Use as secondary validation only

**Multer Configuration:**
```typescript
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.'));
  }
};
```

**Threat Prevention:**
- Prevents malicious file execution (e.g., PHP file with `.jpg` extension)
- Blocks polyglot files (valid as multiple formats)
- Stops RCE (Remote Code Execution) attempts

### 5.2 Filename Sanitization

**Always Sanitize User Input**

```javascript
// Remove or replace dangerous characters
const sanitized = path.basename(file.originalname)
  .replace(/[^a-zA-Z0-9.-]/g, '_')  // Replace special chars
  .replace(/\.{2,}/g, '.')          // Prevent directory traversal
  .replace(/^\./, '')               // Remove leading dot
  .substring(0, 255);               // Limit length
```

**Dangerous Patterns to Block:**
- Path traversal: `../../../etc/passwd`
- Null bytes: `image.jpg\0.php`
- Special characters: `image;<script>.jpg`
- Hidden files: `.htaccess`, `.env`

**Best Practice:**
- Use UUID-based names (bypasses sanitization issues entirely)
- Never use original filenames directly in file system
- Store original filename in database only (for display purposes)

### 5.3 Rate Limiting (Future Implementation)

**Planned Restrictions:**

```
Per User Limits:
- 5 uploads per hour
- 20 uploads per day
- 100 uploads per month

Global Limits:
- 1000 uploads per hour (per server)
- Automatic scaling throttle at high load
```

**Implementation Strategy:**
- Use Redis for distributed rate limiting
- Track by user ID and IP address
- Return `429 Too Many Requests` when exceeded
- Include `Retry-After` header

**Rationale:**
- Prevents abuse and spam
- Protects storage resources
- Reduces bandwidth costs
- Mitigates DoS attacks

### 5.4 Additional Security Measures

**Content Scanning (Future):**
- Integrate virus scanning (ClamAV)
- Check for embedded malware in images
- Scan for steganography (hidden data)

**Access Control:**
- Avatars are public (no sensitive data)
- Only authenticated users can upload
- Users can only update their own avatar
- No directory listing enabled

**Image Processing (Future):**
- Strip EXIF metadata (location, device info)
- Resize/compress to standard dimensions
- Re-encode images to remove potential exploits

**Server Configuration:**
```typescript
// Prevent MIME type sniffing
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
```

---

## 6. 🎭 Fallback Avatars

### DiceBear API Integration

**When Used:**
- New user registration (no avatar uploaded)
- Failed avatar upload
- Deleted avatar
- Invalid/corrupted avatar file

**API Endpoint:**
```
https://api.dicebear.com/7.x/{style}/svg?seed={userId}
```

**Chosen Style:**
```
Primary: "avataaars" (cartoon-style faces)
Alternative: "initials" (text-based with user initials)
```

**Example:**
```
https://api.dicebear.com/7.x/avataaars/svg?seed=550e8400-e29b-41d4-a716-446655440000
```

**Advantages:**
- Deterministic (same user always gets same avatar)
- No storage required
- Instant generation
- Visually appealing and diverse
- Free tier available (100 requests/day for development)

**Implementation:**
```typescript
function getAvatarUrl(user: User): string {
  if (user.avatarUrl) {
    return user.avatarUrl;
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
}
```

**Caching Strategy:**
- CDN caching for DiceBear requests
- Browser caching with long TTL (1 year)
- No database storage needed

---

## 7. ☁️ Migration to Cloud Storage (Future Plan)

### Recommended Service: AWS S3 + CloudFront CDN

**Architecture:**
```
User → API Server → S3 Bucket → CloudFront CDN → User
```

**Configuration:**

```
S3 Bucket Structure:
s3://chat-ai-app-avatars/
├── production/
│   ├── user-{uuid}-{timestamp}.jpg
│   └── ...
├── staging/
│   └── ...
└── development/
    └── ...

CloudFront Distribution:
Domain: avatars.chatapp.com
Origin: chat-ai-app-avatars.s3.amazonaws.com
Cache: 1 year (aggressive caching)
```

### Migration Benefits

| Feature | Local Storage | AWS S3 + CloudFront |
|---------|---------------|---------------------|
| Redundancy | ❌ None | ✅ 99.999999999% durability |
| Scalability | ❌ Limited | ✅ Unlimited |
| CDN | ❌ None | ✅ Global edge locations |
| Backup | ❌ Manual | ✅ Automatic versioning |
| Cost | ✅ Free (disk space) | 💰 ~$0.023/GB/month + transfer |
| Multi-server | ❌ Complex | ✅ Native support |
| Performance | 🟡 Local network only | ✅ Global low latency |

### Migration Timeline

- **Phase 1 (Q1 2026):** Implement S3 upload in parallel with local
- **Phase 2 (Q2 2026):** Migrate existing avatars to S3
- **Phase 3 (Q2 2026):** Switch to S3-only, deprecate local storage
- **Phase 4 (Q3 2026):** Implement CloudFront CDN

### Cost Estimation (at scale)

```
Assumptions:
- 10,000 active users
- 2 MB average avatar size
- 100 avatar views per user per month

S3 Storage: 10,000 × 2 MB = 20 GB × $0.023 = $0.46/month
S3 Requests: 10,000 × 100 = 1M requests × $0.0004 = $400/month
CloudFront: 200 GB transfer × $0.085 = $17/month
Total: ~$417.46/month

Alternative (No CDN):
- Direct S3 transfer: 200 GB × $0.09 = $18/month
- Total: ~$18.46/month (but slower, less reliable)
```

### Alternative Cloud Providers

| Provider | Pros | Cons | Best For |
|----------|------|------|----------|
| **AWS S3** | Industry standard, mature, CloudFront integration | Complex pricing | Production at scale |
| **Cloudinary** | Image optimization built-in, easy API | Can get expensive | Quick MVP to production |
| **Azure Blob** | Good for Microsoft stack | Less common in Node.js | Azure-first companies |
| **Google Cloud Storage** | Good CDN, competitive pricing | Complex setup | Google Cloud users |

**Recommendation:** AWS S3 + CloudFront (industry standard, best performance)

### Implementation Code Snippets

**Install AWS SDK:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**S3 Upload Example:**
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

const uploadParams = {
  Bucket: process.env.S3_BUCKET_NAME,
  Key: `avatars/${userId}-${timestamp}${extension}`,
  Body: file.buffer,
  ContentType: file.mimetype,
  ACL: 'public-read',
};

await s3Client.send(new PutObjectCommand(uploadParams));

const avatarUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/avatars/${userId}-${timestamp}${extension}`;
```

---

## 📊 Monitoring & Metrics

### Key Metrics to Track

**Upload Metrics:**
- Upload success rate
- Upload failure reasons (by error type)
- Average file size
- Upload duration (p50, p95, p99)
- File type distribution

**Storage Metrics:**
- Total storage used
- Storage growth rate
- Number of avatars
- Average avatar size
- Animated GIF usage percentage

**Performance Metrics:**
- Avatar load time
- CDN cache hit rate (future)
- Origin requests per second

**Security Metrics:**
- Failed validation attempts
- Rate limit hits
- Suspicious upload patterns
- Malicious file detection (future)

### Logging Strategy

```javascript
// Log format for avatar uploads
{
  "timestamp": "2025-11-07T10:30:00Z",
  "event": "avatar_upload",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "fileSize": 1048576,
  "mimeType": "image/jpeg",
  "filename": "550e8400-e29b-41d4-a716-446655440000-1699564800000.jpg",
  "duration": 234,
  "status": "success"
}
```

---

## ✅ Implementation Checklist

### Development Phase (MVP)
- [x] Create upload directory structure
- [x] Install Multer package
- [x] Configure Multer with file filter
- [x] Implement file size limits
- [x] Generate UUID-based filenames
- [x] Create upload endpoint
- [x] Serve static files via Express
- [x] Integrate DiceBear fallback
- [ ] Add request logging
- [ ] Write upload tests

### Security Hardening
- [x] Implement MIME type validation
- [ ] Add magic number validation (advanced)
- [ ] Implement rate limiting
- [ ] Strip EXIF metadata
- [ ] Configure CORS properly
- [ ] Add Content Security Policy headers
- [ ] Set up virus scanning (future)

### Production Readiness
- [ ] Migrate to S3 storage
- [ ] Set up CloudFront CDN
- [ ] Configure backup strategy
- [ ] Implement monitoring/alerts
- [ ] Load testing (1000+ concurrent uploads)
- [ ] Document disaster recovery process
- [ ] Add image resizing/optimization

---

## 📚 References

**Standards & Specifications:**
- [RFC 2046 - MIME Media Types](https://www.rfc-editor.org/rfc/rfc2046)
- [OWASP File Upload Security](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload)
- [Image File Signatures (Magic Numbers)](https://en.wikipedia.org/wiki/List_of_file_signatures)

**Libraries & Tools:**
- [Multer](https://github.com/expressjs/multer) - Node.js multipart/form-data handling
- [file-type](https://github.com/sindresorhus/file-type) - Detect file type from buffer
- [sharp](https://sharp.pixelplumbing.com/) - High-performance image processing
- [DiceBear API](https://www.dicebear.com/) - Avatar generation service

**Cloud Services:**
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/best-practices.html)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)

---

## 📝 Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-07 | Backend Team | Initial policy document |

---

**For questions or policy updates, contact:** backend-team@chatapp.com  
**Security concerns:** security@chatapp.com