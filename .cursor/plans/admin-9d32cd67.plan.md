<!-- 9d32cd67-4851-4246-9805-9f378af32d49 12789712-716a-46d9-9e2c-94c928ed4a2c -->
# Admin Utilities Pages

## Goals

- Ensure `/admin/utilities/activity` and `/admin/utilities/reports` render real admin views instead of 404s.
- Reuse the admin layout and design language for consistency.

## Approach

1. **Activity Page**

- File: `src/app/(protected)/admin/utilities/activity/page.tsx`
- Use existing admin layout (automatic via route structure).
- Display a placeholder dashboard (title, brief description, and a table shell for API logs).

2. **Reports Page**

- File: `src/app/(protected)/admin/utilities/reports/page.tsx`
- Provide heading, description, and stub components for scheduled/export reports (cards or table).

3. **Shared utilities**

- If needed, create small client components (e.g., tables/cards) under `src/app/(protected)/admin/utilities/components/` for reuse.

4. **Verification**

- Navigate to both routes locally to confirm they render without errors.

### To-dos

- [ ] Create `admin/layout.tsx` with SidebarProvider, AdminSidebar, AdminTopbar, ProtectedRoute
- [ ] Implement `components/admin/AdminSidebar.tsx` using `ui/sidebar` primitives and links
- [ ] Add `components/admin/AdminTopbar.tsx` with breadcrumbs, search, quick filters toolbar
- [ ] Add `components/admin/AdminBreadcrumbs.tsx` to derive labels from pathname
- [ ] Build `components/admin/AdminDataTable.tsx` with sorting, selection, pagination, toolbar
- [ ] Create `components/admin/useAdminHotkeys.ts` for navigation and actions
- [ ] Refactor UpdateQueueClient to AdminDataTable + bulk actions + URL sync
- [ ] Upgrade Moderation dashboard to consistent toolbar/table and URL sync
- [ ] Upgrade Enrichment dashboard with table/filters and URL sync
- [ ] Enhance FieldProtectionClient with toolbar/table where applicable
- [ ] Add `admin/page.tsx` with quick links and summary counts
- [ ] Unify success/error toasts and confirmations using Snackbar and ConfirmationDialog
- [ ] Add focus states/ARIA to table and toolbar; verify keyboard-only flows
- [ ] Run visual checks and capture 1440px screenshots for all admin pages
- [ ] Create `/admin/utilities/activity` page with admin-friendly placeholder content
- [ ] Create `/admin/utilities/reports` page with report placeholders
- [ ] Verify both utility routes render via admin layout