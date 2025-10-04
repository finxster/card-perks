# CardPerks - Credit Card Rewards Discovery Platform

## Overview
CardPerks is a full-stack web application that helps users discover which credit card gives them the best perks, cashback, or rewards for specific stores or categories. Users can register their cards, track perks, share cards with household members, and contribute to a crowdsourced merchant database.

## Project Architecture

### Tech Stack
- **Frontend**: React + Vite + TypeScript
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: React Query + React Context
- **Authentication**: JWT + bcrypt
- **Email**: Cloudflare Worker integration

### Key Features
1. **User Authentication**
   - Email registration with verification
   - JWT-based authentication
   - Email verification via Cloudflare Worker

2. **Card Management**
   - Personal cards with CRUD operations
   - Household-shared cards visible to all family members
   - Credit card network categorization (Visa, Mastercard, Amex, etc.)
   - Visual distinction between personal and household cards

3. **Household Management**
   - Create family households
   - Invite members via email
   - Share cards across household
   - Owner-based permissions

4. **Perks Tracking**
   - Personal perks for individual cards (must be associated with a merchant)
   - Public perks managed by admins
   - All perks require merchant associations
   - Expiration tracking

5. **Merchant Search**
   - Search merchants by name or category
   - Best card recommendations based on user's cards
   - Perk value display

6. **Crowdsourcing**
   - Users can suggest new merchants
   - Users can suggest new perks
   - Admin approval workflow

7. **Admin Dashboard**
   - Manage merchants (CRUD)
   - Review crowdsourced submissions
   - Approve/reject suggestions
   - Create public perks

## Database Schema

### Tables
- **users**: User accounts with authentication
- **households**: Family groups
- **household_members**: Junction table for household membership
- **cards**: Credit cards (personal or household)
- **perks**: Card perks (personal or public)
- **merchants**: Merchant database
- **crowdsourcing**: User submissions for review
- **verification_tokens**: Email verification and invite tokens

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify/:token` - Verify email
- `GET /api/auth/me` - Get current user

### Cards
- `GET /api/cards` - Get user's cards (personal + household)
- `POST /api/cards` - Create new card
- `DELETE /api/cards/:id` - Delete card

### Perks
- `GET /api/perks` - Get user's perks
- `POST /api/perks` - Create new perk (requires merchantId)

### Merchants
- `GET /api/merchants` - Get all merchants
- `GET /api/merchants/search?q=query` - Search merchants


### Household
- `GET /api/household/my` - Get user's household
- `POST /api/household` - Create household
- `GET /api/household/members` - Get household members
- `POST /api/household/invite` - Invite member
- `GET /api/household/accept/:token` - Accept invite

### Crowdsourcing
- `POST /api/crowdsourcing/merchant` - Submit merchant suggestion
- `POST /api/crowdsourcing/perk` - Submit perk suggestion

### Admin (Admin only)
- `GET /api/admin/crowdsourcing` - Get all submissions
- `PATCH /api/admin/crowdsourcing/:id` - Approve/reject submission
- `GET /api/admin/merchants` - Get all merchants
- `POST /api/admin/merchants` - Create merchant
- `DELETE /api/admin/merchants/:id` - Delete merchant

## Design System

### Colors
- **Primary**: Trust blue (220 70% 50%) for CTAs and interactive elements
- **Household Accent**: Purple (280 60% 55%) for household-specific elements
- **Personal Accent**: Green (140 50% 45%) for personal card indicators
- **Background**: Soft white (0 0% 98%) for main canvas
- **Card Surface**: Pure white (0 0% 100%)

### Typography
- **Primary Font**: Inter - UI elements, body text
- **Accent Font**: Sora - Headers, emphasis

### Components
- Card tiles with network branding and ownership indicators
- Responsive search bar for merchant discovery
- Clean admin tables with inline actions
- Beautiful empty states and loading skeletons

## User Roles
1. **Regular User**: Register cards, manage perks, join households
2. **Household Owner**: Create household, invite members
3. **Admin**: Manage merchants, approve crowdsourced content

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `SESSION_SECRET` - Session secret

## Cloudflare Worker Integration
Email endpoints:
- `/email/verify` - Send verification email
- `/email/invite` - Send household invitation
- `/email/reset` - Send password reset (future)

Base URL: `https://cardperks.oieusouofinx.cloudflare.com/email`

## Recent Changes
- **2025-10-04**: Complete MVP implementation with frontend, backend, and database
  - ✅ Full authentication flow with email verification (JWT + bcrypt)
  - ✅ Card management with personal/household distinction
  - ✅ Household creation and secure invitation system
  - ✅ **Security Fix**: Resolved IDOR vulnerability in household invites (email validation enforced)
  - ✅ Merchant search with best card recommendations
  - ✅ Crowdsourcing system with admin moderation workflow
  - ✅ **Feature Added**: Personal perk management - users can now add perks directly to their cards via AddPerkDialog on dashboard
  - ✅ **Schema Update**: Perks now require merchant association (merchantId is NOT NULL)
  - ✅ **UI Enhancement**: AddPerkDialog includes merchant selection dropdown with all available merchants
  - ✅ Protected routes with role-based access control
  - ✅ Dark mode support with fintech-inspired design system
  - ✅ Comprehensive testing: Auth flow and household security validated
  - ✅ Navigation includes Dashboard, Household, Suggest (Crowdsource), and Admin links

## Testing Status
- ✅ **Authentication Flow**: Registration → Email Verification → Login → Dashboard (PASSED)
- ✅ **Household Invitation Security**: Wrong email blocked (403), correct email accepted (PASSED)
- ⚠️ **Email Delivery**: Cloudflare Worker DNS issue (emails not sent, but tokens work via API)
- 📝 **Future**: Card management and merchant search UI tests (pending test env auth fix)

## Known Issues
1. **Email Delivery**: Cloudflare Worker domain not resolving (DNS error) - verification tokens work via direct API calls
2. **Test Environment**: Bcrypt hash generation limitation prevents some UI test scenarios

## Security Enhancements
- Household invitation tokens validated against authenticated user email (case-insensitive)
- Token expiration and consumption enforced
- Duplicate household membership prevented
- JWT tokens properly propagated in all API requests
- Admin-only routes protected with role check
