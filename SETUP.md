# Local Development Setup Guide

## Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- Git

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker-compose up -d
```

This starts a PostgreSQL container with:
- Host: `localhost`
- Port: `5432`
- User: `oshi_user`
- Password: `oshi_password`
- Database: `oshi_high_dev`

### 3. Setup Database Schema

```bash
# Generate Prisma client
npx prisma generate

# Create database schema and run migrations
npx prisma db push
```

### 4. Create `.env.local`

The file should already exist (created during setup), but verify:

```bash
# Check if .env.local exists
ls -la .env.local

# If not, copy from example
cp .env.local.example .env.local
```

Verify these values in `.env.local`:
```env
NEXTAUTH_SECRET="dev-secret-key-..."
NEXTAUTH_URL="http://localhost:3000"
DATABASE_URL="postgresql://oshi_user:oshi_password@localhost:5432/oshi_high_dev"
ENABLE_SMS_MOCK="true"
```

### 5. Start Development Server

```bash
npm run dev
```

Server starts at: `http://localhost:3000`

### 6. Test SMS Login

1. Navigate to `http://localhost:3000/login`
2. Enter test phone: `09012345678`
3. Click "確認コードを送信" (Send verification code)
4. Check browser console and server logs for the code
5. Enter the code and click "ログイン" (Login)

**Expected console output:**
```
【開発用】送信先ハッシュ: sha256..., 認証コード: 123456
```

## Database Management

### View Database

```bash
# Open Prisma Studio
npx prisma studio
```

Opens at: `http://localhost:5555`

### Reset Database

```bash
# Delete all data and recreate schema
npx prisma db push --force-reset
```

⚠️ This **deletes all data**. Only use in development.

### Inspect Database Directly

```bash
# Connect via psql (if installed)
psql -h localhost -U oshi_user -d oshi_high_dev

# Password: oshi_password
```

Inside psql:
```sql
\dt                          -- List all tables
SELECT * FROM "User";       -- View users
SELECT * FROM "VerificationToken";  -- View verification codes
```

## Troubleshooting

### Error: "DATABASE_URL not found"

**Solution:** Ensure `.env.local` exists and contains `DATABASE_URL`.

```bash
# Check .env.local
cat .env.local | grep DATABASE_URL
```

### Error: "connect ECONNREFUSED 127.0.0.1:5432"

**Solution:** PostgreSQL container is not running.

```bash
# Start it
docker-compose up -d

# Check status
docker-compose ps
```

### Error: "Prisma Client did not initialize"

**Solution:** Run `npx prisma generate`.

```bash
npx prisma generate
```

### Port 5432 Already in Use

**Solution:** Either stop the other service or change the port in `docker-compose.yml`.

```bash
# Stop existing PostgreSQL
docker-compose down

# Or change port in docker-compose.yml and re-run
docker-compose up -d
```

## Common Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)

# Database
npx prisma generate     # Generate Prisma client
npx prisma db push      # Apply schema changes
npx prisma db pull      # Pull schema from database
npx prisma studio       # Open Prisma Studio GUI
npx prisma migrate dev  # Create and apply migrations

# Docker
docker-compose up -d    # Start services in background
docker-compose down     # Stop services
docker-compose logs -f  # View logs in real-time
docker-compose ps       # Show running services

# Testing
npm run lint            # Run ESLint
npm run build           # Build for production
npm start               # Start production server
```

## Next Steps

- [ ] Complete SMS authentication flow (integrate Twilio/SendGrid for production SMS)
- [ ] Set up OAuth2 credentials for Twitter login
- [ ] Configure GCP Cloud SQL for production
- [ ] Add integration tests
- [ ] Implement Prisma migrations workflow

## Architecture Notes

- **Database**: PostgreSQL (Cloud SQL in production)
- **ORM**: Prisma with PostgreSQL provider
- **Auth**: NextAuth.js v5 with SMS + Twitter OAuth
- **SMS**: Mocked in development (`ENABLE_SMS_MOCK=true`)
- **API**: Next.js API routes (`app/api/`)
