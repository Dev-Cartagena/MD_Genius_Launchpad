import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, PASSWORD, resetDatabase, signUp, type Agent } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
});

const day = 24 * 60 * 60 * 1000;

async function cohort(admin: Agent, extra: Record<string, unknown> = {}) {
  const res = await admin.post("/api/admin/cohorts").send({
    name: "Cohort 1",
    startDate: new Date(Date.now() - day).toISOString(),
    endDate: new Date(Date.now() + 56 * day).toISOString(),
    capacity: 20,
    ...extra,
  });
  expect(res.status).toBe(201);
  return res.body;
}

describe("user language", () => {
  it("stores the language chosen at sign-up", async () => {
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/register").send({ email: "es@test.local", password: PASSWORD, locale: "es" });
    expect(res.status).toBe(201);
    const me = await agent.get("/api/auth/user");
    expect(me.body.locale).toBe("es");
  });

  it("defaults to English and lets the user switch", async () => {
    const { agent } = await signUp("u@test.local");
    expect((await agent.get("/api/auth/user")).body.locale).toBe("en");
    const put = await agent.put("/api/auth/user/locale").send({ locale: "es" });
    expect(put.status).toBe(200);
    expect(put.body.locale).toBe("es");
    expect((await agent.get("/api/auth/user")).body.locale).toBe("es");
  });

  it("rejects unsupported languages and anonymous changes", async () => {
    const { agent } = await signUp("u@test.local");
    expect((await agent.put("/api/auth/user/locale").send({ locale: "fr" })).status).toBe(400);
    expect((await request(app).put("/api/auth/user/locale").send({ locale: "es" })).status).toBe(401);
    const bad = await request(app).post("/api/auth/register").send({ email: "x@test.local", password: PASSWORD, locale: "de" });
    expect(bad.status).toBe(400);
  });
});

describe("content translations", () => {
  it("round-trips cohort, module, lesson, template and item translations, dropping unknown fields", async () => {
    const { agent: admin } = await signUp("admin@test.local", "administrator");
    const c = await cohort(admin, {
      translations: { es: { name: "Cohorte 1", description: "Primera", hacked: "x" }, fr: { name: "Non" } },
    });
    expect(c.translations).toEqual({ es: { name: "Cohorte 1", description: "Primera" } });

    const patched = await admin.patch(`/api/admin/cohorts/${c.id}`).send({ translations: { es: { name: "Cohorte uno" } } });
    expect(patched.status).toBe(200);
    expect(patched.body.translations).toEqual({ es: { name: "Cohorte uno" } });

    const mod = await admin.post("/api/admin/modules").send({
      cohortId: c.id, title: "Foundations", week: 1, orderIndex: 1,
      translations: { es: { title: "Fundamentos", objectives: ["Validar", ""] } },
    });
    expect(mod.status).toBe(201);
    expect(mod.body.translations).toEqual({ es: { title: "Fundamentos", objectives: ["Validar", ""] } });
    const modPut = await admin.put(`/api/admin/modules/${mod.body.id}`).send({ translations: { es: { title: "Bases" } } });
    expect(modPut.body.translations).toEqual({ es: { title: "Bases" } });

    const lesson = await admin.post("/api/admin/lessons").send({
      moduleId: mod.body.id, title: "Interviews", content: "Talk to users", orderIndex: 1,
      translations: { es: { title: "Entrevistas", content: "Habla con usuarios" } },
    });
    expect(lesson.status).toBe(201);
    expect(lesson.body.translations.es.title).toBe("Entrevistas");
    const lessonPut = await admin.put(`/api/admin/lessons/${lesson.body.id}`).send({ translations: { es: { content: "Nuevo" } } });
    expect(lessonPut.body.translations).toEqual({ es: { content: "Nuevo" } });

    const tpl = await admin.post("/api/admin/roadmap/templates").send({
      name: "Fall", description: "Default", translations: { es: { name: "Otoño" } },
    });
    expect(tpl.status).toBe(201);
    expect(tpl.body.translations).toEqual({ es: { name: "Otoño" } });
    const tplPut = await admin.put(`/api/admin/roadmap/templates/${tpl.body.id}`).send({ translations: { es: { description: "Base" } } });
    expect(tplPut.body.translations).toEqual({ es: { description: "Base" } });

    const item = await admin.post(`/api/admin/roadmap/templates/${tpl.body.id}/items`).send({
      title: "Problem statement", type: "task", week: 1, orderIndex: 1,
      translations: { es: { title: "Planteamiento del problema" } },
    });
    expect(item.status).toBe(201);
    expect(item.body.translations).toEqual({ es: { title: "Planteamiento del problema" } });
    const itemPatch = await admin.patch(`/api/admin/roadmap/items/${item.body.id}`).send({ translations: { es: { description: "Un párrafo" } } });
    expect(itemPatch.body.translations).toEqual({ es: { description: "Un párrafo" } });
  });

  it("serves translated quiz text to participants without any answers", async () => {
    const { agent: admin } = await signUp("admin@test.local", "administrator");
    const { agent: participant } = await signUp("p@test.local", "participant");
    const quiz = await admin.post("/api/admin/quizzes").send({
      title: "Q", passThreshold: 50, maxAttempts: 2,
      questions: [{ question: "2+2?", options: ["3", "4"], correctAnswer: 1 }],
      translations: { es: { title: "C", questions: [{ question: "¿2+2?", options: ["3", "4"], correctAnswer: 0 }] } },
    });
    expect(quiz.status).toBe(201);
    expect(quiz.body.translations.es.questions[0]).toEqual({ question: "¿2+2?", options: ["3", "4"] });

    const seen = await participant.get(`/api/quizzes/${quiz.body.id}`);
    expect(seen.status).toBe(200);
    expect(seen.body.translations.es.questions).toEqual([{ question: "¿2+2?", options: ["3", "4"] }]);
    expect(JSON.stringify(seen.body)).not.toContain("correctAnswer");
  });
});
