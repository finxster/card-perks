# CardPerks - Credit Card Rewards Discovery Platform

## Overview

CardPerks is a full-stack web application that helps users discover which credit card provides the best perks, cashback, or rewards for specific stores or categories. Users can register their cards, track and manage perks, share cards with household members, and contribute to a crowdsourced merchant database. The app is designed for both individual and family (household) use, supporting household creation and member invitations.

## Features

- **User Authentication**
  - Email registration with verification (via Cloudflare Worker)
  - JWT-based login and authentication
- **Card Management**
  - Add, view, and delete personal cards
  - Share cards within a household group (family)
  - Distinct display for personal vs. household-shared cards
- **Household Management**
  - Create and manage households
  - Invite members by email
  - Owner-based permissions
- **Perks Management**
  - Track and manage rewards/perks for each card
  - CRUD operations for perks (Create, Read, Update, Delete)
  - Associate perks with merchants and expiration dates
  - Visual indicators for expiring perks
  - Distinction between personal and public perks
- **Merchant Search**
  - Search and browse merchants
  - Suggest new merchants for admin approval (crowdsourcing)
- **Admin Dashboard**
  - Manage public data (merchants, perks)
  - Review and approve crowdsourced submissions
- **User Roles**
  - Regular user: manages cards/perks, joins/creates households
  - Household owner: manages household, invites members
  - Admin: manages public data and crowdsourcing

## Tech Stack

- **Frontend:** React (TypeScript, Vite), modern component library, dark mode support
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **API:** RESTful endpoints for authentication, cards, perks, merchants, households, and admin tasks
- **Auth/Email:** JWT authentication, Cloudflare Worker for email verification
- **Testing:** Comprehensive coverage for auth flow, household security, navigation, card management

## Project Structure

- `/client` — React frontend
- `/server` — Node.js/Express backend
- Database models and migrations for users, cards, perks, merchants, households

## How to Run Locally

### Prerequisites

- Node.js (v16+)
- PostgreSQL (locally or cloud hosted)
- Yarn or npm

### Environment Variables

Create a `.env` file in both `/client` and `/server` directories. Required variables include:

#### For `/server/.env`:
```
DATABASE_URL=postgres://username:password@host:port/dbname
JWT_SECRET=your_jwt_secret
EMAIL_FROM=your_email
CF_WORKER_URL=https://your-cloudflare-worker-url
```

#### For `/client/.env`:
```
VITE_API_URL=http://localhost:3001
```

### Backend Setup

1. Install dependencies:
    ```bash
    cd server
    npm install
    ```
2. Run database migrations:
    ```bash
    npm run migrate
    ```
3. Start the backend server:
    ```bash
    npm run dev
    ```

### Frontend Setup

1. Install dependencies:
    ```bash
    cd client
    npm install
    ```
2. Start the frontend:
    ```bash
    npm run dev
    ```
3. Visit [http://localhost:5173](http://localhost:5173) in your browser.

### Email Verification (Cloudflare Worker)

- Deploy the provided Cloudflare Worker (see `/cloudflare-worker` if present) and update `CF_WORKER_URL` in your `.env`.

### Database

- Make sure PostgreSQL is running and accessible using the credentials in your `.env`.

## API Endpoints

- `POST /api/auth/register` – Register user
- `POST /api/auth/login` – Login user
- `GET /api/auth/verify/:token` – Email verification
- `GET /api/cards` – Get user cards (personal + household)
- `POST /api/cards` – Create card
- `DELETE /api/cards/:id` – Delete card
- `GET /api/perks` – Get user’s perks
- `POST /api/perks` – Create perk (requires merchantId)
- `PATCH /api/perks/:id` – Update perk
- `DELETE /api/perks/:id` – Delete perk
- `GET /api/merchants` – List all merchants
- `GET /api/merchants/search?q=query` – Search merchants

## Testing

- Automated tests cover key flows: authentication, household management, navigation, and card/perk CRUD.

## Security & Roles

- JWT authentication
- Role-based access control (regular user, household owner, admin)
- Ownership validation for sensitive operations (e.g., only a perk’s creator can edit/delete it)

## Contributing

1. Fork the repository
2. Make your changes
3. Open a pull request

---

For more details, see the in-depth documentation in the `replit.md` file and code comments.
