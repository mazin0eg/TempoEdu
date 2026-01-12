# TempoEdu

Educational platform backend built with NestJS, featuring JWT authentication, user profiles with skills and certifications, and MinIO for file storage.

## Features

- **JWT Authentication** - Secure login/register with refresh tokens
- **Dual Database Architecture**
  - PostgreSQL (TypeORM) - Users, profile metadata, skill certifications
  - MongoDB (Mongoose) - User profiles, skills, bio
- **File Storage** - MinIO for avatars and certification documents
- **Skills Management** - Track certified and non-certified skills
- **Certifications** - Link certifications to skills with optional file uploads

## Tech Stack

- **Framework**: NestJS 11
- **Databases**: PostgreSQL + MongoDB
- **ORM/ODM**: TypeORM + Mongoose
- **Auth**: Passport JWT
- **Storage**: MinIO (S3-compatible)
- **Validation**: class-validator + class-transformer

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (recommended)
- Or: PostgreSQL, MongoDB, and MinIO installed locally

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd TempoEdu
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure:

```env
# Server
PORT=3000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=tempoedu
DB_SYNC=true  # Set to false in production

# MongoDB
MONGO_URI=mongodb://localhost:27017/tempoedu

# JWT (Change in production!)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-in-production
JWT_EXPIRES_IN=7d

# Password Hashing
BCRYPT_ROUNDS=10

# MinIO Object Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=tempoedu
MINIO_PUBLIC_HOST=localhost
MINIO_PUBLIC_PORT=9000
```

### 3. Start Services with Docker

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port 5432
- MongoDB on port 27017
- MinIO on ports 9000 (API) and 9001 (Console)

### 4. Run the Application

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod
```

## API Endpoints

### Authentication

#### Register
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "bio": "Software Developer"
}

# Returns: { user: { id, email }, accessToken }
```

#### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

# Returns: { user: { id, email }, accessToken }
```

#### Verify Token
```bash
GET /auth/me
Authorization: Bearer <accessToken>

# Returns: { user: { userId, email } }
```

### Profile Management

#### Get My Profile
```bash
GET /profiles/me
Authorization: Bearer <accessToken>

# Returns: { profile: { userId, name, bio, skills } }
```

#### Upload Avatar
```bash
POST /profiles/me/avatar
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

file: <image-file>

# Returns: { avatar: { url } }
```

### Skills Management

#### Add Skill
```bash
POST /profiles/me/skills
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "NestJS"
}

# Returns: { profile }
```

#### Update All Skills
```bash
PATCH /profiles/me/skills
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "skills": [
    { "name": "NestJS", "certified": true, "certificationId": "uuid" },
    { "name": "TypeScript", "certified": false }
  ]
}

# Returns: { profile }
```

#### Mark Skill as Certified
```bash
PATCH /profiles/me/skills/NestJS/certified
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "certified": true
}

# Returns: { profile }
```

#### Add Certification to Skill
```bash
POST /profiles/me/skills/NestJS/certification
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

issuer: Udemy
issueDate: 2025-10-01
credentialId: ABC-123
file: <certificate.pdf>

# Returns: { certification, profile }
```

## Project Structure

```
src/
├── auth/                 # JWT authentication
│   ├── dto/
│   ├── jwt.strategy.ts
│   ├── auth.service.ts
│   └── auth.controller.ts
├── users/                # User entity (SQL)
│   ├── entities/
│   ├── dto/
│   └── users.service.ts
├── profiles/             # User profiles (MongoDB)
│   ├── schemas/
│   ├── dto/
│   ├── profiles.service.ts
│   └── profiles.controller.ts
├── profile-meta/         # Avatar metadata (SQL)
│   ├── entities/
│   └── profile-meta.service.ts
├── skill-certifications/ # Certifications (SQL + MinIO)
│   ├── entities/
│   ├── dto/
│   └── skill-certifications.service.ts
├── storage/              # MinIO service
│   └── storage.service.ts
└── common/
    └── guards/
        └── jwt-auth.guard.ts
```

## Database Schema

### PostgreSQL (TypeORM)

**users**
- id (uuid, PK)
- email (unique)
- passwordHash
- createdAt

**profile_meta**
- id (uuid, PK)
- userId (unique, FK)
- avatarKey
- avatarUrl
- createdAt, updatedAt

**certifications**
- id (uuid, PK)
- userId (FK)
- skillName
- issuer, issueDate, credentialId
- fileKey, fileUrl (MinIO references)
- createdAt, updatedAt

### MongoDB (Mongoose)

**profiles**
```json
{
  "userId": "uuid",
  "name": "string",
  "bio": "string",
  "skills": [
    {
      "name": "string",
      "certified": "boolean",
      "certificationId": "uuid | null"
    }
  ]
}
```

## MinIO Configuration

Access MinIO Console at http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin`

Bucket `tempoedu` is auto-created on first upload.

File structure:
```
tempoedu/
├── avatars/{userId}/{uuid}.ext
└── skill-certifications/{userId}/{skillName}/{uuid}.ext
```

## Development

```bash
# Watch mode
npm run start:dev

# Run tests
npm run test
npm run test:e2e
npm run test:cov

# Lint & format
npm run lint
npm run format
```

## Production Deployment

1. **Update .env**
   - Set strong `JWT_SECRET` (32+ chars)
   - Set `DB_SYNC=false`
   - Configure production database URLs
   - Set `MINIO_USE_SSL=true` for HTTPS

2. **Build**
   ```bash
   npm run build
   ```

3. **Run**
   ```bash
   npm run start:prod
   ```

4. **Migrate Database**
   - Generate migrations: `npm run migration:generate`
   - Run migrations: `npm run migration:run`

## Security Notes

- Change `JWT_SECRET` in production (use 32+ character random string)
- Never commit `.env` file
- Use HTTPS in production
- Set `DB_SYNC=false` in production
- Configure CORS appropriately
- Use strong database passwords
- Keep dependencies updated

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
