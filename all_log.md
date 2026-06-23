# Adbar Deployment - Full Log

## Session: Tuesday, June 23, 2026

---

## 1. Initial State Check

**Project location:** `C:\Users\A13X60\Videos\Market place\adbar`

**Findings:**
- Nx monorepo (Next.js frontend + 19 NestJS backend services)
- GitHub remote existed: `https://github.com/Yonas-Wondimagegn/Adbar.git`
- `.gitignore` was corrupted (binary garbage)
- `node_modules` was tracked in git (~41K files)
- `nx.json` existed (Nx workspace config)
- Root `package.json` had `workspaces` field pointing to `frontend/web`
- `frontend/web/vercel.json` existed with basic Next.js config
- No root-level `vercel.json`
- Vercel project already existed (`projectId: prj_ynAVtlUkCB736COx99DWfHcSmxXd`)

---

## 2. First Push to GitHub (Clean History)

**Problem:** Original repo had node_modules tracked. Massive diff.

**Solution:** Reinitialize git:
```bash
rm -rf .git
git init
```

**New `.gitignore`:**
```
# Dependencies
node_modules/
.pnp
.pnp.js
# Build outputs
.next/
out/
build/
dist/
# misc
.DS_Store
*.pem
.env*.local
.env
# debug npm logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
# nx
.nx/cache
.nx/workspace-data
*.db
*.db-shm
*.db-wal
# vercel
.vercel
.vercel_pid
```

**Commit:**
```
67285c24 feat: initial Adbar marketplace platform
```
(454 source files, node_modules properly excluded)

**Push:**
```
git remote add origin https://github.com/Yonas-Wondimagegn/Adbar.git
git branch -M main
git push -u origin main
```
✅ Success

---

## 3. Vercel Config - First Attempt

**Created `vercel.json`:**
```json
{
  "framework": "nextjs",
  "buildCommand": "cd frontend/web && npm run build",
  "outputDirectory": "frontend/web/.next",
  "installCommand": "cd frontend/web && npm install"
}
```

**Error:**
```
Error: Invalid vercel.json - should NOT have additional property `rootDirectory`
```

**Fix:** Removed `rootDirectory` from vercel.json.

---

## 4. User Runs Vercel Login & Link

```powershell
vercel login
# Result: Signed in via device code

vercel link
# Result: Linked to yonas-wondimagegns-projects/adbar
# Pulled development env vars into .env.local
```

---

## 5. Root Directory Issue

**User manually set Root Directory = `frontend/web` in Vercel dashboard**

**Deploy attempt:**
```powershell
vercel --prod
```

**Error:**
```
Error: No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies"
```

**Cause:** Root `package.json` didn't have "next" — it was in `frontend/web/package.json`. But Vercel was looking at repo root.

**Fix:** Root Directory setting was correct. But then...

---

## 6. Nx Detection Issue

**Error:**
```
Running "install" command: `npm install --workspace=frontend/web --include-workspace-root`
npm error No workspaces found: --workspace=frontend/web
Error: Command exited with 1
```

**Cause:** Vercel auto-detected Nx because:
1. `nx.json` existed in repo root → Removed it
2. Root `package.json` had `workspaces` field → Removed it
3. Root `package.json` had `nx` references in scripts → Removed them

**Each fix attempt:**
- Removed `nx.json` from git → Vercel STILL detected Nx
- Removed `workspaces` from root `package.json` → STILL detected Nx
- Removed `nx` from scripts → STILL detected Nx
- Removed Next.js deps from root `package.json` → STILL detected Nx

**Vercel was caching Nx settings from the old project.**

---

## 7. Root Directory "Does Not Exist" Error

**Error:**
```
Error: The specified Root Directory "frontend/web" does not exist.
```

**Cause:** Setting unclear — likely caching or the path with space `Market place`.

**Attempted fixes:**
1. Cleared Root Directory back to default
2. Put `vercel.json` at root with `cd frontend/web && npm install && npm run build`
3. Used `--prefix` instead of `cd`
4. Moved `vercel.json` to `frontend/web/vercel.json`

---

## 8. Nuclear Option - Delete & Recreate Vercel Project

```powershell
echo "y" | vercel projects remove adbar
# Success: Project adbar removed

vercel projects add adbar
# Success: Project adbar added

vercel link --yes
# Success: Linked to yonas-wondimagegns-projects/adbar
```

**Fresh project ID:** `prj_oTFeR2tQUwzumeSQ5Y0QEY9AAvnT`

**Deploy with no Root Directory:**
```powershell
vercel --prod
```

**Result:**
```
✓ Ready in 3s
There are no files inside your deployment.
```

Build completed but no output because Root Directory wasn't set.

---

## 9. User Sets Root Directory Again

```powershell
vercel --prod
```

**Error (again):**
```
Error: The specified Root Directory "frontend/web" does not exist.
```

**Current state:**
- Fresh Vercel project (no cached settings)
- `vercel.json` is inside `frontend/web/`:
  ```json
  {
    "framework": "nextjs",
    "buildCommand": "bash vercel-build.sh",
    "outputDirectory": ".next",
    "installCommand": "bash vercel-build.sh"
  }
  ```
- `frontend/web/vercel-build.sh`:
  ```bash
  #!/usr/bin/env bash
  set -e
  cd frontend/web
  npm install --legacy-peer-deps
  npm run build
  echo "Build complete. Output: .next/"
  ```
- Root `package.json` — no Next.js, no workspaces, no nx:
  ```json
  {
    "name": "adbar",
    "version": "1.0.0",
    "private": true,
    "scripts": {
      "dev": "echo 'Use vercel dev for frontend or docker compose for backend'",
      "build": "echo 'Use vercel build for frontend or docker compose for backend'"
    }
  }
  ```
- `frontend/web/package.json` — full Next.js dependencies

---

## 10. Remaining Issue

The error "The specified Root Directory 'frontend/web' does not exist" persists despite:
- The folder clearly exists (`ls frontend/` shows `web`)
- The folder is in git
- Other paths work

**Possible causes not yet investigated:**
- Git Bash / MSYS path translation issue with `$HOME` expansion
- The space in the Windows path (`Market place`) confusing Vercel's Linux build machine
- The `.vercelignore` file (created but may need adjustment)

---

## 11. Environment Variables Needed for Production

| Env Var | Purpose | Default |
|---------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000/api` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `http://localhost:3000` |

---

## 12. Still To Do

1. **Fix Root Directory issue** — try clearing it entirely and only using `vercel.json` at repo root with `cd frontend/web` in build commands
2. **Set production env vars** in Vercel dashboard
3. **Deploy backend** (separate host: Railway/Render/Docker/VPS)
4. **Verify deployment** loads in browser

---

## Key Lessons Learned

1. **Vercel caches project settings** even after you remove nx.json — must delete the project entirely
2. **`rootDirectory` cannot be in `vercel.json`** — must be set in dashboard
3. **Vercel Nx detection** is triggered by: `nx.json`, `workspaces` in root `package.json`, `nx` in scripts, or cached project settings
4. **`node_modules` in git** — never commit this; use `.gitignore` from day one
5. **Path with space** (`Market place`) may cause issues on Vercel's Linux build machine
