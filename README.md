# DentalCore - API Design & Documentation

This document provides a detailed specification for the DentalCore backend API, including general conventions, user
roles, endpoint definitions, and the database schema.

## General Conventions

- **Base URL**: All API endpoints are prefixed with `/api/v1`.
- **Authentication**: All protected endpoints require a `Bearer <token>` in the `Authorization` header.
- **Localization**: The API supports English (`en`) and Farsi (`fa`). To receive localized responses for error messages
  and certain data fields, provide the `Accept-Language` header (e.g., `Accept-Language: fa`). The default is `en`.
- **Data Format**: All requests and responses use the `application/json` format.

## Standard API Response Structure

#### Success Response

Successful `GET`, `POST`, and `PATCH` requests will return a `2xx` status code with a JSON body. List endpoints include
pagination metadata.

```json
// Example: GET /items?page=1&limit=2
{
  "data": [
    {
      "id": "...",
      "name": {
        "en": "Item A"
      }
    },
    {
      "id": "...",
      "name": {
        "en": "Item B"
      }
    }
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

#### Error Response

Failed requests (`4xx`, `5xx`) will return a standardized error object. The `message` field is localized based on the
`Accept-Language` header.

```json
// Example: 400 Bad Request
{
  "statusCode": 400,
  "message": "Validation failed",
  // This message will be in English or Farsi
  "errors": [
    "email must be an email"
  ],
  "error": "Bad Request"
}
```

## User Roles

| Role        | Description                                                                              |
|-------------|------------------------------------------------------------------------------------------|
| `ADMIN`     | Full access to all endpoints, including cost data, user management, and system settings. |
| `DENTIST`   | Access to inventory and clinical workflows. Cost data is hidden. Can acknowledge alerts. |
| `ASSISTANT` | Basic access to inventory consumption and alerts. Cost data is hidden.                   |

## Authentication

| Method | Endpoint        | Role          | Description                                                      |
|--------|-----------------|---------------|------------------------------------------------------------------|
| `POST` | `/auth/login`   | Public        | Authenticates a user and returns a JWT access and refresh token. |
| `POST` | `/auth/refresh` | Authenticated | Uses a valid refresh token to issue a new access token.          |

## API Endpoints

### Users

| Method   | Endpoint     | Role  | Description              |
|----------|--------------|-------|--------------------------|
| `GET`    | `/users`     | Admin | List all system users.   |
| `POST`   | `/users`     | Admin | Create a new user.       |
| `PATCH`  | `/users/:id` | Admin | Update an existing user. |
| `DELETE` | `/users/:id` | Admin | Soft-delete a user.      |

### Categories

| Method   | Endpoint          | Role  | Description                  |
|----------|-------------------|-------|------------------------------|
| `GET`    | `/categories`     | All   | List inventory categories.   |
| `POST`   | `/categories`     | Admin | Create a new category.       |
| `PATCH`  | `/categories/:id` | Admin | Update an existing category. |
| `DELETE` | `/categories/:id` | Admin | Soft-delete a category.      |

### Suppliers

| Method   | Endpoint         | Role  | Description                  |
|----------|------------------|-------|------------------------------|
| `GET`    | `/suppliers`     | All   | List all suppliers.          |
| `POST`   | `/suppliers`     | Admin | Create a new supplier.       |
| `GET`    | `/suppliers/:id` | All   | Get a single supplier by ID. |
| `PATCH`  | `/suppliers/:id` | Admin | Update an existing supplier. |
| `DELETE` | `/suppliers/:id` | Admin | Soft-delete a supplier.      |

### Inventory Items

| Method   | Endpoint     | Role  | Description                                          |
|----------|--------------|-------|------------------------------------------------------|
| `GET`    | `/items`     | All   | List inventory items with filtering and pagination.  |
| `POST`   | `/items`     | Admin | Create a new item.                                   |
| `GET`    | `/items/:id` | All   | Get a single item, including its associated batches. |
| `PATCH`  | `/items/:id` | Admin | Update an existing item.                             |
| `DELETE` | `/items/:id` | Admin | Soft-delete an item.                                 |

### Batches

| Method | Endpoint                 | Role | Description                                     |
|--------|--------------------------|------|-------------------------------------------------|
| `GET`  | `/items/:itemId/batches` | All  | List all batches for a specific inventory item. |
| `GET`  | `/batches/:id`           | All  | Get the details of a single batch by its ID.    |

### Stock Operations

| Method | Endpoint              | Role           | Description                                       |
|--------|-----------------------|----------------|---------------------------------------------------|
| `POST` | `/stock/receive`      | Admin, Dentist | Receive new stock, creating or updating a batch.  |
| `POST` | `/stock/consume`      | All            | Consume a specified quantity from a batch.        |
| `POST` | `/stock/adjust`       | Admin          | Perform a manual stock count adjustment.          |
| `POST` | `/stock/return`       | Admin          | Return stock from a batch to a supplier.          |
| `GET`  | `/stock/transactions` | Admin, Dentist | View the complete history of all stock movements. |

### Alerts

| Method  | Endpoint                  | Role           | Description                                        |
|---------|---------------------------|----------------|----------------------------------------------------|
| `GET`   | `/alerts`                 | All            | List all currently active (unacknowledged) alerts. |
| `GET`   | `/alerts/low-stock`       | All            | Filter for low stock alerts only.                  |
| `GET`   | `/alerts/expiring`        | All            | Filter for expiring and expired item alerts.       |
| `PATCH` | `/alerts/:id/acknowledge` | Admin, Dentist | Mark a specific alert as acknowledged.             |

## Query Parameters for List Endpoints

List endpoints (`GET /users`, `GET /items`, etc.) support the following query parameters for filtering, sorting, and
pagination.

| Parameter    | Type          | Description                                           | Example                 |
|--------------|---------------|-------------------------------------------------------|-------------------------|
| `page`       | number        | The page number to retrieve (default: 1).             | `?page=2`               |
| `limit`      | number        | The number of items per page (default: 20, max: 100). | `?limit=50`             |
| `search`     | string        | Performs a text-based search on relevant fields.      | `?search=resin`         |
| `categoryId` | uuid          | Filter items by category ID.                          | `?categoryId=...`       |
| `supplierId` | uuid          | Filter items by supplier ID.                          | `?supplierId=...`       |
| `startDate`  | ISO date      | The start of a date range for filtering transactions. | `?startDate=2026-05-01` |
| `endDate`    | ISO date      | The end of a date range for filtering transactions.   | `?endDate=2026-05-11`   |
| `sortBy`     | string        | The field to sort by (e.g., `createdAt`, `name`).     | `?sortBy=name`          |
| `sortOrder`  | `asc`\|`desc` | The direction of the sort (default: `desc`).          | `?sortOrder=asc`        |

## Database Schema

Below is a simplified representation of the core database tables.

`users`

- `id` UUID PK
- `email` VARCHAR(255) UNIQUE
- `password_hash` VARCHAR(255)
- `full_name` VARCHAR(255)
- `role` ENUM(ADMIN, DENTIST, ASSISTANT)
- `is_active` BOOLEAN

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
- `ip_address` VARCHAR(45) """,""" # DentalCore — Dental Clinic Inventory Management

This repository contains the backend API for the DentalCore inventory and procurement management system. The API is
built with a modern, scalable, and type-safe tech stack designed for reliability and ease of development.

## Tech Stack

| Component | Technology                   |
|-----------|------------------------------|
| Runtime   | Node.js 20 LTS               |
| Language  | TypeScript 5.x               |
| Framework | NestJS 10                    |
| Database  | PostgreSQL 16                |
| ORM       | Prisma 5                     |
| Auth      | Passport + JWT               |
| i18n      | nestjs-i18n (English, Farsi) |
| API Docs  | Swagger (@nestjs/swagger)    |
| Testing   | Vitest + Supertest           |
| Container | Docker + Docker Compose      |

## Documentation

For detailed information on API endpoints, request/response models, and the database schema, please see
the [API Design & Documentation](API_DESIGN.md) file.

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js `v20.x` or later
- `npm` or a compatible package manager

### 1. Initial Setup

Clone the repository and configure your local environment.

```bash
# Clone the project
git clone <your-repo-url>
cd dentalcore-backend
```

# Create the environment file from the example

cp .env.example .env
Now, open the `.env` file and update the `DATABASE_URL` and `JWT_SECRET` with your own credentials.

### 2. Launch Services

Start the PostgreSQL database and the application using Docker Compose.

```bash
docker compose up -d
```

### 3. Prepare the Database

With the services running, install dependencies and apply database migrations and seed data.

```bash

