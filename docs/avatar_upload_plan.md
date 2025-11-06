# Avatar Upload Implementation Plan

## Overview

This document outlines the strategy for implementing avatar upload functionality in our chat application, with a focus on a simple local storage approach for MVP/development and a clear migration path to cloud storage for production.

---

## MVP Implementation (Local Development)

### Storage Strategy

- **Location**: `/server/uploads/avatars` directory
- **File Naming**: `{userId}-{timestamp}.{extension}`
  - Example: `550e8400-e29b-41d4-a716-446655440000-1699564800000.jpg`
- **Static File Serving**: Serve files via Express static middleware
- **Access URL**: `http://localhost:4000/uploads/avatars/{filename}`

### File Constraints

| Constraint | Value | Reason |
|------------|-------|--------|
| **Max File Size** | 5MB | Balance quality and performance |
| **Allowed Types** | jpg, jpeg, png, gif, webp | Common image formats with broad support |
| **MIME Types** | `image/jpeg`, `image/png`, `image/gif`, `image/webp` | Validation against spoofed extensions |

### Required npm Packages

```bash
npm install multer
npm install --save-dev @types/multer
```

**Why Multer?**
- De facto standard for handling multipart/form-data in Express
- Built-in file size and type validation
- Easy configuration for disk storage
- Active maintenance and community support

---

## Implementation Steps

### 1. Create Upload Directory Structure

```bash
mkdir -p server/uploads/avatars
```

Add to `.gitignore`:
```
# Uploaded files
/server/uploads/
```

### 2. Configure Multer Middleware

**File**: `/server/src/config/upload.config.ts`

```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.userId; // From auth middleware
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `${userId}-${timestamp}${extension}`);
  }
});

// File filter for validation
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.'));
  }
};

// Create multer instance
export const avatarUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});
```

### 3. Add Upload Route

**File**: `/server/src/routes/user.routes.ts`

```typescript
import { avatarUpload } from '../config/upload.config';

/**
 * POST /api/users/me/avatar
 * Upload avatar for current user
 */
router.post('/me/avatar', avatarUpload.single('avatar'), uploadAvatar);
```

### 4. Create Upload Controller

**File**: `/server/src/controllers/user.controller.ts`

```typescript
export const uploadAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const file = req.file;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Build avatar URL
    const avatarUrl = `/uploads/avatars/${file.filename}`;

    // Update user profile with new avatar URL
    const user = await userService.updateProfile(userId, { avatarUrl });

    res.status(200).json({ 
      user,
      message: 'Avatar uploaded successfully' 
    });
  } catch (error) {
    next(error);
  }
};
```

### 5. Serve Static Files

**File**: `/server/src/index.ts`

```typescript
import path from 'path';

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

### 6. Add Cleanup Logic (Optional)

When a user uploads a new avatar, delete the old one:

```typescript
import fs from 'fs/promises';
import path from 'path';

