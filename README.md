# DentalCore - API Design & Documentation

This document provides a detailed specification for the DentalCore backend API, including general conventions, user
roles, endpoint definitions, and the database schema.

Sections are marked **✅ Implemented** (describes current behavior) or **🚧 Planned** (target design, not yet built)
so this file stays useful as a running spec instead of drifting from the code.

## General Conventions

- **Base URL**: All API endpoints are prefixed with `/api` (e.g. `http://localhost:3000/api/auth/login`).
- **Authentication**: Protected endpoints require a `Bearer <token>` in the `Authorization` header.
- **Localization** (🚧 Planned): The API will eventually support English (`en`) and Farsi (`fa`) via an
  `Accept-Language` header. Not implemented yet — all current responses are English only, and the header is
  currently ignored.
- **Data Format**: All requests and responses use `application/json`.

## Standard API Response Structure

#### Success Response (🚧 Planned pagination shape)

The `data` / `meta` pagination envelope below is the target shape for list endpoints. It is **not implemented yet** —
the only list endpoint currently live, `GET /users`, returns a plain JSON array with no pagination metadata. Apply
this envelope when pagination is added to `/users` and to future list endpoints (`/categories`, `/items`, etc.).

```json
// Target shape: GET /items?page=1&limit=2
{
  "data": [
    { "id": "...", "name": { "en": "Item A" } },
    { "id": "...", "name": { "en": "Item B" } }
  ],
  "meta": {
    "totalItems": 15,
    "itemCount": 2,
    "itemsPerPage": 2,
    "totalPages": 8,
    "currentPage": 1
  }
}
```

#### Error Response (✅ Implemented, current shape — 🚧 target shape differs)

**Currently implemented:** no custom exception filter exists yet, so errors use Nest's default `HttpException`
format. `message` is a plain string for most thrown exceptions (e.g. `UnauthorizedException('Invalid credentials')`),
or an array of strings for `ValidationPipe` failures. There is no separate `errors` field.

```json
// Current: 401 from AuthService
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

```json
// Current: 400 from ValidationPipe (message is an array, not a separate "errors" field)
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

**Target shape (🚧 Planned):** once the global exception filter is built, responses should normalize to a single
localized `message` string plus a separate `errors` array for field-level validation detail:

```json
// Target: 400 Bad Request
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["email must be an email"],
  "error": "Bad Request"
}
```

## User Roles

| Role          | Description                                                                                    | Status |
|---------------|--------------------------------------------------------------------------------------------------|--------|
| `ADMIN`       | Full access to all endpoints, including user management and system settings.                     | ✅ Enforced today (all `/users` mutation routes) |
| `DENTIST`     | Intended: access to inventory and clinical workflows, can acknowledge alerts, cost data hidden.   | Only currently enforced on `GET /users/:id` (Admin + Dentist); inventory/alerts permissions are 🚧 Planned |
| `RECEPTIONIST`| Default role for new staff accounts. Intended scope (scheduling, front-desk tasks) not yet defined. | Entity default; no endpoints scoped to it yet — 🚧 Planned |
| `ASSISTANT`   | Intended: basic access to inventory consumption and alerts, cost data hidden.                     | 🚧 Planned — no endpoints exist yet |

All four roles exist today in `UserRole` (`src/users/entities/user.entity.ts`). Only `ADMIN` and `DENTIST` are
currently referenced by a `@Roles()` guard anywhere in the code (on the `users` module). Permissions for
`RECEPTIONIST` and `ASSISTANT` will be defined as the relevant modules (inventory, alerts, etc.) are built.

## Authentication (✅ Implemented)

| Method | Endpoint             | Role          | Description                                                       |
|--------|-----------------------|---------------|---------------------------------------------------------------------|
| `POST` | `/auth/login`         | Public        | Authenticates a user, returns `{ accessToken, refreshToken, user }`. |
| `POST` | `/auth/refresh`       | Public*       | Exchanges a valid, non-revoked, non-expired refresh token for a new access token. |
| `POST` | `/auth/logout`        | Authenticated | Revokes the one refresh token supplied in the request body.          |
| `POST` | `/auth/logout-all`    | Authenticated | Revokes every refresh token belonging to the current user.           |

\* `/auth/refresh` has no `JwtAuthGuard` — it's gated purely by possession of a valid, unexpired, unrevoked refresh
token in the request body, not by a Bearer access token.

There is deliberately **no public self-registration endpoint**. The only account-creation path is
`POST /users`, which requires an authenticated Admin. The first Admin account is created out-of-band via a seed
script (`npm run seed:admin`) — see the Auth setup guide.

## API Endpoints

### Users (✅ Implemented)

