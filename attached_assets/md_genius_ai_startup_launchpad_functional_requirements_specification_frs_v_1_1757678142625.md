# MD Genius AI Startup Launchpad — Functional Requirements Specification (FRS) v1.0

**Owner:** MD Genius  
**Prepared for:** Launchpad Core Team (Program, Product, Legal, Partnerships)  
**Date:** 2025‑09‑12  
**Scope:** End‑to‑end web application enabling applicants, accepted participants, mentors, investors, and administrators to recruit, select, train, accelerate, fund, and showcase AI startups.

---

## 1) Purpose & Objectives
1.1 The system shall provide a full lifecycle platform for the MD Genius Launchpad: talent acquisition → selection → 2‑month cohort enablement → venture readiness → investor engagement → funding & disbursement.  
1.2 The system shall centralize data, workflows, and communications across stakeholders while maintaining security, privacy, auditability, and program transparency.  
1.3 The system shall embed an AI Coach Agent to guide users through process, learning, venture design, and investor preparation (OpenAI model "gpt‑5‑mini").

---

## 2) User Roles & Permissions
2.1 Roles:
- **Public Visitor**: Reads public information; can start an application.
- **Applicant**: Creates account, submits application, tracks status.
- **Participant (Accepted)**: Accesses cohort workspace, curriculum, resources, AI Coach; submits deliverables; tracks progress.
- **Mentor**: Manages profile & availability; hosts sessions; provides feedback & scores.
- **Investor**: Views startup directory and Demo Day assets; requests meetings; submits interest and due‑diligence requests (subject to gating/permissions).
- **Administrator**: Full program setup & governance; manages users, cohorts, curriculum, selection, funding, investors, reporting.

2.2 Permissioning:
- The system shall enforce role‑based access control (RBAC) to features and records.  
- The system shall support per‑object permissions for sensitive artifacts (e.g., deck access gated by NDA).

---

## 3) Global Functional Requirements
3.1 **Localization:** The system shall support **English/Spanish** throughout (UI, content, system emails, AI Coach).  
3.2 **Responsive UX:** The system shall render effectively on desktop, tablet, and mobile.  
3.3 **Accessibility:** The system shall meet inclusive design guidelines (keyboard navigation, semantic structure, contrast).  
3.4 **Notifications:** In‑app and email notifications with user‑level preferences.  
3.5 **Search & Filter:** Global search across people, projects, resources; module‑level filters and tags.  
3.6 **Audit Trail:** The system shall log key user actions and state transitions (applications, selections, funding, content access).  
3.7 **E‑Signature:** The system shall support legally binding e‑signature for the **MD Genius Launchpad Commitment**, NDAs, and policy acknowledgements.  
3.8 **Data Export:** Authorized roles can export lists, reports, and selected datasets to CSV/JSON.  
3.9 **Brand & Theming:** Enforce the UX/UI specifications in §18.

---

## 4) Public & Application Module
4.1 Public pages shall include program overview, eligibility, timeline, FAQs, mentors, partners, and Demo Day highlights.  
4.2 The system shall provide an **Apply Now** flow requiring account creation with email verification.  
4.3 Application data shall include: personal profile, education/experience, skills matrix, links (CV/GitHub/portfolio), idea readiness (if any), availability, location/timezone, consent to terms & privacy.  
4.4 The system shall support uploading required documents and recorded answers (optional).  
4.5 The system shall allow Applicants to save draft and submit; display an application **status tracker** with milestones.  
4.6 System emails: submission confirmation; missing items reminders; interview invitations; decision outcomes.

---

## 5) Identity, Accounts & Profiles
5.1 Users shall authenticate with email/password and optional multi‑factor.  
5.2 Profiles shall include bio, skills taxonomy (CS/AI/ML/Agents/etc.), interests, industry focus, and availability.  
5.3 Users shall manage profile visibility settings (e.g., visible to mentors/investors).  
5.4 The system shall store signed commitments and policy acknowledgements within each user’s record.

