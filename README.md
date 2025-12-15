## Inventory & Surplus Management System (MERN)

This repository contains a full‑stack **MERN** application that helps organizations manage their internal inventory, surplus materials, and procurement requests.  
The system is built as a **final‑year project** and demonstrates authentication, authorization with roles, CRUD operations, analytics, and production‑ready deployment.

---

## 1. Business Case & Overview

Many large organizations have unused or surplus materials sitting idle in warehouses while other units buy the same materials again.  
This application provides:

- A **central inventory** of materials per organization
- A **surplus marketplace** where surplus items can be listed and discovered
- **Procurement workflows** for requesting and approving transfers
- **Analytics dashboards** for utilization, surplus trends, and transfer history

The app is multi‑tenant: multiple organizations can onboard to the platform and manage their own users and inventory.

---

## 2. User Roles & Permissions

The system uses role‑based access control on top of JWT authentication.

- **Platform Admin (`PLATFORM_ADMIN`)**
  - Manages the overall platform
  - Can view/manage all organizations and users
- **Organization Admin (`ORG_ADMIN`)**
  - Manages users for their own organization
  - Can configure master data (categories, units, locations)
  - Approves or rejects transfer / procurement requests
- **Organization User (`ORG_USER`)**
  - Manages inventory records for their organization
  - Can create/edit surplus listings and raise procurement requests

Permissions are enforced:

- On the **backend** using middleware in `backend/src/middleware/auth.ts`
- On the **frontend** using protected routes and helper functions in `frontend/src/lib/auth.ts`

---

## 3. Features (>= 6)

- **Authentication & Authorization**
  - Email/password login and signup
  - JWT‑based auth with cookie / header support
  - Role‑based access for routes (admin vs normal user)

- **Inventory Management**
  - Create, read, update, delete (CRUD) inventory materials
  - Track quantity, unit, condition, availability windows, and estimated cost

- **Surplus Listing & Discovery**
  - Mark materials as surplus
  - Browse surplus items across the organization(s)

- **Procurement & Transfer Requests**
  - Raise procurement/transfer requests for surplus items
  - Approve or reject requests (admins)

- **User & Organization Management**
  - Manage organizations and their basic profile
  - Admin UI for managing users and configuration masters

- **Analytics & Dashboards**
  - High‑level analytics view for inventory, surplus, and transfers

- **Notifications & UX**
  - In‑app notifications and alerts for important events
  - Responsive UI using Ant Design (desktop + mobile)

---

## 4. Tech Stack

### 4.1 Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **ORM**: Mongoose
- **Auth**: JWT (`jsonwebtoken`), `bcryptjs` for password hashing
- **Validation**: `express-validator`
- **File / Media support**: `multer`, `cloudinary`, `sharp`, `pdf-parse`, `pdfkit`
- **Other**: `cors`, `cookie-parser`, `morgan`, `dotenv`
- **Language**: TypeScript (compiled with `tsc`)

### 4.2 Frontend

- **UI Library**: React 18 with hooks
- **Router**: `react-router-dom` v6
- **State Management**:
  - Local state via React hooks
  - Server state via **@tanstack/react-query**
  - Auth utilities via `frontend/src/lib/auth.ts` and `storage.ts`
- **UI Components**: Ant Design 5, Ant Design icons
- **Charts**: `recharts`
- **Build Tool**: Vite
- **Styling**: CSS + Ant Design theming, Tailwind (utility classes configured)

### 4.3 Deployment Targets

- **Backend**: Render / Railway (Node + MongoDB)
- **Frontend**: Vercel / Netlify (static build from Vite)

---

## 5. Project Structure

```text
backend/   - Node.js + Express + MongoDB API (TypeScript)
frontend/  - React + Vite SPA client
```

Each folder has its own `package.json` with scripts for development and builds.

---

## 6. Setup & Running Locally

### 6.1 Prerequisites

- Node.js (LTS recommended)
- npm or yarn
- MongoDB instance (local or cloud, e.g. MongoDB Atlas)

### 6.2 Environment Variables

Create a `.env` file inside `backend/` with at least:

```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/isms
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=http://localhost:5173
```

> Adjust `MONGODB_URI` and `CORS_ORIGIN` for production deployments.

### 6.3 Install Dependencies

From the repo root:

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 6.4 Run in Development

**Backend:**

```bash
cd backend
npm run dev
```

This starts the API server on `http://localhost:8000` (by default).

**Frontend:**

```bash
cd frontend
npm run dev
```

Vite will start the React app on `http://localhost:5173`.

---

## 7. API Summary (Selected Endpoints)

Base URL (development):

- **Backend**: `http://localhost:8000/api`

### 7.1 Auth

