# Outage Aggregator

A Node.js application for aggregating and managing outage events with MySQL and Redis support.

## Tech Stack

- **Runtime**: Node.js 24.11.1
- **Framework**: Express 5.1.0
- **Database**: MySQL 8
- **Cache**: Redis 7
- **ORM**: Prisma 5.22.0
- **Testing**: Jest, Supertest
- **Web Server**: Nginx 1.27

## Project Structure

```
app/
├── src/
│   ├── handler/        # Request handlers
│   ├── service/        # Business logic
│   ├── repository/     # Database operations
│   ├── middleware/     # Express middleware
│   ├── routes/         # API routes
│   ├── lib/            # Utility libraries (db, redis)
│   ├── tests/          # Test files
│   └── index.js        # Application entry point
├── prisma/
│   ├── schema.prisma   # Prisma schema definition
│   └── migrations/     # Database migrations
├── package.json
├── .env
└── .env.example
```

## Prerequisites

- Docker
- Docker Compose

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd cirrusled
```

### 2. Setup environment variables

```bash
cp app/.env.example app/.env
```

Edit `app/.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# API Configuration
API_TIMEOUT=30000

# Database Configuration
DATABASE_URL=mysql://root:123456@mysql:3306/develop

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 3. Start the application

```bash
docker compose up -d
```

### 4. Install dependencies

```bash
docker compose exec app bash -c 'cd /workspace/app && npm install'
```

### 5. Run database migrations

```bash
docker compose exec app bash -c 'cd /workspace/app && npm run migrate:deploy'
```

## Available Commands

All commands should be run inside the Docker container:

```bash
docker compose exec app bash -c 'cd /workspace/app && <command>'
```

### Application Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start the application |
| `npm run dev` | Start the application with hot reload |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

### Migration Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `npm run migrate:dev` | Create and apply migrations (development) | Development environment |
| `npm run migrate:deploy` | Apply pending migrations (production) | CI/CD, Production |
| `npm run migrate:reset` | Reset database and re-apply all migrations | ⚠️ Destructive - deletes all data |
| `npm run migrate:status` | Check migration status | View applied/pending migrations |

#### Migration Examples

**Create a new migration:**
```bash
docker compose exec app bash -c 'cd /workspace/app && npm run migrate:dev -- --name add_user_table'
```

**Apply migrations in production:**
```bash
docker compose exec app bash -c 'cd /workspace/app && npm run migrate:deploy'
```

**Check migration status:**
```bash
docker compose exec app bash -c 'cd /workspace/app && npm run migrate:status'
```

**Reset database (⚠️ Warning: Deletes all data):**
```bash
docker compose exec app bash -c 'cd /workspace/app && npm run migrate:reset'
```

## Database Schema

### outages_groups

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT | Primary key |
| event_type | VARCHAR(255) | Type of outage event |
| controller_id | VARCHAR(255) | Controller identifier |
| start_time | DATETIME | Outage start time |
| end_time | DATETIME | Outage end time |
| created_at | DATETIME | Record creation timestamp |
| updated_at | DATETIME | Record update timestamp |

**Indexes:**
- `idx_time_event_controller` (start_time, end_time, event_type, controller_id)
- `idx_event_controller` (controller_id, event_type)

### outages_items

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT | Primary key |
| group_id | BIGINT | Foreign key to outages_groups |
| occurrence_time | DATETIME | Time of occurrence |

**Unique Indexes:**
- `idx_group_id_occurrence_time` (group_id, occurrence_time)

## Usage

### Option 1: Manual Rollback
1. Delete the latest migration file from `prisma/migrations/`
2. Run `npm run migrate:reset` to reset the database

### Option 2: Create Reverse Migration
1. Create a new migration that reverses the changes
2. Apply the reverse migration with `npm run migrate:dev`

### Option 3: Full Reset
```bash
docker compose exec app bash -c 'cd /workspace/app && npm run migrate:reset'
```
⚠️ **Warning**: This will delete all data and re-apply all migrations from scratch.

## Testing

Run tests with:

```bash
docker compose exec app bash -c 'cd /workspace/app && npm test'
```