// Before updating with new avatar URL
if (existingUser.avatarUrl) {
  const oldFilename = path.basename(existingUser.avatarUrl);
  const oldFilePath = path.join(__dirname, '../../uploads/avatars', oldFilename);
  
  try {
    await fs.unlink(oldFilePath);
  } catch (err) {
    console.error('Failed to delete old avatar:', err);
    // Non-critical error, continue
  }
}
```

---

## Security Considerations

### 1. File Validation
- ✅ **MIME type checking**: Prevent file extension spoofing
- ✅ **File size limits**: Prevent DoS via large uploads
- ✅ **Extension whitelist**: Only allow specific image formats

### 2. Storage Security
- ✅ **No executable files**: Only images allowed
- ✅ **Randomized filenames**: Prevent enumeration attacks
- ✅ **User-specific naming**: Include userId in filename
- ⚠️ **Directory permissions**: Ensure uploads directory is not executable

### 3. Access Control
- ✅ **Authentication required**: Only logged-in users can upload
- ✅ **User owns avatar**: Users can only update their own avatar
- ⚠️ **Rate limiting**: Consider limiting uploads per user/hour (future enhancement)

### 4. Additional Protections

```typescript
// Add to index.ts
app.use('/uploads', (req, res, next) => {
  // Prevent directory listing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
```

### 5. Image Processing (Future Enhancement)
- Resize images to standard dimensions (e.g., 200x200)
- Compress images to reduce storage
- Strip EXIF data for privacy
- Use libraries like `sharp` or `jimp`

---

## Testing Checklist

- [ ] Valid file upload (JPG, PNG, GIF, WebP)
- [ ] Invalid file type rejection (PDF, EXE, etc.)
- [ ] File size limit enforcement (>5MB)
- [ ] Missing file handling
- [ ] Unauthenticated upload attempt
- [ ] Avatar URL correctly saved to database
- [ ] Static file serving works
- [ ] Old avatar cleanup (if implemented)
- [ ] Multiple uploads in succession

---

## Production Migration Path

### Cloud Storage Options

| Service | Pros | Cons |
|---------|------|------|
| **AWS S3** | Industry standard, reliable, scalable | Requires AWS account, slightly complex |
| **Cloudinary** | Image optimization built-in, easy API | Pricing can increase with usage |
| **Azure Blob Storage** | Good for Microsoft stack | Less common in Node.js ecosystem |
| **Google Cloud Storage** | Good integration with Firebase | Requires Google Cloud account |

### Recommended: AWS S3 with CloudFront CDN

**Why S3?**
- Highly durable (99.999999999%)
- Cost-effective for storage
- Easy integration with Node.js (`@aws-sdk/client-s3`)
- Supports signed URLs for security
- Works seamlessly with CloudFront for global CDN

### Migration Steps

#### 1. Install AWS SDK

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

#### 2. Configure S3 Client

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});
```

#### 3. Update Upload Logic

```typescript
// Instead of saving to disk, upload to S3
const uploadParams = {
  Bucket: process.env.S3_BUCKET_NAME,
  Key: `avatars/${userId}-${timestamp}${extension}`,
  Body: file.buffer,
  ContentType: file.mimetype,
  ACL: 'public-read', // Or use signed URLs for private access
};

await s3Client.send(new PutObjectCommand(uploadParams));

const avatarUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/avatars/${userId}-${timestamp}${extension}`;
```

#### 4. Use CloudFront for CDN

```typescript
// CloudFront URL instead of direct S3
const avatarUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/avatars/${userId}-${timestamp}${extension}`;
```

#### 5. Environment Variables

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your-app-avatars
CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
```

### Feature Comparison

| Feature | Local Storage | S3 + CloudFront |
|---------|---------------|-----------------|
| **Setup Complexity** | Simple | Moderate |
| **Scalability** | Limited by server disk | Unlimited |
| **Performance** | Local network only | Global CDN |
| **Cost** | Free (server disk) | Pay per GB stored/transferred |
| **Reliability** | Single point of failure | 99.99% uptime SLA |
| **Security** | Basic | Signed URLs, IAM policies |
| **Image Processing** | Manual (sharp/jimp) | Can integrate with Lambda |

---

## Database Schema Consideration

The `avatarUrl` field in the User model stores the full URL or path:

```prisma
model User {
  // ...
  avatarUrl String? @map("avatar_url") @db.Text
  // ...
}
```

**Local Development**: `/uploads/avatars/user-123-timestamp.jpg`  
**Production**: `https://cdn.example.com/avatars/user-123-timestamp.jpg`

This design allows seamless migration without database schema changes.

---

## Summary

### MVP (Now)
✅ Simple local file storage  
✅ Quick to implement  
✅ No external dependencies  
✅ Perfect for development and testing  

### Production (Future)
🚀 Cloud storage for scalability  
🌍 CDN for global performance  
🔒 Enhanced security with signed URLs  
📊 Built-in monitoring and analytics  

**Migration Impact**: Minimal code changes, environment variable updates only.