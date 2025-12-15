## Inventory & Surplus Management System (ISMS)

Live demo (frontend): [`https://isms-app.netlify.app`](https://isms-app.netlify.app)  
Backend API: [`https://route-isms-deploy-production.up.railway.app`](https://route-isms-deploy-production.up.railway.app)

This repository contains a full‑stack **MERN** application that helps organizations manage their internal inventory, surplus materials, and procurement requests.  
The system is built as a **final‑year project** and demonstrates authentication, authorization with roles, CRUD operations, analytics, and production‑ready deployment.

---

## 1. Business Case & Overview

Many large organizations have unused or surplus materials sitting idle in warehouses while other units buy the same materials again.  
This is common in **large enterprises with multiple plants and departments**, **hospitals and healthcare networks** (wards, labs, diagnostic centres), **construction and infrastructure companies**, and **educational institutions / universities** with many campuses or colleges.

This application provides:

- A **central inventory** of materials per organization (and per plant / hospital / department / campus)
- A **surplus marketplace** where surplus items can be listed and discovered across units
- **Procurement workflows** for requesting and approving transfers between plants, departments, hospitals, or campuses
- **Analytics dashboards** for utilization, surplus trends, and transfer history

The app is multi‑tenant: multiple organizations (enterprises, hospital groups, construction companies, universities, etc.) can onboard to the platform and manage their own users and inventory.

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

- **Backend**: Railway (Node + MongoDB)
- **Frontend**: Netlify (static build from Vite)

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

The documentation diagrams are stored in the `assets/` folder:

- **Entity Relationship Diagram (ERD)** – `assets/ERD-chart.png`
- **High‑Level Architecture Diagram** – `assets/Arch-Digram.png`
- **Auth / Request Flow** – `assets/Auth-flow.png`

Embedded in this README:

- ERD: ![ERD](assets/ERD-chart.png)
- Architecture: ![Architecture](assets/Arch-Digram.png)
- Request Flow: ![Request Flow](assets/Auth-flow.png)

---

## 10. Deployment

### 10.1 Backend Deployment (Railway)

Steps to deploy the backend API on **Railway**:

1. Push this repository to a public GitHub repo.
2. In Railway, create a new **Service** from the `backend/` directory of this repo.
3. Set environment variables from section **6.2** (ensure `NODE_ENV=production` and correct `MONGODB_URI` pointing to your production MongoDB instance).
4. Set build / start commands:
   - Build: `npm run build`
   - Start: `npm start`
5. After deployment, confirm the backend URL:
   - **Backend URL**: `https://route-isms-deploy-production.up.railway.app`

Update `frontend/src/lib/api.ts` (or environment variables) to point to the deployed backend base URL above.

### 10.2 Frontend Deployment (Netlify)

Steps to deploy the frontend on **Netlify**:

1. Connect the GitHub repo to Netlify and select the `frontend/` folder as the project root.
2. Use the build command:
   - `npm run build`
3. Set environment variables if needed (for example `VITE_API_URL` with the Railway backend URL).
4. After deployment, confirm the frontend URL:
   - **Frontend URL**: `https://isms-app.netlify.app`

### 10.3 Final Deployed URLs

- **Frontend (Netlify)**: `https://isms-app.netlify.app`
- **Backend (Railway)**: `https://route-isms-deploy-production.up.railway.app`