---

## 6) Selection & Onboarding Workflow
6.1 **Reviewer Console:** Admin/Mentors can score applications against configurable rubrics (technical depth, founder‑market fit, problem clarity, traction).  
6.2 **Shortlisting:** Admin can bulk shortlist, request interviews/technical tasks, or reject with reason codes.  
6.3 **Interviews:** Scheduling, interview kits, score capture, notes, and decision recommendation.  
6.4 **Decisions:** Offer, waitlist, or rejection; automated communications.  
6.5 **Onboarding:** E‑sign the **Launchpad Commitment**, assign to cohort, unlock Participant Portal.

---

## 7) Participant Portal (2‑Month Program)
7.1 **Dashboard:** Shows cohort dates, progress bar, next actions, session calendar, mentor matches, deliverables due, and announcements.  
7.2 **Curriculum:** Structured modules (weeks → lessons → activities) with readings, templates, and quizzes.  
7.3 **Milestones:** Program milestones (e.g., Problem Definition, Validation, MVP Scope, GTM, Pitch) with acceptance criteria and required artifacts.  
7.4 **Deliverables:** Participants submit artifacts (one‑pager, lean canvas, PRD, data plan, model card, ethics checklist, pitch deck, 3‑min video).  
7.5 **Feedback Loops:** Mentors provide rubric scores and qualitative feedback; revision requests; pass/fail per milestone.  
7.6 **Calendar:** Cohort schedule, office hours, workshops, mentor sessions, Demo Day.  
7.7 **Team Formation:** Optional team creation/merge; invite collaborators; role tagging (CEO/CTO/PM/DS).  
7.8 **Knowledge Hub:** Access to templates, best practices, recorded sessions, reading lists.  
7.9 **Community:** Discussion threads, resource sharing, announcements.  
7.10 **Readiness Score:** Computed venture readiness index aggregating milestone completion, feedback, and traction signals.

---

## 8) Mentor Portal
8.1 **Mentor Profile:** Expertise domains, availability, biography, industries.  
8.2 **Scheduling:** Set office hours; accept/decline 1:1 bookings; reschedule; session reminders.  
8.3 **Session Workspace:** Agenda, notes, attachments, action items; private mentor notes vs. shareable feedback.  
8.4 **Scoring & Reviews:** Submit rubric scores on milestones and pitch practice; tag risks and suggested next steps.  
8.5 **Cohort View:** Track mentee progress, open deliverables, and upcoming sessions.

---

## 9) Program Management (Admin)
9.1 **Cohorts:** Create/manage cohorts (dates, capacity, selection windows).  
9.2 **Curriculum Builder:** Author modules, lessons, quizzes; attach resources; set prerequisites and completion rules.  
9.3 **Rubrics & Forms:** Configure evaluation rubrics, application forms, milestone templates, and review forms.  
9.4 **Content Library:** Upload/manage templates (lean canvas, PRD, data ethics, ICP, GTM, financial model, data room checklist).  
9.5 **Scheduling:** Publish calendar, sessions, rooms/links; manage attendance.  
9.6 **Automations:** Triggered notifications (e.g., overdue deliverables, meeting follow‑ups, selection decisions).  
9.7 **Compliance Center:** Manage agreements (Commitment, NDA, Code of Conduct, IP & Confidentiality), versioning, and acknowledgements.  
9.8 **Directory Management:** Curate mentor and investor directories; set visibility rules.  
9.9 **Governance:** Manage roles, permissions, custom fields, and data retention settings.

---

