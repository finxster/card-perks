# CardPerks - Credit Card Rewards Discovery Platform

## Overview

CardPerks is a full-stack web application that helps users discover which credit c- `DELETE /api/cards/:id` – Delete card
- `GET /api/perks` – Get user's perks
- `POST /api/perks` – Create perk (requires merchantId)
- `PATCH /api/perks/:id` – Update perk
- `DELETE /api/perks/:id` – Delete perk
- `GET /api/merchants` – List all merchants
- `GET /api/merchants/search?q=query` – Search merchants

### OCR API Endpoints

- `POST /api/ocr/upload` – Upload images for OCR processing (multipart/form-data)
- `GET /api/ocr/draft` – Get user's draft perks for review
- `PATCH /api/ocr/draft/:id` – Update a draft perk
- `DELETE /api/ocr/draft/:id` – Delete a draft perk
- `POST /api/ocr/confirm` – Confirm and save selected draft perks
- `POST /api/ocr/cleanup` – Admin endpoint to clean up expired images

## OCR Feature Setup

The OCR feature uses Tesseract.js for text extraction and optionally Cloudflare R2 for image storage.

### Required Dependencies

```bash
npm install multer @types/multer tesseract.js @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Environment Variables (Optional)

For image storage functionality, configure Cloudflare R2:

```bash
CLOUDFLARE_ACCOUNT_ID="your_account_id"
CLOUDFLARE_R2_ACCESS_KEY_ID="your_access_key"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your_secret_key"
CLOUDFLARE_R2_BUCKET_NAME="cardperks-ocr-images"
CLOUDFLARE_R2_PUBLIC_URL="https://pub-YOUR_ACCOUNT_ID.r2.dev"
```

**Note:** If R2 is not configured, the OCR feature will still work but without image storage/preview functionality.

### Usage

1. Navigate to "Upload Offers" in the app
2. Select up to 5 image files (JPG, PNG, GIF, WebP)
3. Upload and wait for OCR processing
4. Review and edit extracted perks
5. Select which perks to save and confirm

The system automatically:
- Extracts text using OCR
- Parses common credit card offer patterns with **improved multi-line parsing**
- Identifies merchants, values, and expiration dates across multiple lines
- Creates draft perks for review
- Stores images temporarily (7-day expiration)

### Supported Offer Patterns

The OCR parser recognizes various credit card offer formats:

- **Spend/Earn**: "Spend $80 or more, earn $15 back"
- **Percentage Back**: "Earn 20% back on a single purchase, up to $8"
- **Multi-use Offers**: "Spend $10.99, earn $10.99 back, up to 2 times"
- **Specific Merchant**: "Spend $98 on Walmart+ Annual Membership, earn $49 back"
- **Statement Credits**: "Get $25 statement credit"
- **Points/Miles**: "Earn 5x points on travel purchases"

The parser uses **block-based parsing** to handle multi-line offers where the merchant name, description, offer value, and expiration date may be on separate lines - common in mobile app screenshots.

## Testingdes the best perks, cashback, or rewards for specific stores or categories. Users can register their cards, track and manage perks, share cards with household members, and contribute to a crowdsourced merchant database. The app is designed for both individual and family (household) use, supporting household creation and member invitations.

## Features

- **User Authentication**
  - Email registration with verification (via Cloudflare Worker)
  - JWT-based login and authentication
- **Card Management**
  - Add, view, and delete personal cards
  - Share cards within a household group (family)
  - Distinct display for personal vs. household-shared cards
- **OCR Perk Extraction** ✨ **NEW**
  - Upload screenshots of credit card offers (Chase Offers, Amex Offers, etc.)
  - Automatic text extraction using OCR (Tesseract.js)
  - Smart parsing to identify perks, merchants, values, and expiration dates
  - Review and edit extracted perks before saving
  - Temporary image storage with automatic cleanup (7-day expiration)
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

## Quick Start

From the project root:

### Backend (API server)

1. Install all dependencies:
    ```bash
    npm install
    ```
2. Start the backend server:
    ```bash
    npm run dev
    ```

### Frontend (Vite client)

1. In a new terminal, from the project root, run:
    ```bash
    npx vite
    ```
2. Open [http://127.0.0.1:5173](http://127.0.0.1:5173) in your browser.

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
