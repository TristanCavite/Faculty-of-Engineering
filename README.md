VSU CET Faculty & Admin Website

A Nuxt 3 web application for the College of Engineering Technology (CET) of Visayas State University.

The system has:

🌐 Public-facing site – news, events, admission, academics, research, downloads, department personnel, OBE, etc.

🔐 Role-based admin dashboard – separate panels for Super Admin, Head Admin, and Faculty, with fine-grained module access controlled by the Super Admin.

Built with Nuxt 3, Vue 3, TypeScript, Tailwind CSS, VueFire (Firebase), and UIthing.

Table of Contents

Tech Stack

Features

User Roles & Access

Project Structure

Setup & Installation

Environment Variables

Development Commands

Routing Overview

Firestore Data Model (Overview)

Coding Conventions

Tech Stack

Core

Nuxt 3 – app framework (Vue 3 + SSR/SPA)

Vue 3 with <script setup> and TypeScript

TypeScript

UI

Tailwind CSS – utility-first styling

UIthing configuration – ui-thing.config.ts

Reusable UI components under components/Ui

Backend & Data

Firebase

Authentication

Cloud Firestore

Storage

VueFire – Nuxt + Firebase integration

Features
Public Website
News

/news – list of news articles

/news/[id] – full article view with cover image and rich content

Events

/events – events list and filters (year, status, etc.)

Event widgets and carousels via:

components/Ui/EventsList.vue

MoreEvents.vue

EventFilter.vue

StatusFilter.vue

YearFilter.vue

Calendar integration using AutoFitCalendar.vue

About

/about/history, /about/faculty, /about/facilities, /about/map, etc.

/about/administration – college-wide administration and staff

/about/dept_personels/[id] – per-department personnel with profile preview modal (ProfilePreviewModal.vue)

Academics

/academics – academics main page

Department and degree program structure (department pages and degree programs)

Admission

/admission – public admission information

Downloads

/download – downloadable forms and documents

Research

/research – list of research items

OBE (Outcomes-Based Education)

/obe – Outcomes-Based Education public pages

Global Search

/search – unified search across news, events, research, OBE, and static content sections

User Roles & Access

Role data is stored in Firestore/Auth and enforced via middleware and UI conditions.

In addition to the base role, the Super Admin can grant or revoke access to specific content modules (news, events, research, downloads, admission, about, OBE, socials, gallery, etc.) for each Head Admin and Faculty user.

👑 Super Admin

Path prefix: /Admin/super-admin

Responsibilities:

Manage all user accounts and roles

pages/Admin/super-admin/manage_accounts.vue

Manage departments and head admins

pages/Admin/super-admin/departments/*

Manage college-wide content:

News: pages/Admin/super-admin/news/*

Events: pages/Admin/super-admin/events/*

Downloads: pages/Admin/super-admin/downloads/*

Research: pages/Admin/super-admin/research/*

Gallery: pages/Admin/super-admin/manage_gallery.vue

OBE: pages/Admin/super-admin/manage_obe.vue

Socials: pages/Admin/super-admin/socials.vue

Manage About and Admission content

About: pages/Admin/super-admin/manage_about.vue

Admission: pages/Admin/super-admin/admission.vue

View and manage faculty and staff for the whole college

College-wide faculty and staff management: pages/Admin/super-admin/faculty_staff.vue

Grant and revoke module access for Head Admins and Faculty (per user or per department), for example:

Can this Head Admin manage department news?

Can this Faculty member manage research posts?

Can manage their own profile (like any user), plus all administrative settings

🧑‍💼 Head Admin

Path prefix: /Admin/head-admin
Each Head Admin is assigned to one department via departmentId.

Base responsibilities (always allowed):

Manage content for their department public page:

Department landing page: department-page.vue

Degree program overview per program: degree-program.vue

Manage department gallery, OBE, and socials:

manage_gallery.vue

manage_obe.vue

socials.vue

View, manage, and organize faculty and staff within their department:

faculty-staff.vue

Manage their own profile:

Can edit their own information (except name and position), using shared profile components

Module access (only if granted by Super Admin):

Department-level downloads, news, events, research, admission, about:

Downloads: pages/Admin/head-admin/downloads/*

News: pages/Admin/head-admin/news/*

Events: pages/Admin/head-admin/events/*

Research: pages/Admin/head-admin/research/*

Admission: pages/Admin/head-admin/admission.vue

About: pages/Admin/head-admin/manage_about.vue

These modules may be hidden or disabled in the UI unless permissions are enabled by the Super Admin.

🧑‍🏫 Faculty

Path prefix: /Admin/faculty

Base responsibilities (always allowed):

Manage their own profile:

pages/Admin/faculty/index.vue and shared EditableUserProfile.vue

Can edit their own information (except name and position)

Module access (only if granted by Super Admin):

Faculty-level content modules:

Downloads: pages/Admin/faculty/downloads/*

News: pages/Admin/faculty/news/*

Events: pages/Admin/faculty/events/*

Research: pages/Admin/faculty/research/*

Admission: pages/Admin/faculty/admission.vue

About: pages/Admin/faculty/manage_about.vue

Gallery: pages/Admin/faculty/manage_gallery.vue

OBE: pages/Admin/faculty/manage_obe.vue

Socials: pages/Admin/faculty/socials.vue