## 10) Project & Idea Management
10.1 **Idea Registration:** Structured form capturing problem, target users, market sizing, differentiation, AI components (e.g., agents, ML), data needs, risks, and ethical considerations.  
10.2 **Stage‑Gate Pipeline:** States: Ideation → Validation → MVP Build → Pilot/Traction → Pitch‑Ready.  
10.3 **Artifacts Repository:** Store and version decks, one‑pagers, demos, pitch videos, data documentation, model cards.  
10.4 **Work Planning:** Backlog, tasks, owners, due dates, and status; lightweight Kanban.  
10.5 **Reviews:** Mentor/Admin can request changes; accept to advance stage; log decisions and rationale.  
10.6 **IP Disclosures:** Optional IP status and invention disclosures; access controls for sensitive content.

---

## 11) AI Coach Agent (OpenAI "gpt‑5‑mini")
11.1 **Chat Interface:** Persistent threaded conversations scoped to user role (Applicant/Participant).  
11.2 **Knowledge Packs:** The Agent shall answer using the program knowledge base (policies, syllabus, templates, checklists, examples) and public startup best‑practice content curated by Admin.  
11.3 **Modes:**
- Process Guide (deadlines, steps, checklists)
- Ideation Sparring (problem framing, solution hypotheses)
- Technical Primer (AI/ML/agents fundamentals, model evaluation)
- Go‑to‑Market Coach (ICP, JTBD, messaging)
- Pitch & Investor Coach (storyline, metrics, Q&A drills)
11.4 **RAG Behavior:** The Agent shall cite sources from the knowledge base when answering and link to relevant templates/resources.  
11.5 **Guardrails:** Disclaimers for legal/financial/medical topics; escalation to human mentor when confidence is low or user requests.  
11.6 **Feedback:** Users can rate responses; Admin can review logs to improve content.  
11.7 **Localization:** The Agent shall support English/Spanish conversation and materials.

---

## 12) Knowledge Hub / Learning
12.1 **Modules & Lessons:** Structured learning with completion tracking and prerequisites.  
12.2 **Assessments:** Quizzes with pass thresholds; issue completion badges/certificates.  
12.3 **Media:** Support video, slides, documents; download gating by cohort/role.  
12.4 **Search:** Full‑text across learning materials.

---

## 13) Investor Relations
13.1 **Investor Profiles:** Firm/individual profile, sectors, stages, geography, check size, preferences, NDA status.  
13.2 **Startup Directory:** Cohort showcase with filters; per‑startup page (summary, traction, artifacts).  
13.3 **Access Gating:** Admin can require NDA before investors view sensitive decks/data.  
13.4 **Meetings:** Investors can request meetings; Admin triages; calendar invites and confirmations.  
13.5 **Demo Day:** Event page with agenda, lineup, livestream link, startup materials, and investor interest capture.  
13.6 **Interest & Diligence:** Track investor interest level, questions, requested docs, and follow‑ups.

---

## 14) Funding & Disbursement
14.1 **Funding Types:** Grants, stipends, prizes, sponsorships.  
14.2 **Milestone‑Based Disbursement:** Participants can request disbursements against approved milestones; Admin reviews and approves/denies with reason.  
14.3 **Payments Tracking:** Store payout method metadata (non‑sensitive references), payment status, and receipts.  
14.4 **Compliance Docs:** Collect necessary forms and confirmations prior to release; maintain document vault.  
14.5 **Reporting:** Summaries by cohort/startup; disbursement timelines and outstanding requests.

---

## 15) Communications & Community
15.1 **Announcements:** Admin can post cohort or platform‑wide announcements; notify recipients.  
15.2 **Messaging:** Participant↔Mentor threads; Admin broadcast; investor Q&A on startup pages (moderated).  
15.3 **Email Digests:** Daily/weekly summaries of tasks, deadlines, and upcoming sessions.  
15.4 **Code of Conduct:** Users must accept guidelines; moderators can archive threads and flag content.

---

## 16) Analytics & Reporting
16.1 **Funnel Analytics:** Application volume, completion rates, acceptance rates by cohort.  
16.2 **Program KPIs:** Milestone completion, average mentor hours, readiness scores, quiz performance.  
16.3 **Venture KPIs:** Customer interviews, LOIs, pilots, revenue/usage proxies, tech maturity, model evaluation metrics.  
16.4 **Investor KPIs:** Interest signals, meeting conversions, commitments.  
16.5 **Funding KPIs:** Amounts granted, time to payout, milestone success.  
16.6 **Exports:** Authorized users can export reports.