- `POST /api/auth/signup` – Register a new user (ORG_ADMIN / ORG_USER)
- `POST /api/auth/login` – Login with email & password, returns JWT + user
- `GET  /api/auth/me` – Get current authenticated user
- `POST /api/auth/logout` – Logout current user

### 7.2 Materials / Inventory

- `GET    /api/materials` – List all materials for the current organization
- `GET    /api/materials/:id` – Get a single material
- `POST   /api/materials` – Create a new material
- `PATCH  /api/materials/:id` – Update material details
- `DELETE /api/materials/:id` – Delete a material
- `GET    /api/materials/surplus` – List surplus materials
- `PATCH  /api/materials/:id/mark-surplus` – Mark a material as surplus
- `GET    /api/materials/stats/overview` – Aggregated stats for analytics

### 7.3 Organizations, Users, Transfers, Files, Analytics

Additional route groups:

- `/api/organizations` – Manage organizations (admin)
- `/api/users` – Manage users and roles (platform/org admin)
- `/api/transfers` – Create and manage transfer/procurement requests
- `/api/files` – Upload and manage files (e.g. attachments)
- `/api/analytics` – Platform and organization analytics

> See the route files in `backend/src/routes/*.ts` for full details.

---

## 8. Frontend Features & Navigation

Key pages (defined in `frontend/src/pages` and wired in `App.tsx`):

- `/` – Landing / home
- `/login`, `/signup` – Auth screens
- `/inventory`, `/inventory/new`, `/inventory/:id` – Inventory list & CRUD
- `/surplus` – Browse surplus items
- `/procurement` – Procurement / transfer requests
- `/analytics` – Analytics dashboard
- `/masters` – Configuration / master data (admin only)
- `/users` – User management (admin only)
- `/profile` – User profile
- `/notifications` – Notifications center
- `/unauthorized`, `*` – Error/guard pages

Protected routes are implemented using wrapper components in `App.tsx` (`RequireAuth`, `RequireAdmin`) that check the current user state from `lib/auth.ts`.

---

## 9. ERD & Flowcharts

The documentation diagrams should be stored in a `docs/` folder (add these files to the repo):

- **Entity Relationship Diagram (ERD)** – `docs/erd.png`
- **High‑Level Architecture Diagram** – `docs/architecture.png`
- **Auth / Request Flow** – `docs/request-flow.png`

Example references from the README:

- ERD: ![ERD](docs/erd.png)
- Architecture: ![Architecture](docs/architecture.png)
- Request Flow: ![Request Flow](docs/request-flow.png)

> If the actual filenames differ, update the links accordingly.

---

## 10. Deployment

### 10.1 Backend Deployment (Render / Railway)

General steps (example – adjust for chosen platform):

1. Push this repository to a public GitHub repo.
2. Create a new **Web Service** (Render) or **Service** (Railway) from the `backend/` directory.
3. Set environment variables from section **6.2** (ensure `NODE_ENV=production` and correct `MONGODB_URI`).
4. Set build / start commands:
   - Build: `npm run build`
   - Start: `npm start`
5. Note the deployed backend URL, e.g.:
   - **Backend URL**: `https://your-backend.onrender.com`

Update `frontend/src/lib/api.ts` (or environment variables) to point to the deployed backend base URL.

### 10.2 Frontend Deployment (Vercel / Netlify)

1. Connect the GitHub repo to Vercel or Netlify.
2. Use the `frontend/` subdirectory as the project root.
3. Install dependencies automatically, build command:
   - `npm run build`
4. Set environment variables if needed (e.g. `VITE_API_URL` for the backend).
5. Note the deployed frontend URL, e.g.:
   - **Frontend URL**: `https://your-frontend.netlify.app`

### 10.3 Final Deployed URLs (to be filled after deployment)

- **Frontend (Vercel/Netlify)**: `<add-final-frontend-url-here>`
- **Backend (Render/Railway)**: `<add-final-backend-url-here>`

---

## 11. Submission Checklist

- [ ] Public GitHub repository containing this codebase
- [ ] `README.md` updated with:
  - [ ] Overview and business case
  - [ ] User roles & permissions
  - [ ] Feature list (>= 6)
  - [ ] Tech stack
  - [ ] Setup & run instructions
  - [ ] API summaries
  - [ ] ERD & flowchart images
  - [ ] Final deployed frontend & backend URLs
- [ ] ERD and flow/architecture diagrams committed under `docs/`
- [ ] Backend deployed on Render/Railway and reachable
- [ ] Frontend deployed on Vercel/Netlify and integrated with backend
- [ ] Loom video (5–10 min) explaining architecture, models, and demo
  - [ ] Loom link added at the top of this README

You can now use this README directly for your assignment and only need to update the diagram images and final URLs once deployment is complete.