# Install dependencies

npm install

# Apply database schema changes

npx prisma migrate dev

# Seed the database with initial data (e.g., admin user)

npx prisma db seed
```

### 4. Run the Application

Start the NestJS development server.

```bash
npm run start:dev
The application is now running and accessible:

- **API Base URL:** `http://localhost:3000/api/v1`
- **Swagger Docs:** `http://localhost:3000/api/docs`
```

## API Documentation

For a complete specification of all API endpoints, request/response models, user roles, and the database schema, please
see the **[API Design & Documentation](API_DESIGN.md)** file.

## Environment Variables

| Variable                 | Description                                       |
|--------------------------|---------------------------------------------------|
| `DATABASE_URL`           | Connection string for the PostgreSQL database.    |
| `JWT_SECRET`             | A long, random, secret string for signing JWTs.   |
| `JWT_EXPIRES_IN`         | Expiration time for access tokens (e.g., `1h`).   |
| `JWT_REFRESH_EXPIRES_IN` | Expiration time for refresh tokens (e.g., `7d`).  |
| `DEFAULT_LOCALE`         | The default language for i18n (`en`).             |
| `FALLBACK_LOCALE`        | The fallback language if a key is missing (`en`). |

## Project Structure

The project is organized as a monorepo with a modular, feature-driven backend architecture.

### 1. Monorepo Overview

The top-level directory separates the backend and frontend applications.

```text
/dentalcore/
├── backend/       <-- NestJS API (detailed below)
├── frontend/      <-- Client application (React, Vue, etc.)
├── .git/
└── .gitignore
```

### 2. Backend Directory (`/backend`)

This is the high-level layout of the backend service, containing configuration, database assets, tests, and source code.

```text
/backend/
├── .env                  # Local environment variables (ignored by git)
├── .env.example          # Template for environment variables
├── .eslintrc.js          # ESLint configuration
├── .prettierrc           # Prettier code formatting rules
├── docker-compose.yml    # Defines services (app, db) for local development
├── Dockerfile            # Instructions to build the production application image
├── nest-cli.json         # NestJS CLI configuration
├── package.json          # Project dependencies and scripts
├── prisma/               # All Prisma-related files
│   ├── migrations/       # Auto-generated SQL migration files
│   ├── schema.prisma     # The single source of truth for your database schema
│   └── seed.ts           # Script for seeding the database with initial data
├── src/                  # Application source code (detailed below)
├── test/                 # Test files
└── tsconfig.json         # TypeScript compiler configuration
```

### 3. Source Code (`/src`)

The `src` directory contains the application's core logic, organized into modules by feature.

```text
/src/
├── main.ts             # Application entry point
├── app.module.ts       # Root application module
├── common/             # Shared utilities (guards, decorators, filters)
├── i18n/               # Language translation files (en, fa)
├── auth/               # Authentication module (login, refresh)
├── users/              # User management module
├── categories/         # Inventory category module
├── suppliers/          # Supplier management module
├── inventory/          # Core inventory logic, composed of sub-modules
│   ├── items/
│   ├── batches/
│   └── stock/
├── alerts/             # Alerting and notification module
└── audit/              # Audit logging module
```

## Available Scripts

| Script                   | Description                                       |
|--------------------------|---------------------------------------------------|
| `npm run start:dev`      | Starts the development server with hot-reloading. |
| `npm run build`          | Compiles the TypeScript source to JavaScript.     |
| `npm run start:prod`     | Runs the production build of the application.     |
| `npm run test`           | Executes unit and integration tests with Vitest.  |
| `npm run lint`           | Lints the codebase using ESLint.                  |
| `npx prisma migrate dev` | Creates and applies a new database migration.     |
| `npx prisma studio`      | Opens a web-based GUI for viewing the database.   |

## Contributing

Contributions are welcome. Please follow these general steps:

1. Create a feature branch from `main` (e.g., `git checkout -b feature/add-new-widget`).
2. Make your changes and commit them with clear, descriptive messages.
3. Ensure all tests pass (`npm run test`).
4. Open a Pull Request for review.

## License

Proprietary