---

## 17) Administration & Configuration
17.1 **Settings:** Program policies, legal text, consent flows, email templates, notification rules, localization strings.  
17.2 **Taxonomies:** Manage skills tags, industries, program tracks, artifact categories.  
17.3 **Custom Fields & Forms:** Add fields to applications, profiles, and project forms; map to reports.  
17.4 **Access Policies:** Configure which roles can see which objects and fields.  
17.5 **Data Lifecycle:** Retention schedules; archival of closed cohorts; user data export & deletion on request.

---

## 18) UX/UI Requirements (Web3 Aesthetic)
18.1 **Visual Direction:** Dark‑first with glassmorphism panels, neon gradients (cyan/blue/purple), soft glows, subtle grain/particles.  
18.2 **Motion:** Micro‑interactions (opacity/scale 150–250ms); scroll reveals (20–40px translate); respect `prefers‑reduced‑motion`.  
18.3 **Imagery:** Futuristic, people‑centric, vibe (tech accents).  
18.4 **Palette:**
- Background: `#0E1427` → `#1A2850`  
- CTA/Primary: `#01A2E9`  
- Supporting: `#006998`, `#33C0FE`, `#7333FE`; grayscale `#111/#222/#333/#666/#999/#CCC/#EEE/#FFF`  
- Gradients: blue → cyan → violet as subtle overlays/glows  
18.5 **Layout:** Card‑based dashboards, clear hierarchy, sticky action bars for forms.  
18.6 **Content Design:** Readable type scale; succinct labels; inline validation; empty‑state guidance.  
18.7 **Localization UX:** Language toggle; mirrored layouts as needed; all content translatable.

---

## 19) Data Model (Entities & Key Fields)
> *Functional specification for structure; actual schema to be derived from this model.*

- **User** (id, role, name, email, phone, locale, timezone, bio, skills[], links[], visibility, MFA, status)
- **Agreement** (id, type: Commitment/NDA/Policy, version, body, locale)
- **Signature** (id, user_id, agreement_id, timestamp, ip)
- **Application** (id, user_id, cohort_id, answers{}, uploads[], status, scores[], reviewer_notes[])
- **Cohort** (id, name, start_date, end_date, capacity, tracks[], calendar_id)
- **Lesson** (id, module_id, title, content, media[], quiz_id, prerequisites[])
- **Module** (id, cohort_id, title, week, objectives[], resources[])
- **Quiz** (id, questions[], pass_threshold, attempts)
- **Milestone** (id, cohort_id, title, criteria[], required_artifacts[])
- **Deliverable** (id, milestone_id, project_id, owner_id, files[], status, feedback[], score)
- **Project (Startup)** (id, owner_id, team_ids[], stage, summary, problem, solution, market, ai_components[], data_needs, risks, ethics, artifacts[])
- **Artifact** (id, project_id, type: deck/one‑pager/video/model‑card/etc., file_ref, version, gated)
- **MentorProfile** (id, user_id, expertise[], availability, bio)
- **Session** (id, mentor_id, participant_ids[], start, end, agenda, notes, attendance)
- **Investor** (id, org, contact, preferences, nda_status)
- **InvestorInterest** (id, investor_id, project_id, level, questions[], meetings[])
- **FundingProgram** (id, cohort_id, type, rules)
- **DisbursementRequest** (id, project_id, milestone_id, amount, docs[], status, decision_reason)
- **Message** (id, thread_id, sender_id, body, attachments[], visibility)
- **Notification** (id, user_id, type, channel, payload, read_at)
- **Rubric** (id, name, criteria[], weights)
- **Score** (id, rubric_id, subject_type, subject_id, reviewer_id, values{}, total)
- **AuditLog** (id, actor_id, action, subject_type, subject_id, timestamp, metadata)

