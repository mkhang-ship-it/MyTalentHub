# Fix 3 display bugs across FTalentHub frontend

Written against: `0128bad feat: redesign UI with 3D robot mascot, logo sync, page transitions, AI backend`

## Evidence chain

- Surface: all authenticated pages (`/student…`, `/teacher…`, `/school…`, `/enterprise…`, `/passport/:studentId`) + public `/`, `/login`.
- Problem: three verified display issues — the Discover feature cannot load/display any data, the mobile bottom navigation covers page content, and the teacher overview always renders a female-teacher emoji.
- Design evidence: no `DESIGN.md` exists; source-of-truth is the rendered surface itself (SKU of convention: every other page calls API paths prefixed with `/student/…`; bottom nav is a fixed `lg:hidden` bar; teacher heading renders a gendered emoji next to a name of arbitrary gender).
- Owner:
  - `frontend/src/pages/student/Discover.tsx`
  - `frontend/src/components/Layout.tsx`
  - `frontend/src/pages/teacher/Overview.tsx`
- Scope and affected surfaces:
  - F1: route `/student/discover` only.
  - F2: every internal page on viewports `< 1024px` (student, teacher, school, enterprise, passport).
  - F3: route `/teacher` only.
- Uncertainty: none for F1/F2/F3 root causes; F3 includes a small copy decision (see Change 3).

## Findings (verified)

### F1 — "Khám phá năng khiếu" (`/student/discover`) cannot load or submit anything
- Runtime evidence: console `GET /api/v1student/assessments → 404` (×2). The page renders its 4 static test cards but no "✓ Đã làm" badges (assessments list empty), and clicking "Bắt đầu" surfaces the raw error `API /student/assessments/questions?test_type=… → 404` via `ErrorBox`.
- Root cause: `Discover.tsx` lines 57, 67, 89, 94 call `get/post` with `"student/assessments"` (leading `/` missing). `API_BASE = "/api/v1"` (`frontend/src/api/client.ts`) therefore produces `/api/v1student/…`. Every other page in the codebase uses `/student/…`.
- Backend contract check: `backend/app/routers/student.py` exposes `GET /assessments`, `POST /assessments`, `GET /assessments/questions`, `POST /assessments/compute` (router prefix `/student`), and `GET /assessments` returns exactly `{test_type, result, date}[]` which matches the frontend type at line 54. So correcting the path is sufficient; no backend change needed.

### F2 — Mobile bottom navigation covers the last chunk of every internal page
- Runtime evidence: viewport `390×844`, `/student`: last content element bottom = `2405px`; fixed bottom nav occupies `782–844` (`contentCoveredByNav=true`); `main` padding-bottom computed `0px`; the page container is `relative min-w-0 p-5 sm:p-6 lg:p-8` (bottom padding 20–32px, less than the ~62px nav height).
- Root cause: `Layout.tsx` line 440 container has no responsive bottom clearance for the `fixed bottom-0 lg:hidden` nav (line 470).

### F3 — Teacher overview always shows a female-teacher emoji
- Runtime evidence: heading `Nguyễn Văn Hùng 👩🏫` (male name, female emoji). Hard-coded `{data.full_name} 👩🏫` in `frontend/src/pages/teacher/Overview.tsx` line 49. The emoji is not derived from any user data.

## Design decision

1. **F1** — Add the missing leading slash to all four API paths in `Discover.tsx`. This aligns the page with the established API convention and restores list + submit + compute flows. No interface copy or layout change required.
2. **F2** — Give the main content container a mobile-safe bottom padding that clears the fixed bottom nav on `< 1024px` viewports and resets on desktop. This is a layout-only correction with a known safe value.
3. **F3** — Stop presenting the teacher’s gender as a fact the app does not store. Remove the hard-coded emoji entirely (the name already identifies the user); do not invent a gender heuristic. If an emoji is desired later, use a neutral `🧑🏫`.

## Reuse

- F1: existing `get`/`post` from `frontend/src/api/client.ts`; path convention `/student/…` already used by `Badges.tsx`, `Checkin.tsx`, `Profile.tsx`, `Activities.tsx`.
- F2: existing Tailwind spacing scale — `pb-24` (96px) on mobile, `lg:pb-8` reset. No new primitive.
- F3: none (removal of hard-coded copy).

## Changes

1. `frontend/src/pages/student/Discover.tsx`
   - Change: prefix all four API paths with `/`:
     - line 57: `"student/assessments"` → `"/student/assessments"`
     - line 67: `` `student/assessments/questions?test_type=${key}` `` → `` `/student/assessments/questions?test_type=${key}` ``
     - line 89: `"student/assessments/compute"` → `"/student/assessments/compute"`
     - line 94: `"student/assessments"` → `"/student/assessments"`
   - Preserve: test-card layout, question flow, result radar, and all accessibility attributes.
   - Verify: `/student/discover` shows "✓ Đã làm" badges after a completed test; clicking "Bắt đầu" loads questions (no 404 in console).

2. `frontend/src/components/Layout.tsx`
   - Change: line 440 container class `"relative min-w-0 p-5 sm:p-6 lg:p-8"` → `"relative min-w-0 p-5 sm:p-6 lg:p-8 pb-24 lg:pb-8"`.
   - Preserve: desktop spacing, background decoration (`absolute inset-0`), role-based nav.
   - Verify: on `390px` viewport, last content element bottom ≤ nav top (no overlap); on `1440px`, paddings unchanged (`lg:pb-8`).

3. `frontend/src/pages/teacher/Overview.tsx`
   - Change: line 49 `{data.full_name} 👩🏫` → `{data.full_name}`.
   - Preserve: heading hierarchy and spacing.
   - Verify: `/teacher` heading is exactly `Nguyễn Văn Hùng` (no emoji).

## Scope

- Inherit: all authenticated internal pages (F2), Discover flow (F1), teacher overview (F3).
- Verify: mobile viewports 320–1023px on F2 (esp. `/student` and `/passport/1`); F1 with an existing assessment row (run `python -m backend.app.seed` or use `DEMO-QR` flow).
- Exclude: React Router v7 future-flag console warnings (dev-only, `WebGL GL_*` driver messages are environment noise), any backend change, data re-seeding, and redesign work beyond the three fixes.

## Validation

- Product: user can discover, run, save, and see assessment results (F1); mobile pages fully visible above the bottom nav (F2); teacher heading neutral (F3).
- Interface:
  - `/student/discover` — default list, run `holland` test, submit, see "✓ Đã làm" + saved result.
  - `/student`, `/passport/1` at 390×844 and 320×568 — last item visible above bottom nav, no horizontal overflow.
  - `/teacher` — heading copy.
- System: F1 uses the same `get/post` helpers and path prefix as sibling student pages; F2 stays within the existing Tailwind scale; F3 removes rather than invents a gender model.
- Repository:
  - `cd frontend && npm run lint` → exit 0.
  - `cd frontend && npm run build` → `tsc --noEmit` clean, Vite build succeeds.
  - `git diff --check` → empty.

## Stop conditions

- F1: stop if `GET /api/v1/student/assessments` returns anything other than `{test_type, result, date}[]` after the path fix (then the contract differs and the page needs a matching shape review).
- F2: stop if `pb-24` causes content to look over-padded or the nav height changes materially (re-measure nav height and adjust the token).
- F3: stop if a product owner wants a gendered/derived emoji instead of removal.

## Design documentation

- After acceptance and validation: none required (these are correctness fixes to the existing surface; no design rule changes). Optionally record in `design-plans/` a one-line note that gender-specific UI must not be hard-coded.