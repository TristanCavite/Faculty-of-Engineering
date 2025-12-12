# VSU CET Faculty & Admin Website

A Nuxt 3 web application for the College of Engineering Technology (CET) of Visayas State University.

The system has:

- 🌐 Public-facing site – news, events, admission, academics, research, downloads, department personnel, OBE, etc.  
- 🔐 Role-based admin dashboard – separate panels for Super Admin, Head Admin, and Faculty, with fine-grained module access controlled by the Super Admin.

Built with **Nuxt 3**, **Vue 3**, **TypeScript**, **Tailwind CSS**, **VueFire (Firebase)**, and **UIthing**.

---

## Table of Contents

1. Tech Stack  
2. Features  
3. User Roles & Access  
4. Project Structure  
5. Setup & Installation  
6. Environment Variables  
7. Development Commands  
8. Routing Overview  
9. Firestore Data Model (Overview)  
10. Coding Conventions  

---

## Tech Stack

### Core

- Nuxt 3 – app framework (Vue 3 + SSR/SPA)  
- Vue 3 with `<script setup>` and TypeScript  
- TypeScript  

### UI

- Tailwind CSS – utility-first styling  
- UIthing configuration – `ui-thing.config.ts`  
- Reusable UI components under `components/Ui`  

### Backend & Data

- Firebase  
  - Authentication  
  - Cloud Firestore  
  - Storage  
- VueFire – Nuxt + Firebase integration  

---

## Features

### Public Website

#### News

- `/news` – list of news articles  
- `/news/[id]` – full article view with cover image and rich content  

#### Events

- `/events` – events list and filters (year, status, etc.)  
- Event widgets and carousels via:  
  - `components/Ui/EventsList.vue`  
  - `MoreEvents.vue`  
  - `EventFilter.vue`  
  - `StatusFilter.vue`  
  - `YearFilter.vue`  
- Calendar integration using `AutoFitCalendar.vue`  

#### About

- `/about/history`, `/about/faculty`, `/about/facilities`, `/about/map`, etc.  
- `/about/administration` – faculty-wide administration and staff  
- `/about/dept_personels/[id]` – per-department personnel with profile preview modal (`ProfilePreviewModal.vue`)  

#### Academics

- `/academics` – academics main page  
- Department and degree program structure (department pages and degree programs)  

#### Admission

- `/admission` – public admission information  

#### Downloads

- `/download` – downloadable forms and documents  

#### Research

- `/research` – list of research items  

#### OBE (Outcomes-Based Education)

- `/obe` – Outcomes-Based Education public pages  

#### Global Search

- `/search` – unified search across news, events, research, OBE, and static content sections  

---

## User Roles & Access

Role data is stored in Firestore/Auth and enforced via middleware and UI conditions.

In addition to the base role, the **Super Admin can grant or revoke access to specific content modules** (news, events, research, downloads, admission, about, OBE, socials, gallery, etc.) for each Head Admin and Faculty user.

### 👑 Super Admin

Path prefix: `/Admin/super-admin`

Responsibilities:

- Manage all user accounts and roles  
  - `pages/Admin/super-admin/manage_accounts.vue`
- Manage departments and head admins  
  - `pages/Admin/super-admin/departments/*`
- Manage college-wide content:  
  - News: `pages/Admin/super-admin/news/*`  
  - Events: `pages/Admin/super-admin/events/*`  
  - Downloads: `pages/Admin/super-admin/downloads/*`  
  - Research: `pages/Admin/super-admin/research/*`  
  - Gallery: `pages/Admin/super-admin/manage_gallery.vue`  
  - OBE: `pages/Admin/super-admin/manage_obe.vue`  
  - Socials: `pages/Admin/super-admin/socials.vue`  
- Manage About and Admission content  
  - About: `pages/Admin/super-admin/manage_about.vue`  
  - Admission: `pages/Admin/super-admin/admission.vue`  
- View and manage faculty and staff for the whole college  
  - College-wide faculty and staff management: `pages/Admin/super-admin/faculty_staff.vue`  
