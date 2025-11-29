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

## API Documentation

### 1. Process Outage Event

Process and aggregate outage event data. Events are automatically grouped if they occur within 60 minutes of the previous event.

**Endpoint:** `POST /api/v1/data-process`

**Request Body:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `controller_id` | string | Yes | Controller identifier | Non-empty string |
| `event_type` | string | Yes | Type of outage event | One of: `panel_outage`, `temperature_outage`, `led_outage` |
| `timestamp` | number | Yes | Event occurrence time | Unix timestamp (seconds) |

**Success Response:**

```json
{
  "success": true,
  "message": "Event processed successfully",
  "data": {
    "success": true,
    "action": "created_new_group",
    "group_id": "123"
  }
}
```

**Response Fields:**
- `action`: One of `created_new_group`, `added_to_cached_group`, or `added_to_db_group`
- `group_id`: The ID of the outage group (string)

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/data-process \
  -H "Content-Type: application/json" \
  -d '{
    "controller_id": "CTRL001",
    "event_type": "panel_outage",
    "timestamp": 1735603200
  }'
```

### 2. Query Outage Groups

Retrieve outage groups with filtering and pagination support.

**Endpoint:** `GET /api/v1/outages/groups`

**Query Parameters:**

| Field | Type | Required | Description | Validation | Default |
|-------|------|----------|-------------|------------|---------|
| `outage_type` | string | Yes | Type of outage event | One of: `panel_outage`, `temperature_outage`, `led_outage` | - |
| `start_time` | number | Yes | Query start time | Unix timestamp (seconds) | - |
| `end_time` | number | Yes | Query end time | Unix timestamp (seconds), must be >= `start_time` | - |
| `controller_id` | string | No | Filter by controller ID | Non-empty string | - |
| `offset` | number | No | Pagination offset | Non-negative integer | 0 |
| `limit` | number | No | Number of records to return | Positive integer | 20 |

**Success Response:**

```json
{
  "data": [
    {
      "id": 123,
      "outage_type": "panel_outage",
      "controller_id": "CTRL001",
      "start_time": "1735603200",
      "end_time": "1735603500"
    },
    {
      "id": 124,
      "outage_type": "panel_outage",
      "controller_id": "CTRL001",
      "start_time": "1735610000",
      "end_time": "1735610300"
    }
  ],
  "pagination": {
    "total": 50,
    "offset": 0,
    "limit": 20
  }
}
```

**Example Requests:**

Basic query:
```bash
curl -X GET "http://localhost:3000/api/v1/outages/groups?outage_type=panel_outage&start_time=1735603200&end_time=1735689600"
```

With controller filter and pagination:
```bash
curl -X GET "http://localhost:3000/api/v1/outages/groups?outage_type=panel_outage&controller_id=CTRL001&start_time=1735603200&end_time=1735689600&offset=20&limit=10"
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
