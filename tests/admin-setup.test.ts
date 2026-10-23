import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { resetDatabase, signUp, query, type Agent } from "./helpers";
import { aiCoachService } from "../server/aiCoach";

beforeEach(async () => {
  await resetDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ANTHROPIC_API_KEY;
});

const day = 24 * 60 * 60 * 1000;

async function cohort(admin: Agent, overrides: Record<string, unknown> = {}) {
  const res = await admin.post("/api/admin/cohorts").send({
    name: "Cohort 1",
    startDate: new Date(Date.now() - day).toISOString(),
    endDate: new Date(Date.now() + 56 * day).toISOString(),
    capacity: 20,
    ...overrides,
  });
  if (res.status !== 201) throw new Error(`cohort: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.id as string;
}

async function accept(userId: string, cohortId: string) {
  await query(sql`INSERT INTO applications (user_id, cohort_id, status) VALUES (${userId}, ${cohortId}, 'accepted')`);
}

/** Admin + participant with a project in a cohort, a module with 3 lessons, and a template. */
async function setup() {
  const admin = await signUp("admin@test.local", "administrator");
  const p = await signUp("p@test.local", "participant");
  const cohortId = await cohort(admin.agent);
  await accept(p.id, cohortId);
  const mod = await admin.agent.post("/api/admin/modules").send({ cohortId, title: "M1", week: 1, orderIndex: 1 });
  const lessons: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const l = await admin.agent.post("/api/admin/lessons").send({ moduleId: mod.body.id, title: `L${i}`, orderIndex: i });
    lessons.push(l.body.id);
  }
  const tpl = await admin.agent.post("/api/admin/roadmap/templates").send({ name: "Default", cohortId, isDefault: true });
  return { admin, p, cohortId, moduleId: mod.body.id as string, lessons, templateId: tpl.body.id as string };
}

describe("roadmap auto-completion", () => {
  it("completes a module item only when every lesson in the module is done", async () => {
    const { admin, p, moduleId, lessons, templateId } = await setup();
    await admin.agent.post(`/api/admin/roadmap/templates/${templateId}/items`).send({
      type: "learning", title: "Finish M1", week: 1, orderIndex: 1, moduleId, autoCompletionType: "module",
    });
    const project = await p.agent.post("/api/projects").send({ name: "P" });
    expect(project.body.cohortId).toBeTruthy(); // defaulted to the accepted cohort

    await p.agent.post(`/api/progress/lesson/${lessons[0]}/complete`).send({});
    let roadmap = await p.agent.get(`/api/projects/${project.body.id}/roadmap`);
    expect(roadmap.body.items[0].assignment.status).toBe("not_started");
    expect(roadmap.body.items[0].progressData).toMatchObject({ totalLessons: 3, completedLessons: 1 });

    await p.agent.post(`/api/progress/lesson/${lessons[1]}/complete`).send({});
    await p.agent.post(`/api/progress/lesson/${lessons[2]}/complete`).send({});
    roadmap = await p.agent.get(`/api/projects/${project.body.id}/roadmap`);
    expect(roadmap.body.items[0].assignment.status).toBe("completed");
    expect(roadmap.body.items[0].assignment.completedAt).toBeTruthy();
  });

  it("never overwrites a waived status when the roadmap is read", async () => {
    const { admin, p, lessons, templateId } = await setup();
    await admin.agent.post(`/api/admin/roadmap/templates/${templateId}/items`).send({
      type: "learning", title: "Do L2", week: 1, orderIndex: 1, lessonId: lessons[1], autoCompletionType: "lesson",
    });
    const project = await p.agent.post("/api/projects").send({ name: "P" });
    const roadmap = await p.agent.get(`/api/projects/${project.body.id}/roadmap`);
    const assignmentId = roadmap.body.items[0].assignment.id;

    await p.agent.patch(`/api/roadmap/assignments/${assignmentId}/status`).send({ status: "waived" });
    const again = await p.agent.get(`/api/projects/${project.body.id}/roadmap`);
    expect(again.body.items[0].assignment.status).toBe("waived");
  });

  it("sets completedAt on manual completion", async () => {
    const { admin, p, templateId } = await setup();
    await admin.agent.post(`/api/admin/roadmap/templates/${templateId}/items`).send({ type: "task", title: "T", week: 1, orderIndex: 1 });
    const project = await p.agent.post("/api/projects").send({ name: "P" });
    const roadmap = await p.agent.get(`/api/projects/${project.body.id}/roadmap`);
    const res = await p.agent
      .patch(`/api/roadmap/assignments/${roadmap.body.items[0].assignment.id}/status`)
      .send({ status: "completed" });
    expect(res.body.completedAt).toBeTruthy();
  });

  it("counts only mentor sessions that have ended", async () => {
    const { admin, p, templateId } = await setup();
    const mentor = await signUp("mentor@test.local", "mentor");
    await admin.agent.post(`/api/admin/roadmap/templates/${templateId}/items`).send({
      type: "checkin", title: "Meet mentor", week: 1, orderIndex: 1, autoCompletionType: "mentor_session",
    });
    const project = await p.agent.post("/api/projects").send({ name: "P" });
    const future = new Date(Date.now() + 7 * day);
    await p.agent.post("/api/sessions/book").send({
      mentorId: mentor.id, title: "Intro", startTime: future.toISOString(), endTime: new Date(future.getTime() + 3600e3).toISOString(),
    });
    let roadmap = await p.agent.get(`/api/projects/${project.body.id}/roadmap`);
    expect(roadmap.body.items[0].assignment.status).toBe("not_started");

    await query(sql`UPDATE mentor_sessions SET start_time = now() - interval '2 hours', end_time = now() - interval '1 hour'`);
    roadmap = await p.agent.get(`/api/projects/${project.body.id}/roadmap`);
    expect(roadmap.body.items[0].assignment.status).toBe("completed");
  });

  it("uses the project that has a roadmap for /api/roadmap", async () => {
    const { admin, p, templateId } = await setup();
    await admin.agent.post(`/api/admin/roadmap/templates/${templateId}/items`).send({ type: "task", title: "T", week: 1, orderIndex: 1 });
    await p.agent.post("/api/projects").send({ name: "With roadmap" });
    await query(sql`UPDATE applications SET status = 'rejected'`); // next project gets no cohort
    await p.agent.post("/api/projects").send({ name: "Newer, no cohort" });
    const res = await p.agent.get("/api/roadmap");
    expect(res.body?.items?.length).toBe(1);
  });
});

describe("curriculum and template management", () => {
  it("deletes a module with lessons and progress, and unlinks roadmap items", async () => {
    const { admin, p, moduleId, lessons, templateId } = await setup();
    const item = await admin.agent.post(`/api/admin/roadmap/templates/${templateId}/items`).send({
      type: "learning", title: "L1", week: 1, orderIndex: 1, lessonId: lessons[0], autoCompletionType: "lesson",
    });
    await p.agent.post(`/api/progress/lesson/${lessons[0]}/complete`).send({});

    expect((await admin.agent.delete(`/api/admin/modules/${moduleId}`)).status).toBe(204);
    const [left] = await query<{ n: number }>(sql`SELECT count(*)::int AS n FROM lessons`);
    expect(left.n).toBe(0);
    const [unlinked] = await query<{ lesson_id: string | null; auto_completion_type: string }>(
      sql`SELECT lesson_id, auto_completion_type FROM roadmap_items WHERE id = ${item.body.id}`,
    );
    expect(unlinked).toEqual({ lesson_id: null, auto_completion_type: "none" });
    expect((await admin.agent.delete(`/api/admin/modules/${moduleId}`)).status).toBe(404);
  });

  it("refuses to assign an archived template until it is restored", async () => {
    const { admin, p, templateId } = await setup();
    const project = await p.agent.post("/api/projects").send({ name: "P" });
    expect((await admin.agent.delete(`/api/admin/roadmap/templates/${templateId}`)).status).toBe(204);

    const list = await admin.agent.get("/api/admin/roadmap/templates");
    expect(list.body.find((t: any) => t.id === templateId).isActive).toBe(false);
    const assign = () => admin.agent.post(`/api/admin/roadmap/templates/${templateId}/assign`).send({ projectId: project.body.id });
    expect((await assign()).status).toBe(409);

    await admin.agent.put(`/api/admin/roadmap/templates/${templateId}`).send({ isActive: true });
    expect((await assign()).status).toBe(201);
  });

  it("lists inactive cohorts for admins and validates cohort input", async () => {
    const admin = await signUp("admin@test.local", "administrator");
    const id = await cohort(admin.agent);
    await admin.agent.patch(`/api/admin/cohorts/${id}`).send({ isActive: false });
    expect((await admin.agent.get("/api/cohorts")).body).toEqual([]);
    expect((await admin.agent.get("/api/admin/cohorts")).body.length).toBe(1);

    const badDates = await admin.agent.post("/api/admin/cohorts").send({
      name: "Bad", startDate: "2026-12-01", endDate: "2026-11-01", capacity: 10,
    });
    expect(badDates.status).toBe(400);
    expect(badDates.body.message).toMatch(/after start/);
    expect((await admin.agent.post("/api/admin/cohorts").send({ name: "X", startDate: "2026-12-01", endDate: "2027-01-01", capacity: 0 })).status).toBe(400);
    expect((await admin.agent.patch(`/api/admin/cohorts/${id}`).send({})).status).toBe(400);
  });

  it("returns 400 for unknown references instead of 500", async () => {
    const admin = await signUp("admin@test.local", "administrator");
    const res = await admin.agent.post("/api/admin/modules").send({ cohortId: "nope", title: "M", week: 1, orderIndex: 1 });
    expect(res.status).toBe(400);
  });

  it("can move a lesson to another module", async () => {
    const { admin, cohortId, lessons } = await setup();
    const other = await admin.agent.post("/api/admin/modules").send({ cohortId, title: "M2", week: 2, orderIndex: 2 });
    const moved = await admin.agent.put(`/api/admin/lessons/${lessons[0]}`).send({ moduleId: other.body.id });
    expect(moved.body.moduleId).toBe(other.body.id);
  });
});

describe("quizzes", () => {
  async function quizSetup() {
    const s = await setup();
    const quiz = await s.admin.agent.post("/api/admin/quizzes").send({
      title: "Q", passThreshold: 50, maxAttempts: 2,
      questions: [
        { question: "2+2?", options: ["3", "4"], correctAnswer: 1 },
        { question: "Sky?", options: ["blue", "green"], correctAnswer: 0 },
      ],
    });
    await s.admin.agent.put(`/api/admin/lessons/${s.lessons[0]}`).send({ quizId: quiz.body.id });
    return { ...s, quizId: quiz.body.id as string };
  }

  it("hides answers and scores attempts on the server", async () => {
    const { p, quizId, lessons } = await quizSetup();
    const quiz = await p.agent.get(`/api/quizzes/${quizId}`);
    expect(quiz.body.questions[0]).toEqual({ question: "2+2?", options: ["3", "4"] });

    const fail = await p.agent.post(`/api/lessons/${lessons[0]}/quiz/submit`).send({ answers: [0, 1] });
    expect(fail.body).toMatchObject({ score: 0, passed: false, attempts: 1 });
    const pass = await p.agent.post(`/api/lessons/${lessons[0]}/quiz/submit`).send({ answers: [1, 0] });
    expect(pass.body).toMatchObject({ score: 100, passed: true, attempts: 2 });
    const progress = await p.agent.get(`/api/progress/lesson/${lessons[0]}`);
    expect(progress.body.isCompleted).toBe(true);
  });

  it("stops after the maximum number of failed attempts", async () => {
    const { p, lessons } = await quizSetup();
    await p.agent.post(`/api/lessons/${lessons[0]}/quiz/submit`).send({ answers: [0, 1] });
    await p.agent.post(`/api/lessons/${lessons[0]}/quiz/submit`).send({ answers: [0, 1] });
    expect((await p.agent.post(`/api/lessons/${lessons[0]}/quiz/submit`).send({ answers: [1, 0] })).status).toBe(409);
  });

  it("unlinks a deleted quiz from its lesson", async () => {
    const { admin, quizId, lessons } = await quizSetup();
    expect((await admin.agent.delete(`/api/admin/quizzes/${quizId}`)).status).toBe(204);
    const [row] = await query<{ quiz_id: string | null }>(sql`SELECT quiz_id FROM lessons WHERE id = ${lessons[0]}`);
    expect(row.quiz_id).toBeNull();
  });
});

describe("people management", () => {
  it("links investor users to investor records with checks", async () => {
    const admin = await signUp("admin@test.local", "administrator");
    const inv = await signUp("inv@test.local", "investor");
    const notInv = await signUp("x@test.local", "participant");

    expect((await admin.agent.post("/api/admin/investors").send({ organization: "Bad", userId: notInv.id })).status).toBe(400);
    const a = await admin.agent.post("/api/admin/investors").send({ organization: "Fund A", userId: inv.id });
    expect(a.status).toBe(201);
    const b = await admin.agent.post("/api/admin/investors").send({ organization: "Fund B" });
    expect((await admin.agent.put(`/api/admin/investors/${b.body.id}`).send({ userId: inv.id })).status).toBe(409);

    // The linked investor can now use investor features.
    expect((await inv.agent.get("/api/investor/sessions")).status).toBe(200);

    await admin.agent.delete(`/api/admin/investors/${a.body.id}`);
    const all = await admin.agent.get("/api/admin/investors");
    expect(all.body.find((i: any) => i.id === a.body.id).isActive).toBe(false);
    const back = await admin.agent.put(`/api/admin/investors/${a.body.id}`).send({ isActive: true });
    expect(back.body.isActive).toBe(true);
    expect((await admin.agent.put(`/api/admin/investors/nope`).send({ organization: "Z" })).status).toBe(404);
  });

  it("prevents duplicate cohort assignments and interests", async () => {
    const admin = await signUp("admin@test.local", "administrator");
    const owner = await signUp("p@test.local", "participant");
    const cohortId = await cohort(admin.agent);
    const inv = await admin.agent.post("/api/admin/investors").send({ organization: "Fund" });
    const assign = () => admin.agent.post(`/api/admin/investors/${inv.body.id}/cohorts`).send({ cohortId });
    expect((await assign()).status).toBe(201);
    expect((await assign()).status).toBe(409);

    const project = await owner.agent.post("/api/projects").send({ name: "P" });
    const interest = (level: string) =>
      admin.agent.post("/api/admin/investor-interests").send({ investorId: inv.body.id, projectId: project.body.id, level });
    expect((await interest("viewed")).status).toBe(201);
    expect((await interest("diligence")).status).toBe(201);
    expect((await interest("hot")).status).toBe(400);
    const [n] = await query<{ n: number }>(sql`SELECT count(*)::int AS n FROM investor_interests`);
    expect(n.n).toBe(1);
  });

  it("lets admins create a profile for a new mentor", async () => {
    const admin = await signUp("admin@test.local", "administrator");
    const mentor = await signUp("m@test.local", "mentor");
    const res = await admin.agent.post("/api/admin/mentors").send({ userId: mentor.id, bio: "Hi", expertise: ["AI"] });
    expect(res.status).toBe(201);
    expect((await admin.agent.post("/api/admin/mentors").send({ userId: mentor.id })).status).toBe(409);
  });

  it("reports that invites were not emailed when email is not configured", async () => {
    const admin = await signUp("admin@test.local", "administrator");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await admin.agent.post("/api/admin/users/invite").send({ email: "new@test.local" });
    expect(res.status).toBe(201);
    expect(res.body.inviteEmailSent).toBe(false);
  });

  it("blocks a second application to the same cohort", async () => {
    const admin = await signUp("admin@test.local", "administrator");
    const a = await signUp("a@test.local");
    const cohortId = await cohort(admin.agent);
    expect((await a.agent.post("/api/applications/submit").send({ cohortId })).status).toBe(201);
    expect((await a.agent.post("/api/applications/submit").send({ cohortId })).status).toBe(409);
  });
});

describe("AI Coach history", () => {
  it("accepts long assistant replies in the history", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    vi.spyOn(aiCoachService, "generateResponse").mockResolvedValue({ message: "ok", sources: [], confidence: 1, suggestedActions: [] });
    const p = await signUp("p@test.local", "participant");
    const res = await p.agent.post("/api/ai-coach/chat").send({
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "x".repeat(15000) },
        { role: "user", content: "more" },
      ],
    });
    expect(res.status).toBe(200);
  });
});