- Grant and revoke **module access** for Head Admins and Faculty (per user or per department), for example:  
  - Can this Head Admin manage department news?  
  - Can this Faculty member manage research posts?  
- Can manage their own profile (like any user), plus all administrative settings  

### 🧑‍💼 Head Admin

Path prefix: `/Admin/head-admin`  
Each Head Admin is assigned to **one department** via `departmentId`.

Base responsibilities (always allowed):

- Manage content for their department public page:  
  - Department landing page: `department-page.vue`  
  - Degree program overview per program: `degree-program.vue`  
- Manage department gallery, OBE, and socials:  
  - `manage_gallery.vue`  
  - `manage_obe.vue`  
  - `socials.vue`  
- View, manage, and organize faculty and staff within their department:  
  - `faculty-staff.vue`  
- Manage their own profile:  
  - Can edit their own information (except name and position), using shared profile components  

Module access (only if granted by Super Admin):

- Department-level downloads, news, events, research, admission, about:  
  - Downloads: `pages/Admin/head-admin/downloads/*`  
  - News: `pages/Admin/head-admin/news/*`  
  - Events: `pages/Admin/head-admin/events/*`  
  - Research: `pages/Admin/head-admin/research/*`  
  - Admission: `pages/Admin/head-admin/admission.vue`  
  - About: `pages/Admin/head-admin/manage_about.vue`  

These modules may be hidden or disabled in the UI unless permissions are enabled by the Super Admin.

### 🧑‍🏫 Faculty

Path prefix: `/Admin/faculty`

Base responsibilities (always allowed):

- Manage their own profile:  
  - `pages/Admin/faculty/index.vue` and shared `EditableUserProfile.vue`  
  - Can edit their own information (except name and position)  

Module access (only if granted by Super Admin):

- Faculty-level content modules:  
  - Downloads: `pages/Admin/faculty/downloads/*`  
  - News: `pages/Admin/faculty/news/*`  
  - Events: `pages/Admin/faculty/events/*`  
  - Research: `pages/Admin/faculty/research/*`  
  - Admission: `pages/Admin/faculty/admission.vue`  
  - About: `pages/Admin/faculty/manage_about.vue`  
  - Gallery: `pages/Admin/faculty/manage_gallery.vue`  
  - OBE: `pages/Admin/faculty/manage_obe.vue`  
  - Socials: `pages/Admin/faculty/socials.vue`  

As with Head Admins, these modules are accessible only if the Super Admin turns on the corresponding permissions.

---

## Project Structure

