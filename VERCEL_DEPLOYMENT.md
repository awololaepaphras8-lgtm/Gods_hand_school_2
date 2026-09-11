# Deploying God's Hand Model School App to Vercel

This document outlines the complete environment configuration and steps to deploy and run this Vite React application on **Vercel** with full responsiveness across Mobile, iPhone, Tablet, and PC.

---

## 1. Project Configuration Summary

- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev` (runs `vite`)
- **Type Checking & Lint Command**: `npm run lint` (runs `tsc --noEmit`)
- **Node.js Version**: 18.x, 20.x, or 22.x

---

## 2. One-Click Vercel Setup Guide

### Method A: Connect via GitHub / GitLab / Bitbucket (Recommended)
1. Push this repository to your GitHub account:
   ```bash
   git add .
   git commit -m "feat: vercel configuration and mobile responsive enhancements"
   git push origin main
   ```
2. Log into your [Vercel Dashboard](https://vercel.com).
3. Click **"Add New..."** → **"Project"**.
4. Import your repository.
5. Vercel automatically detects **Vite**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build` (or leave default from `vercel.json`)
   - **Output Directory**: `dist`
6. Expand **"Environment Variables"** (see Section 3 below).
7. Click **"Deploy"**.

---

### Method B: Deploy using Vercel CLI
From your local terminal, you can deploy in seconds using the Vercel CLI:
```bash
npm install -g vercel
vercel
```
Follow the interactive prompts (select default settings). For production:
```bash
vercel --prod
```

---

## 3. Environment Variables on Vercel

Add the following environment variables in your **Vercel Project Settings → Environment Variables**:

| Variable Key | Value / Source |
| :--- | :--- |
| `VITE_SUPABASE_URL` | `https://jzuifdntpxjrmmrpvqfc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_aBlhb0SIKKE-uWUx_hL-dw_dfgeCZ1B` |
| `VITE_API_BASE_URL` | *(Optional)* Leave empty or enter custom backend URL |

> **Setup Tip**: To create your database tables and realtime channels in Supabase, open your [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Select your project (`awololaepaphras8-lgtm's Project`) &rarr; Click **SQL Editor** &rarr; Paste and run the complete script from `supabase_schema.sql`. All 12 tables and realtime listeners will be immediately activated!

---

## 4. SPA Routing & Vercel Configuration (`vercel.json`)

The included `vercel.json` ensures:
- **Clean Single-Page Application (SPA) Routing**: Rewrites all paths to `/index.html` so direct navigation or refreshing on subpages will not result in `404 Not Found`.
- **Vite Framework Recognition**: Explicitly informs Vercel's build pipeline to compile using Vite into `dist`.
- **High-Performance Caching**: 1-year immutable caching for static bundled assets (`/assets/*`).
- **Security Headers**: Includes `X-Content-Type-Options` and `X-XSS-Protection`.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## 5. How to Fix "Command 'vite build' exited with 127"

If you encounter **`Command "vite build" exited with 127`** on Vercel:

### Why this happens:
- Exit code **127** means **"command not found"** (`vite: not found`).
- On Vercel, this happens when:
  1. **Lockfile Conflict**: A `bun.lock` was present without a `package-lock.json`, causing Vercel's package manager detector to attempt Bun instead of standard npm, leaving `node_modules/.bin/vite` unlinked.
  2. **Production Dependency Pruning**: `devDependencies` were skipped by Vercel if `NODE_ENV=production` was active.
  3. **Vercel UI Override**: The Vercel Dashboard had the Build Command set to `vite build` directly rather than `npm run build` (which automatically places `./node_modules/.bin` in the system `PATH`).

### Fixes applied in this repository:
1. **Removed `bun.lock`** and committed a clean, complete **`package-lock.json`** so Vercel executes standard `npm ci` / `npm install`.
2. **Moved all build tools** (`vite`, `vite-plugin-pwa`, `@vitejs/plugin-react`, `typescript`) into `"dependencies"` in `package.json` so they are guaranteed to install even when `NODE_ENV=production`.
3. **Configured `vercel.json`** with explicit `"installCommand": "npm install"` and `"buildCommand": "npm run build"`.

### What to check in your Vercel Dashboard:
1. Go to **Settings** &rarr; **General** &rarr; **Build & Development Settings**:
   - **Framework Preset**: `Vite`
   - **Build Command**: Set to `npm run build` (or turn the Override toggle **OFF** so it uses `vercel.json`). **Do NOT type `vite build` directly.**
   - **Install Command**: Set to `npm install` (or turn the Override toggle **OFF** so it uses `vercel.json`).
   - **Output Directory**: `dist`
2. Go to **Deployments** &rarr; click `...` next to the deployment &rarr; click **Redeploy** &rarr; uncheck *"Use existing Build Cache"* to ensure a fresh clean installation.

---

## 6. How to Fix "404: DEPLOYMENT_NOT_FOUND" on Vercel

If you ever see **"404: DEPLOYMENT_NOT_FOUND (The deployment could not be found on Vercel)"**, check these four items in your Vercel Dashboard:

1. **Verify Your Production Domain**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard) &rarr; Select your Project.
   - Click on the domain link shown under **"Domains"** (e.g. `gods-hand-school.vercel.app`).
   - If you were using an old preview URL from a previous commit or deleted branch, that link will return 404. Always use the primary Production domain.

2. **Verify Project Build Settings in Vercel**:
   - In your project, go to **Settings** &rarr; **General** &rarr; **Build & Development Settings**:
     - **Framework Preset**: Select `Vite` (Do NOT leave as "Other").
     - **Root Directory**: Leave empty or set to `./` (do not set to `dist` or `src`).
     - **Build Command**: Set to `npm run build` or `vite build` (or leave toggle OFF so it uses `vercel.json`).
     - **Output Directory**: Set to `dist` (or leave toggle OFF so it uses `vercel.json`).

3. **Check Latest Deployment Status**:
   - In your project, click **Deployments**.
   - Ensure the latest deployment shows **Ready** with a green dot.
   - If the build failed, click on the deployment to inspect the build logs. (Our code builds with zero errors: `npm run build`).

4. **Trigger a Clean Redeploy**:
   - Click **Deployments** &rarr; click the three dots `...` next to the latest deployment &rarr; click **Redeploy** (ensure "Use existing Build Cache" is unchecked if you want a fresh build).

---

## 6. Device & Cross-Platform Responsiveness

The application is engineered for flawless experience across all screen sizes:

- **Mobile & iPhone (320px – 430px)**:
  - Viewport configured with `viewport-fit=cover` to support iOS Safe Areas (notches and Dynamic Island).
  - Apple Web App meta tags enable "Add to Home Screen" PWA experience.
  - Input field font sizes capped at 16px to prevent iOS Safari auto-zoom issues.
  - Interactive hamburger menu with touch-friendly minimum 44px tap targets.
  - Horizontally swipeable data tables and status badge chips.
- **Tablets & iPads (768px – 1024px)**:
  - Adaptive 2-column bento grids for student fees, attendance charts, and payment verification queues.
- **Laptops & Desktop PCs (1024px – 2560px+)**:
  - Full widescreen management layout, master analytics grids, and bulk print-ready receipt inspection modals.

---

## 7. Testing the Build Locally

Before pushing to Vercel, you can simulate the production build locally:

```bash
# 1. Check for TypeScript and lint errors
npm run lint

# 2. Build production bundle
npm run build

# 3. Preview production build locally
npm run preview
```
Open `http://localhost:4173` to verify the production bundle.