| Method   | Endpoint     | Role              | Description                                                    |
|----------|--------------|-------------------|-------------------------------------------------------------------|
| `GET`    | `/users`     | Admin             | List all system users. Returns a plain array — no pagination yet. |
| `POST`   | `/users`     | Admin             | Create a new user. Role is chosen by the Admin in the request body. |
| `GET`    | `/users/:id` | Admin, Dentist    | Get a single user by ID.                                            |
| `PATCH`  | `/users/:id` | Admin             | Update an existing user (including changing role or `isActive`).    |
| `DELETE` | `/users/:id` | Admin             | **Permanently deletes** the user row. There is no soft-delete flag on `User` yet — unlike the other resources below, which are designed with `is_deleted` from the start. |

### Categories (✅ Implemented)

| Method   | Endpoint          | Role  | Description                  |
|----------|-------------------|-------|-------------------------------|
| `GET`    | `/categories`     | All   | List inventory categories.    |
| `POST`   | `/categories`     | Admin | Create a new category.         |
| `PATCH`  | `/categories/:id` | Admin | Update an existing category.   |
| `DELETE` | `/categories/:id` | Admin | Soft-delete a category.        |

### Suppliers (✅ Implemented)

| Method   | Endpoint         | Role  | Description                   |
|----------|------------------|-------|---------------------------------|
| `GET`    | `/suppliers`     | All   | List all suppliers.              |
| `POST`   | `/suppliers`     | Admin | Create a new supplier.            |
| `GET`    | `/suppliers/:id` | All   | Get a single supplier by ID.       |
| `PATCH`  | `/suppliers/:id` | Admin | Update an existing supplier.        |
| `DELETE` | `/suppliers/:id` | Admin | Soft-delete a supplier.               |

### Inventory Items (✅ Implemented)

| Method   | Endpoint     | Role  | Description                                            |
|----------|--------------|-------|-----------------------------------------------------------|
| `GET`    | `/items`     | All   | List inventory items with filtering and pagination.          |
| `POST`   | `/items`     | Admin | Create a new item.                                             |
| `GET`    | `/items/:id` | All   | Get a single item, including its associated batches.             |
| `PATCH`  | `/items/:id` | Admin | Update an existing item.                                           |
| `DELETE` | `/items/:id` | Admin | Soft-delete an item.                                                |

### Batches (🚧 Planned — not implemented)

| Method | Endpoint                 | Role | Description                                       |
|--------|---------------------------|------|------------------------------------------------------|
| `GET`  | `/items/:itemId/batches` | All  | List all batches for a specific inventory item.        |
| `GET`  | `/batches/:id`           | All  | Get the details of a single batch by its ID.             |

### Stock Operations (🚧 Planned — not implemented)

| Method | Endpoint              | Role           | Description                                       |
|--------|------------------------|----------------|------------------------------------------------------|
| `POST` | `/stock/receive`      | Admin, Dentist | Receive new stock, creating or updating a batch.         |
| `POST` | `/stock/consume`      | All            | Consume a specified quantity from a batch.                |
| `POST` | `/stock/adjust`       | Admin          | Perform a manual stock count adjustment.                    |
| `POST` | `/stock/return`       | Admin          | Return stock from a batch to a supplier.                      |
| `GET`  | `/stock/transactions` | Admin, Dentist | View the complete history of all stock movements.               |

### Alerts (🚧 Planned — not implemented)

| Method  | Endpoint                  | Role           | Description                                        |
|---------|----------------------------|----------------|-------------------------------------------------------|
| `GET`   | `/alerts`                 | All            | List all currently active (unacknowledged) alerts.        |
| `GET`   | `/alerts/low-stock`       | All            | Filter for low stock alerts only.                            |
| `GET`   | `/alerts/expiring`        | All            | Filter for expiring and expired item alerts.                    |
| `PATCH` | `/alerts/:id/acknowledge` | Admin, Dentist | Mark a specific alert as acknowledged.                             |

## Query Parameters for List Endpoints (🚧 Planned — not implemented)

None of the query parameters below are wired up yet, including on the one live list endpoint (`GET /users`, which
currently ignores query params entirely and returns everything). Apply this table once pagination/filtering is
added.