Simplified tree based on the current repository:

    .
    ├─ assets/                     # Static assets (images, logos, etc.)
    ├─ components/
    │  ├─ Admin/                   # Admin-specific shared components/layout pieces
    │  ├─ Footer.vue               # Public footer
    │  ├─ Header.vue               # Public header
    │  ├─ Icons/                   # Icon components
    │  ├─ Navbar.vue               # Public navbar
    │  ├─ SidebarFaculty.vue       # Faculty sidebar
    │  ├─ SidebarHeadAdmin.vue     # Head Admin sidebar
    │  ├─ SidebarSuperAdmin.vue    # Super Admin sidebar
    │  └─ Ui/                      # Reusable UI components
    │     ├─ AutoFitCalendar.vue
    │     ├─ BackToTop.vue
    │     ├─ EditableUserProfile.vue
    │     ├─ EventFilter.vue
    │     ├─ EventsList.vue
    │     ├─ FacultyStaffCard.vue
    │     ├─ ForgotPasswordModal.vue
    │     ├─ ManageItem.vue
    │     ├─ ManageItemSkeleton.vue
    │     ├─ ManageSearchBar.vue
    │     ├─ MoreEvents.vue
    │     ├─ PhotoModal.vue
    │     ├─ ProfilePreviewModal.vue
    │     ├─ ShareButton.vue
    │     ├─ StatusFilter.vue
    │     ├─ UiLoadingOverlay.vue
    │     ├─ UiModal.vue
    │     ├─ UiTiptapEditor.vue
    │     ├─ ViewModeToggle.vue
    │     └─ YearFilter.vue
    ├─ composables/                # Nuxt composables (auth, Firestore helpers, etc.)
    ├─ extensions/                 # Tiptap extensions
    ├─ layouts/                    # Nuxt layouts (default, admin, public, etc.)
    ├─ middleware/                 # Route guards (auth, role-based)
    ├─ pages/
    │  ├─ about/
    │  │  ├─ dept_personels/
    │  │  │  └─ [id].vue           # Department personnel page (public)
    │  │  ├─ administration.vue
    │  │  ├─ extra1.vue
    │  │  ├─ extra2.vue
    │  │  ├─ facilities.vue
    │  │  ├─ faculty.vue
    │  │  ├─ history.vue
    │  │  └─ map.vue
    │  ├─ academics/               # Academics and degree program pages
    │  ├─ Admin/
    │  │  ├─ faculty/
    │  │  │  ├─ downloads/
    │  │  │  ├─ events/
    │  │  │  ├─ news/
    │  │  │  ├─ research/
    │  │  │  ├─ admission.vue
    │  │  │  ├─ index.vue
    │  │  │  ├─ manage_about.vue
    │  │  │  ├─ manage_gallery.vue
    │  │  │  ├─ manage_obe.vue
    │  │  │  └─ socials.vue
    │  │  ├─ head-admin/
    │  │  │  ├─ downloads/
    │  │  │  ├─ events/
    │  │  │  ├─ news/
    │  │  │  ├─ research/
    │  │  │  ├─ admission.vue
    │  │  │  ├─ degree-program.vue
    │  │  │  ├─ department-page.vue
    │  │  │  ├─ faculty-staff.vue
    │  │  │  ├─ index.vue
    │  │  │  ├─ manage_about.vue
    │  │  │  ├─ manage_gallery.vue
    │  │  │  ├─ manage_obe.vue
    │  │  │  └─ socials.vue
    │  │  └─ super-admin/
    │  │     ├─ departments/
    │  │     ├─ downloads/
    │  │     ├─ events/
    │  │     ├─ news/
    │  │     ├─ research/
    │  │     ├─ admission.vue
    │  │     ├─ faculty_staff.vue
    │  │     ├─ index.vue
    │  │     ├─ manage_about.vue
    │  │     ├─ manage_accounts.vue
    │  │     ├─ manage_gallery.vue
    │  │     ├─ manage_obe.vue
    │  │     └─ socials.vue
    │  ├─ admission/               # Public admission pages
    │  ├─ auth/                    # Login / reset password, forgot password, etc.
    │  ├─ download/                # Public downloads
    │  ├─ events/                  # Public events list and detail pages
    │  ├─ news/                    # Public news list and detail pages
    │  ├─ obe/                     # OBE public pages
    │  ├─ research/                # Public research pages
    │  ├─ index.vue                # Public homepage
    │  ├─ login.vue                # Login page
    │  └─ search.vue               # Global search page
    ├─ plugins/                    # Nuxt plugins (VueFire, UIthing, etc.)
    ├─ public/                     # Static public assets
    ├─ server/                     # Server routes / API endpoints if any
    ├─ utils/                      # Utility functions (formatters, helpers)
    ├─ .env                        # Local environment config (not committed)
    ├─ .firebaserc
    ├─ firebase.json               # Firebase hosting/functions config
    ├─ nuxt.config.ts              # Nuxt configuration
    ├─ tailwind.config.js          # Tailwind configuration
    ├─ tsconfig.json               # TypeScript configuration
    ├─ ui-thing.config.ts          # UIthing configuration
    ├─ sa.json                     # Local super-admin seed/utility (keep private)
    └─ package.json

---

## Setup & Installation

### Prerequisites

- Node.js 18 or higher  
- npm (or pnpm/yarn)  
- A Firebase project with:  
  - Authentication enabled (Email/Password)  
  - Firestore database  
  - Storage bucket  