Relationships: User 1‑to‑many Applications/Signatures/Projects/Messages; Project many‑to‑many Users (team); Project 1‑to‑many Artifacts/Deliverables/DisbursementRequests/InvestorInterest.

---

## 20) Workflow States
- **Application.status:** Draft → Submitted → Under Review → Shortlisted → Interview → Offer | Waitlist | Rejected → Accepted (Participant)  
- **Project.stage:** Ideation → Validation → MVP Build → Pilot/Traction → Pitch‑Ready  
- **Deliverable.status:** Not Started → In Progress → Submitted → Needs Revision → Approved  
- **Disbursement.status:** Draft → Submitted → Under Review → Approved | Denied → Paid  
- **InvestorInterest.level:** Viewed → Requested Info → Meeting Scheduled → Diligence → Soft Commit → Commit

Each transition shall be logged to **AuditLog** with actor and reason (where applicable).

---

## 21) Acceptance Criteria (Key Epics)
**EPIC A — Application Intake**  
A1 The system shall allow a visitor to create an account, complete an application, save as draft, and submit.  
A2 Reviewers shall score applications with configured rubrics and move candidates to interview.  
A3 Applicants shall receive status updates and can view a timeline of decisions.

**EPIC B — Participant Experience**  
B1 Accepted users shall sign the Commitment and gain access to cohort dashboard, curriculum, milestones, and calendar.  
B2 Participants shall submit deliverables, receive feedback, and advance stages upon approval.  
B3 The readiness score shall update as milestones are completed and feedback is logged.

**EPIC C — Mentorship**  
C1 Mentors shall publish availability, accept bookings, and record notes and rubric scores.  
C2 Participants shall book/reschedule sessions and receive reminders.

**EPIC D — AI Coach Agent**  
D1 Users shall chat with the Agent in EN/ES; the Agent shall cite knowledge base sources and link to resources.  
D2 Users shall rate responses; low‑confidence or sensitive queries shall prompt human escalation.

**EPIC E — Investor & Demo Day**  
E1 Investors shall browse a curated startup directory (subject to access gating) and request meetings.  
E2 Admin shall run Demo Day with startup lineup, materials, and interest capture.  
E3 Investor questions and diligence requests shall be tracked to closure.

**EPIC F — Funding & Disbursement**  
F1 Admin shall define funding rules and milestones per cohort.  
F2 Participants shall request disbursements; Admin shall approve/deny; payment status shall be tracked.

**EPIC G — Reporting**  
G1 Admin shall access dashboards for cohort health, funnel metrics, mentor utilization, readiness, investor interest, and funding.  
G2 Admin shall export selected datasets.

---

## 22) Security, Privacy & Compliance (Functional)
22.1 The system shall require consent to Terms, Privacy, and Code of Conduct; store timestamped acknowledgements.  
22.2 The system shall provide role‑based data minimization and field‑level controls for sensitive artifacts.  
22.3 The system shall provide user‑initiated data export and account deletion requests handled per policy.  
22.4 The system shall display disclaimers for AI Coach guidance and route to human support for legal/financial advice.  
22.5 The system shall mask personal contact info from non‑authorized viewers (e.g., investors prior to NDA).

---

## 23) Content & CMS
23.1 Admin shall manage public site pages, FAQs, mentor/investor showcases, blog/news, and Demo Day content.  
23.2 Admin shall localize content (EN/ES) and schedule publish/unpublish.  
23.3 Admin shall version templates and maintain a single source of truth for documents used by the AI Coach.

---

## 24) Operational Requirements (Program Ops)
24.1 Admin shall open/close application windows, cap cohorts, and manage waitlists.  
24.2 Admin shall track attendance for required sessions.  
24.3 The platform shall provide a Help Center and support contact form; critical issues shall be escalated to Admin.

---


