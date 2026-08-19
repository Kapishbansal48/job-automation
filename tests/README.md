# Tests

Lightweight sanity tests using Node's built-in test runner (no extra
dependency needed). Run from the `backend/` folder so `ts-node` can resolve
the TypeScript sources:

```bash
cd backend
npx ts-node --transpile-only ../tests/status-flow.test.ts
```

These are intentionally minimal — they check the pieces that are cheapest
to get wrong (status transitions, duplicate prevention key) rather than
trying to fully mock Playwright/browser behavior, which is better verified
by actually running the automation against a real Greenhouse board in
non-headless mode during development (`HEADLESS=false`).
