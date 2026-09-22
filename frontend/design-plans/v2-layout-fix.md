# Design Fix Plan — v2 Layout 100% Match

## Audited surface: FTalentHub frontend pages (23 routes)
## Design sources: `slides/slide_01..35.png`, `docs/slide-ocr/`, `docs/design-spec-v2.md`

## Findings

### 1. Missing "Thống kê" page (HIGH)
- **Evidence**: Slide 09 shows 8 navigation icons including "THỐNG KÊ". Current student portal has 7 pages (Dashboard, Profile, Discover, Activities, Checkin, Badges, Roadmap).
- **Contract**: Design spec v2 says "7 pages" but slide 09 shows 8 icons with Statistics.
- **Correction**: Create `src/pages/student/Statistics.tsx` showing school-wide KPI charts (participation rate, completion rate, talent distribution).
- **Scope**: Student portal navigation.

### 2. Student Dashboard layout mismatch (HIGH)
- **Evidence**: Slide 10 shows "TỔNG QUAN CÁ NHÂN" with hero section + KPI cards + feature cards. Current Dashboard uses simple grid without hero section.
- **Contract**: Slide 10 layout has hero banner with gradient + 3-column KPI grid + feature section.
- **Correction**: Add hero banner section to Dashboard with portal accent gradient, then KPI grid below.

### 3. Profile page lacks visual structure (MEDIUM)
- **Evidence**: Slide 11 shows profile with "Hồ sơ năng lực" organized into distinct sections with icons and visual hierarchy. Current Profile page is basic 3-column grid.
- **Contract**: Slide 11 layout has sidebar profile info + main content grid.
- **Correction**: Restructure Profile to have profile avatar/info sidebar + content area.

### 4. Discover page test layout (MEDIUM)
- **Evidence**: Slide 12 shows "ĐA DẠT BÀI TEST" and "PHÂN TÍCH NĂNG LỰC" as distinct cards with descriptions. Current Discover page may be missing these card layouts.
- **Contract**: Slide 12 has 2-column card grid for test types.
- **Correction**: Add card-based layout for test categories.

### 5. Badge page missing visual hierarchy (LOW)
- **Evidence**: Slide 17 shows "HỆ THỐNG HUY HIỆU" with badge cards showing Explorer/Innovator progress bars. Current Badges page may be too simple.
- **Contract**: Slide 17 has badge cards with progress indicators.
- **Correction**: Add progress bars to badge cards.

### 6. Missing elements in Navigation (MEDIUM)
- **Evidence**: Slide 09 sidebar has 8 items. Current sidebar has 7 navigation items (missing Statistics).
- **Contract**: Layout.tsx PORTALS array needs Statistics item for student portal.
- **Correction**: Add Statistics to student portal items.

## Improve first
Fix #1 (Missing Statistics page) and #6 (Navigation) — these are the most visible discrepancies and easiest to fix. Then #2 (Dashboard hero) for visual impact.
