# Outage Aggregator

## Structure

```
app/
├── src/
│   ├── handler/
│   ├── service/
│   ├── repository/
│   ├── middleware/
│   ├── routes/
│   ├── index.js
│   └── tests
├── package.json
├── package-lock.json
├── .env
└── .env.example
```

## Key libraries

- Express
- dotenv
- jest
- supertest
- prisma

## Rules

1. Use TDD approach first, then write the code.
2. Never predict the constants, functions has already been defined.
3. When writing tests, understand the previous tests first, follow the pattern of the previous tests.
4. Test flow: Arrange, Act, Assert.
5. Understand the target function you want to test thoroughly, then write the test. DO NOT DREAM UP THE FUNCTION LOGIC.
6. Always consider the maintainability of the code. Do not write code that is difficult to maintain.

## How to run

1. Everything runs in container.
```bash
docker compose exec app bash -c '{command}'
```

2. Run tests:
```bash
docker compose exec app bash -c 'cd /workspace/app && npm test'
```

## Schema

```SQL
CREATE TABLE IF NOT EXISTS outages_groups (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(255) NOT NULL,
  controller_id VARCHAR(255) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  INDEX idx_time_event_controller (start_time, end_time, event_type, controller_id),
  INDEX idx_event_controller (controller_id, event_type)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS outages_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  group_id BIGINT NOT NULL,
  occurrence_time DATETIME NOT NULL,
  INDEX idx_group_id (group_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
```