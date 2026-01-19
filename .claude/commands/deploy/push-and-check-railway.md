---
description: Push to GitHub and verify Railway deployment with automated error detection and fixing
category: workflow
allowed-tools: Bash(git:*), Bash(railway:*), Bash(curl:*), Read, Edit, Task
---

Push changes to GitHub and verify that Railway deployments complete successfully. If errors are detected, investigate and fix them, then repeat until clean deployment.

## Railway Service

This project has a single Railway service:
- **Project:** `exquisite-gratitude`
- **Service:** `better-connections` (Next.js full-stack)
- **Domains:**
  - `https://bettercontacts.ai` (custom domain)
  - `https://better-connections-production.up.railway.app`

## Workflow Steps

### Step 1: Push to GitHub

Check for uncommitted changes and push:

```bash
git status --porcelain && git push
```

If there are uncommitted changes, ask the user if they want to commit first (or use `/git:commit`).

### Step 2: Wait for Deployment

Railway auto-deploys on push. Wait ~30 seconds for deployment to start, then check logs:

```bash
sleep 30
```

### Step 3: Check Railway Logs

Check the service for errors:

```bash
railway logs --service better-connections 2>&1 | tail -50
```

Look for:
- Build failures (`error`, `ERR!`, `failed`)
- Runtime errors (`Error:`, `TypeError`, `Cannot find module`)
- Deployment issues (`exited`, `crashed`, `OOMKilled`)
- Prisma issues (`P1001`, `P2002`, `migration failed`)
- Successful indicators (`Ready in`, `Listening on`, `Build succeeded`)

### Step 4: Error Handling

If errors are found:
1. Identify the root cause from logs
2. Fix the issue in code
3. Commit and push the fix
4. Return to Step 2 (wait and re-check)

Common issues:
- **Missing dependencies**: Check package.json, run `npm install`
- **TypeScript errors**: Check for type issues in the error stack
- **Environment variables**: Verify Railway env vars are set (DATABASE_URL, OPENAI_API_KEY, Supabase keys)
- **Prisma issues**: Check migration status, ensure `prisma generate` runs in build
- **Port binding**: Next.js handles this automatically via `process.env.PORT`

### Step 5: Verify Health

Once logs show successful deployment, verify health endpoints:

```bash
# Main app (should return HTML or 200)
curl -s -o /dev/null -w "%{http_code}" https://bettercontacts.ai/

# API health check (if available)
curl -s -o /dev/null -w "%{http_code}" https://bettercontacts.ai/api/health
```

Expected results:
- Main app: HTTP 200
- API: HTTP 200 (or 404 if no health endpoint exists)

### Step 6: Report

Provide a concise summary:
- Push status
- Deployment status
- Any errors encountered and fixes applied
- Final health check results

## Efficiency Notes

- Only show relevant log excerpts (errors and success indicators)
- Skip verbose explanations during iteration loops
- Report final status concisely