### 1. Clone the Repository

    git clone <REPOSITORY_URL>.git
    cd <PROJECT_FOLDER>

### 2. Install Dependencies

    npm install

### 3. Configure Firebase

In the Firebase Console:

1. Create (or choose) a project.  
2. Create a Web App and copy the config (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).  
3. Enable:  
   - Authentication → Email/Password  
   - Firestore Database  
   - Storage  

---

## Environment Variables

Create a `.env` file in the project root (same level as `nuxt.config.ts`):

    NUXT_PUBLIC_FIREBASE_API_KEY="your_api_key"
    NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
    NUXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
    NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_project.appspot.com"
    NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="sender_id"
    NUXT_PUBLIC_FIREBASE_APP_ID="app_id"

Make sure these keys match what is used in your Nuxt/VueFire plugin configuration.

Do **not** commit the `.env` file or any real credentials.

---

## Development Commands

Start development server:

    npm run dev

Default URL: `http://localhost:3000`

Build for production:

    npm run build

Preview the production build locally:

    npm run preview

---

## Routing Overview

Nuxt uses file-based routing. Key routes:

### Public

- `/` → `pages/index.vue`  
- `/login` → `pages/login.vue`  
- `/about/*` → `pages/about/*.vue`  
- `/academics/*` → `pages/academics/*.vue`  
- `/admission/*` → `pages/admission/*.vue`  
- `/events` and `/events/[id]` → `pages/events/*.vue`  
- `/news` and `/news/[id]` → `pages/news/*.vue`  
- `/download` → `pages/download/*.vue`  
- `/research` → `pages/research/*.vue`  
- `/obe` → `pages/obe/*.vue`  
- `/search` → `pages/search.vue`  

### Admin

- `/Admin/faculty` → faculty profile
- `/Admin/head-admin` → faculty profile and department/degree program pages
- `/Admin/super-admin` → super admin dashboard and subpages  

Route access is guarded with middleware for authentication and role-based checks, plus extra checks for module permissions where needed.

---

## Firestore Data Model (Overview)

The exact fields may vary, but the system typically uses:

- `users`  
  - `uid`, `email`, `displayName`, `role` (`super-admin`, `head-admin`, `faculty`), `departmentId`  
  - `permissions` or similar field for module-level access (news, events, research, downloads, about, admission, OBE, gallery, socials, etc.)  
  - Profile data  

- `departments`  
  - `id`, `name`, `code`, `headAdminId`, and other department metadata  
  - Subcollection: `degreePrograms`  
    - `id`, `name`, `level`, `content`, and related information  

- `department_pages`  
  - Document ID = `departmentId`  
  - `coverImageUrl`, `content` (rich HTML from Tiptap)  

- `news`  
  - `title`, `description`, `content`, `coverImageUrl`, `createdAt`, `updatedAt`, `authorId`  

- `events`  
  - `title`, `description`, `content`, `date`, `coverImages[]`, `status`, `createdAt`  

- `about_sections`  
  - Examples: `history`, `facilities`, `vision_mission`, etc., each storing rich HTML content  

- `admission_sections`  
  - `why_choose_vsu`, `undergraduate`, `graduate`  

- `college_faculty_staff` and department-level staff collections  

- `downloads`  
  - File metadata, categories, and Storage URLs  

- `researches`  
  - Research entries linked to CET  

All Firestore reads and writes are handled via VueFire in composables and page components, with security rules enforcing role and permission checks.

---

## Coding Conventions

- Use TypeScript in components and composables:  
  - `<script setup lang="ts">`  

- Use Tailwind CSS utility classes for styling.  

- Use UIthing and components from `components/Ui` for consistent styling and behavior.  

- Use VueFire for all Firebase operations (Authentication, Firestore, Storage).  

- Enforce role-based and module-based access in:  
  - Middleware (navigation guards)  
  - Firestore security rules  
  - UI (hide or disable actions that the current role or user does not have permission to perform)  