| Parameter    | Type          | Description                                           | Example                 |
|--------------|---------------|--------------------------------------------------------|--------------------------|
| `page`       | number        | The page number to retrieve (default: 1).                | `?page=2`                 |
| `limit`      | number        | The number of items per page (default: 20, max: 100).      | `?limit=50`                 |
| `search`     | string        | Performs a text-based search on relevant fields.              | `?search=resin`               |
| `categoryId` | uuid          | Filter items by category ID.                                    | `?categoryId=...`               |
| `supplierId` | uuid          | Filter items by supplier ID.                                       | `?supplierId=...`                 |
| `startDate`  | ISO date      | The start of a date range for filtering transactions.                | `?startDate=2026-05-01`             |
| `endDate`    | ISO date      | The end of a date range for filtering transactions.                     | `?endDate=2026-05-11`                 |
| `sortBy`     | string        | The field to sort by (e.g., `createdAt`, `name`).                          | `?sortBy=name`                          |
| `sortOrder`  | `asc`\|`desc` | The direction of the sort (default: `desc`).                                  | `?sortOrder=asc`                          |

## Database Schema

### `users` (✅ Implemented — matches `src/users/entities/user.entity.ts`)

- `id` UUID PK
- `firstName` VARCHAR(100)
- `lastName` VARCHAR(100)
- `email` VARCHAR(255) UNIQUE
- `mobileNumber` VARCHAR(20) UNIQUE
- `password` VARCHAR(255) — bcrypt hash, `select: false` by default (must opt in via query builder)
- `role` ENUM(ADMIN, DENTIST, RECEPTIONIST, ASSISTANT) — default `RECEPTIONIST`
- `isActive` BOOLEAN — default `true`
- `isEmailVerified` BOOLEAN — default `false`
- `isMobileVerified` BOOLEAN — default `false`
- `nationalId` VARCHAR(50) NULLABLE
- `licenseNumber` VARCHAR(100) NULLABLE
- `lastLoginAt` TIMESTAMP NULLABLE
- `createdAt` TIMESTAMP
- `updatedAt` TIMESTAMP

No `is_deleted` column — `DELETE /users/:id` is a hard delete today.

### `refresh_tokens` (✅ Implemented — matches `src/auth/entities/refresh-token.entity.ts`)

- `id` UUID PK
- `token` VARCHAR(500) — SHA-256 hash of the refresh token, never the raw JWT
- `userId` UUID FK(users.id), `onDelete: CASCADE`
- `deviceInfo` VARCHAR(255) NULLABLE — from the `User-Agent` header at login
- `ipAddress` VARCHAR(45) NULLABLE
- `expiresAt` TIMESTAMP
- `isRevoked` BOOLEAN — default `false`
- `createdAt` TIMESTAMP

### The following tables are target schema only (🚧 Planned — no entities exist yet)

`categories`

- `id` UUID PK
- `name` JSONB -- `{"en": "...", "fa": "..."}`
- `description` JSONB
- `parent_id` UUID FK(categories.id) NULLABLE
- `is_deleted` BOOLEAN

`suppliers`

- `id` UUID PK
- `name` VARCHAR(255)
- `contact_name` VARCHAR(255)
- `phone` VARCHAR(50)
- `email` VARCHAR(255)
- `address` TEXT
- `is_deleted` BOOLEAN

`inventory_items`

- `id` UUID PK
- `name` JSONB -- `{"en": "...", "fa": "..."}`
- `sku` VARCHAR(100) UNIQUE
- `category_id` UUID FK(categories.id)
- `supplier_id` UUID FK(suppliers.id) NULLABLE
- `unit` VARCHAR(50)
- `reorder_level` INTEGER
- `cost_per_unit` DECIMAL(12,2)
- `is_deleted` BOOLEAN

`item_batches`

- `id` UUID PK
- `item_id` UUID FK(inventory_items.id)
- `batch_number` VARCHAR(100)
- `quantity` INTEGER
- `expiry_date` DATE NULLABLE
- `received_at` TIMESTAMP

`inventory_transactions`

- `id` UUID PK
- `item_id` UUID FK(inventory_items.id)
- `batch_id` UUID FK(item_batches.id) NULLABLE
- `type` ENUM(RECEIVE, CONSUME, ADJUST, RETURN)
- `quantity` INTEGER -- can be negative
- `reason` TEXT NULLABLE
- `performed_by` UUID FK(users.id)

`alerts`

- `id` UUID PK
- `item_id` UUID FK(inventory_items.id)
- `batch_id` UUID FK(item_batches.id) NULLABLE
- `type` ENUM(LOW_STOCK, EXPIRING, EXPIRED)
- `message` JSONB
- `is_acknowledged` BOOLEAN
- `acknowledged_by` UUID FK(users.id) NULLABLE

`audit_logs`

- `id` UUID PK
- `user_id` UUID FK(users.id) NULLABLE
- `action` VARCHAR(100)
- `entity` VARCHAR(100)
- `entity_id` UUID NULLABLE
- `old_values` JSONB NULLABLE
- `new_values` JSONB NULLABLE
- `ip_address` VARCHAR(45)