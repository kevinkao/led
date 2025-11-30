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

## System Architecture & Design Decisions

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    External Controllers                     │
│            (5000+ controllers, +10% monthly growth)         │
└───────────────────────┬─────────────────────────────────────┘
                        │ POST /api/v1/data-process
                        │ (Every 10 minutes when outage persists)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express Application                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Handler Layer (HTTP Request/Response)                 │ │
│  │   - dataProcess.handler.js                             │ │
│  │   - outageQuery.handler.js                             │ │
│  └──────────────┬──────────────────┬──────────────────────┘ │
│                 │                  │                        │
│  ┌──────────────▼──────────────────▼──────────────────────┐ │
│  │  Service Layer (Business Logic)                        │ │
│  │   - dataProcess.service.js (Event aggregation)         │ │
│  │   - outageQuery.service.js (Query logic)               │ │
│  └──────────────┬──────────────────┬──────────────────────┘ │
│                 │                  │                        │
│  ┌──────────────▼──────────────────▼──────────────────────┐ │
│  │  Repository Layer (Data Access)                        │ │
│  │   - outageGroup.repository.js (Prisma + Raw SQL)       │ │
│  │   - outageItem.repository.js                           │ │
│  └──────────────┬──────────────────┬──────────────────────┘ │
└─────────────────┼──────────────────┼────────────────────────┘
                  │                  │
        ┌─────────▼────────┐  ┌─────▼──────┐
        │   Redis Cache    │  │   MySQL 8  │
        │  (Hot Groups)    │  │ (Persistent)│
        │   - 1hr TTL      │  │  - Groups  │
        │                  │  │  - Items   │
        └──────────────────┘  └────────────┘
```

### Core Components

#### 1. **API Layer (Express + Middleware)**
- **Routes**: RESTful API endpoints for event processing and querying
- **Middleware**: Request validation, error handling, and logging
- **Handler**: Processes HTTP requests and delegates to service layer

#### 2. **Service Layer**
- **dataProcess.service.js**: Core aggregation logic
  - 3-tier lookup strategy (Redis → Database → Create New)
  - Time-based grouping with 60-minute window
  - Cache management for active groups

- **outageQuery.service.js**: Query optimization
  - Time range filtering with overlap detection
  - Optional controller filtering
  - Pagination support

#### 3. **Repository Layer**
- **Dual approach**: Prisma ORM for simple queries, Raw SQL for complex operations
- **Atomic operations**: Database transactions ensure data consistency
- **Optimized queries**: Leverages indexed columns for fast lookups

#### 4. **Caching Layer (Redis)**
- **Purpose**: Reduce database load for frequently accessed active groups
- **Strategy**: Cache-aside pattern with 1-hour TTL
- **Key pattern**: `outage_group:{controller_id}:{event_type}`
- **Scope**: Only stores groups actively receiving events

#### 5. **Data Layer (MySQL)**
- **Schema design**:
  - `outages_groups`: Aggregated events with start_time and end_time
  - `outages_items`: Individual event occurrences linked to groups
- **Indexing**: Composite indexes optimized for time-range and filter queries

---

### Detailed Design Decisions

#### **1. Aggregation Strategy (60-Minute Window)**

**Decision**: Events are grouped together if the time gap between any event and the group's time range is ≤ 60 minutes.

**Implementation** (dataProcess.service.js:66-77):
```javascript
const isEventInTimeRange = (group, timestamp) => {
  const sixtyMinutesInMs = 60 * 60 * 1000;
  const rangeStart = startTime - sixtyMinutesInMs;
  const rangeEnd = endTime + sixtyMinutesInMs;
  return eventTime >= rangeStart && eventTime <= rangeEnd;
};
```

**Example**:
- Events at 10:00, 10:10, 10:20, 10:40, 11:00, 11:40, 12:00 → **Single group**
- Events at 10:00 and 11:30 → **Two separate groups** (gap > 60 minutes)

**Rationale**:
- Controllers report every 10 minutes when an outage persists

---

#### **2. 3-Tier Lookup Strategy**

**Decision**: Check Redis → Database → Create New Group (in sequential order)

**Flow** (dataProcess.service.js:172-208):
```
Incoming Event
      ↓
1. Check Redis cache for active group
   ├─ Cache Hit + In time range? → Add to cached group ✓
   └─ Cache Miss or Out of range? → Continue to step 2
      ↓
2. Query database for matching group
   ├─ Found + In time range? → Add to DB group ✓
   └─ No match? → Continue to step 3
      ↓
3. Create new group
   └─ Insert group + first item + cache new group ✓
```

**Performance Impact**:
- **Step 1 (Redis)**: handles 80%+ of events (ongoing outages)
- **Step 2 (Database)**: handles edge cases (cache expired, cold start)
- **Step 3 (Create)**: handles only new outages (~5% of events)

**Rationale**:
- **Redis first**: Most events (80%+) belong to ongoing outages (hot data in cache)
- **Database fallback**: Ensures correctness when cache expires or server restarts
- **Create last**: Only when genuinely new outage starts
- **Overall**: Reduces database queries by 80% under normal operating conditions

---

#### **3. Database Indexing Strategy**

**Indexes** (prisma/schema.prisma:22-23):
```sql
CREATE INDEX idx_time_event_controller
  ON outages_groups(start_time, end_time, event_type, controller_id);

CREATE INDEX idx_event_controller
  ON outages_groups(controller_id, event_type);
```

**Index Usage**:

**Index 1 - Query API** (used by GET /api/v1/outages/groups):
```sql
SELECT * FROM outages_groups
WHERE start_time <= ? AND end_time >= ?    -- Time range overlap
  AND event_type = ?                       -- Required filter
  AND controller_id = ?                    -- Optional filter
ORDER BY start_time DESC;
```

**Index 2 - Event Processing** (used by POST /api/v1/data-process):
```sql
SELECT * FROM outages_groups
WHERE controller_id = ?                    -- Lookup key
  AND event_type = ?                       -- Lookup key
  AND start_time <= ? AND end_time >= ?    -- Time range check
ORDER BY end_time DESC LIMIT 1;
```

**Rationale**:
- **Compound index design**: Places most selective columns first
- **Query API optimization**: `idx_time_event_controller` supports time-range queries with filters
- **Event processing optimization**: `idx_event_controller` enables fast lookup during real-time processing

---

#### **4. Cache TTL = 1 Hour**

**Decision**: Redis cache entries expire after 3600 seconds (1 hour)

**Implementation** (dataProcess.service.js:48):
```javascript
const setCachedGroup = async (controllerId, eventType, group, ttl = 3600) => {
  await redis.setEx(cacheKey, ttl, JSON.stringify(group));
};
```

**Cache Lifecycle Example**:
```
10:00 - New outage starts → Group created, cached with 1hr TTL
10:10 - Event arrives → Cache hit, group updated
10:20 - Event arrives → Cache hit, group updated
...
11:00 - Cache expires → Next event goes to database lookup
11:01 - Outage resolved → No more events, group stays in database only
```

**Rationale**:
- **Aligns with aggregation window**: Groups inactive for >60 minutes won't receive new events
- **Automatic cleanup**: Stale data evicted without manual intervention
- **Balance**: Long enough to capture ongoing outages, short enough to prevent stale data

---

### Assumptions Made

1. Events may arrive out-of-order due to network conditions, but never >60 minutes late
2. Occasional event loss is acceptable (doesn't affect grouping logic)
3. Same controller won't send duplicate timestamps for the same event type
4. Expected 80%+ Redis hit rate (ongoing outages are frequently queried)

