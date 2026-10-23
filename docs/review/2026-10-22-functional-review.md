# Functional review, 2026-10-22

**Status: resolved (2026-10-23).** Every finding below was fixed in PR #4 and verified with
62 API tests plus two browser walkthroughs of every role at desktop and 390px width.
Not built (no screens existed and none were in scope): milestone/deliverable creation and
their auto-completion types. Known product questions left as-is: mentors can accept
applications; rejecting an accepted applicant keeps the participant role.

Original notes, kept for reference:
 Production
(https://md-genius-launchpad.vercel.app) is healthy: no 5xx in runtime logs, 40 tests pass,
type check clean. One real admin exists in production (cto@mdgeniusai.com); the database is
otherwise empty. No test files were left in the production storage bucket.

## Server findings (verified against the local API)

**High**
1. Module roadmap items auto-complete after one lesson: `getUserProgressForModule` counts only
   lessons with progress rows; use the module's lesson count (`server/storage.ts` ~1684, ~1834).
2. `GET /api/projects/:id/roadmap` writes computed statuses back, resetting waived/blocked/manual
   statuses on every read (`storage.ts` ~1704-1719). Compute for display only; persist forward-only
   from `processAutoCompletions`.
3. Deleting a module with lessons, or a lesson with progress or roadmap references, returns 500
   (FKs without ON DELETE). Delete children in a transaction or return 409 (`storage.ts` ~702, ~736).
4. `/api/roadmap` and `/current-week` use the newest project; pick the one with assignments or a
   cohort (`server/routes.ts` ~554, ~571).

**Medium**
5. Soft-deleted roadmap templates can still be assigned; no update/restore route for templates.
6. Inactive cohorts vanish from every admin screen (`/api/cohorts` is active-only). Add
   `GET /api/admin/cohorts`.
7. Inactive investors vanish and can't be reactivated (`getInvestors` active-only; `isActive`
   not updatable).
8. No way to link an investor user to an investor record (`userId` not in the admin form, stripped
   on update). Investor users get 404 on sessions and meeting requests.
9. Milestones and deliverables have no create routes; `deliverable`/`milestone` auto-completion
   can never fire. Roadmap admin UI never sends `lessonId`/`moduleId`/`autoCompletionType`.
10. `mentor_session` auto-completion counts future bookings and needs an exact participant array.
11. Manual completion leaves `completedAt` null.

**Low**
- Unknown ids on several admin PUT/DELETE routes return 200/204 instead of 404.
- FK violations (unknown cohort/template/lesson/user ids) return 500 instead of 400/404.
- Empty update bodies return 500 (`.set({})`).
- `updateModule` drops `cohortId`; `updateLesson` drops `moduleId` (moves silently ignored).
- Cohort create hides validation messages; no start < end or capacity ≥ 1 check on create;
  mentor sessions accept end before start.
- Duplicates allowed: applications per cohort, investor-cohort assignments, admin interests.
- Invalid interest level on admin create returns 500.
- Application `scores` can't be written though the UI reads `scores.total`.
- Mentors can accept applications (confirm intended); rejecting after acceptance keeps participant.
- Deleting a quiz leaves `lessons.quiz_id` dangling.

## Client findings (traced against server validation)

**Critical (block the admin setup flow)**
1. Deletes always show an error toast: the client parses JSON from 204 responses
   (`AdminRoadmapManager.tsx` ~191, `AdminCurriculumManager.tsx` ~316, ~456, ~530).
2. No UI calls `POST /api/admin/roadmap/templates/:id/assign`, and project create omits
   `cohortId`, so participants never get a roadmap.
3. Investor form has no user picker, so investor users are never linked (see server 8).
4. No UI for investor interests.
5. New mentors can't create a profile: no `/mentor-profile` link in the sidebar; admin "Edit"
   silently does nothing when the mentor has no profile.
6. AI Coach breaks after one long answer or 20 exchanges: client resends full history; server caps
   messages at 4000 chars / 40 items. Trim history client-side; relax the cap for assistant turns.
7. Invite always says "sent": UI ignores `inviteEmailSent`, and the server reports sent when
   `RESEND_API_KEY` is missing. **Set RESEND_API_KEY before inviting anyone.**

**High / medium**
8. Wrong field names: `session.scheduledTime`/`status` (Admin.tsx ~1941), `weekNumber`/`itemType`
   (ParticipantDashboard.tsx ~229, ~490, ~503), `template.title` (Roadmap.tsx ~314).
9. Cohort dates show a day early west of UTC (`toLocaleDateString` on UTC midnight).
10. Mentors see an enabled "Schedule Session" button that returns 403.
11. Quizzes are never linked to lessons or shown; lesson `duration` field doesn't exist.
12. Mentors get a silent 403 on "mark lesson complete".
13. Module "Duplicate" copies to whichever other cohort comes first; needs a target picker.
14. Logged-out users can fill the whole application, then lose it on submit (401 → /login).

**Low**
- Export button not wired (`exportApplicationsCSV` exists); many dead buttons (contact/message,
  quick actions, settings).
- Fake content shown as real: "Cohort Community" posts, Quick Resources, "Q1 2025 Demo Day",
  hardcoded "2025 Q1 cohort" banner text.

## Working end to end (verified)

Auth, registration, password reset API, sessions, security controls (35 tests), cohort create
and partial update, module/lesson/quiz create and update, module duplication, curriculum reads,
lesson progress, roadmap template and item CRUD, lesson-type auto-completion, application
submit → applicant → accepted → participant, reviewer notes, project create/update/stage with
cohort rule, artifacts ownership, mentor profile create/update, mentor session booking, admin
investor and investor-session CRUD, AI Coach on Claude (one real call verified), file uploads to
Supabase Storage (verified with signed URLs).

## Brand redesign (separate track)

Plan: `docs/design/brand-redesign-plan.md`. Logo system, favicons, manifest and OG image are in
`client/public/` (generator: `scripts/brand/build-logos.mjs`). Not yet wired into
`client/index.html` (favicon/manifest/OG tags) and no screens restyled yet.
