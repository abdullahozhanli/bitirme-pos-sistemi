# Admin Dashboard Guide

This document summarizes the dashboard structure, state handling, and how to extend KPIs.

## Structure
- `src/pages/AdminDashboard.jsx`: page composition
  - `PageHeader`: title/subtitle, actions, search, keyboard shortcuts (F focus search, N new order)
  - Sticky KPI area using `KpiCard`
  - Table Map and Table Details sections
- `src/components/KpiCard.tsx`: reusable KPI card (value, delta, icon, hint, loading/error)
- `src/components/state/EmptyState.tsx` and `ErrorState.tsx`: standard banners
- `src/components/dev/ViewportProbe.tsx`: dev-only overflow indicator
- `src/lib/api/dashboard.ts`: mock `getKpis()` (800ms, 10% fail)
- `src/lib/queryClient.ts`: React Query client

## States
- Loading: `KpiCard` shows skeletons
- Error: `KpiCard` shows error with retry; page also renders `ErrorState`
- Empty: if all KPI values are zero, page renders `EmptyState` with refresh action
- Accessibility: aria-live="polite" announces KPI state changes

## Extending with a new KPI
1. Add the new field to the API response (or mock) in `getKpis()`.
2. Place another `<KpiCard />` in the KPI grid, mapping the new value and hint.
3. Provide an icon and (optionally) delta props.
4. Numbers should be formatted with `Intl.NumberFormat('tr-TR')`.

## Styling & Responsiveness
- Global helpers: `.container`, `.grid-auto` defined in `src/index.css`.
- KPI area is sticky and mobile-friendly (reduced padding, clamped fonts).
- Use `ViewportProbe` to ensure no horizontal overflow at 360/768/1024/1440.

## Modals
- New Order/Product/Reservation stubs are wired in `PageHeader` and show a toast on success.

## Development Notes
- React Query provider is set in `src/main.jsx`.
- Use `RESPONSIVE_RULES.md` for the responsive-first ground rules.











