import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { sql } from "drizzle-orm";
import { app, resetDatabase, signUp, query, PASSWORD } from "./helpers";
import { ownerOfPath } from "../server/fileStorage";

beforeEach(async () => {
  await resetDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function nextWeek(hour: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe("session booking", () => {
  it("books a mentor with ISO date strings and sets participants on the server", async () => {
    const mentor = await signUp("mentor@test.local", "mentor");
    const p = await signUp("p@test.local", "participant");
    const other = await signUp("other@test.local", "participant");

    const res = await p.agent.post("/api/sessions/book").send({
      mentorId: mentor.id, title: "Intro", startTime: nextWeek(10), endTime: nextWeek(11),
      participantIds: [other.id],
    });
    expect(res.status).toBe(201);
    expect(res.body.participantIds).toEqual([p.id]);

    const mine = await p.agent.get("/api/participant/sessions");
    expect(mine.body.length).toBe(1);

    const mentees = await mentor.agent.get("/api/mentors/mentees");
    expect(mentees.status).toBe(200);
    expect(mentees.body[0]).toMatchObject({ id: p.id, sessionCount: 1 });
  });

  it("rejects overlapping bookings and non-mentor targets", async () => {
    const mentor = await signUp("mentor@test.local", "mentor");
    const p = await signUp("p@test.local", "participant");
    const notMentor = await signUp("x@test.local", "participant");
    const book = (mentorId: string, start: number, end: number) =>
      p.agent.post("/api/sessions/book").send({ mentorId, title: "S", startTime: nextWeek(start), endTime: nextWeek(end) });

    expect((await book(mentor.id, 10, 11)).status).toBe(201);
    expect((await book(mentor.id, 10, 12)).status).toBe(409);
    expect((await book(notMentor.id, 13, 14)).status).toBe(404);
    expect((await book(mentor.id, 15, 14)).status).toBe(400);
  });

  it("books an investor session", async () => {
    const p = await signUp("p@test.local", "participant");
    const [investor] = await query<{ id: string }>(sql`INSERT INTO investors (organization) VALUES ('Fund') RETURNING id`);
    const res = await p.agent.post("/api/investor-sessions/book").send({
      investorId: investor.id, title: "Pitch", startTime: nextWeek(9), endTime: nextWeek(10),
    });
    expect(res.status).toBe(201);
  });
});

describe("password reset and invites", () => {
  function captureEmailLink() {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });
    return () => {
      const match = logs.join("\n").match(/reset-password\?token=([a-f0-9]+)/);
      return match?.[1];
    };
  }

  it("resets a password with the emailed token, once", async () => {
    await signUp("a@test.local");
    const token = captureEmailLink();

    const forgot = await request(app).post("/api/auth/forgot-password").send({ email: "A@test.local" });
    expect(forgot.status).toBe(200);
    const t = token();
    expect(t).toBeTruthy();

    const reset = await request(app).post("/api/auth/reset-password").send({ token: t, password: "NewPassword456!" });
    expect(reset.status).toBe(200);
    const again = await request(app).post("/api/auth/reset-password").send({ token: t, password: "Another789!" });
    expect(again.status).toBe(400);

    const login = await request(app).post("/api/auth/login").send({ email: "a@test.local", password: "NewPassword456!" });
    expect(login.status).toBe(200);
  });

  it("gives the same answer for unknown emails", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({ email: "nobody@test.local" });
    expect(res.status).toBe(200);
  });

  it("invites a user who then sets a password", async () => {
    const admin = await signUp("admin@test.local", "administrator");
    const token = captureEmailLink();
    const invite = await admin.agent.post("/api/admin/users/invite").send({ email: "New@test.local", role: "mentor" });
    expect(invite.status).toBe(201);
    expect(invite.body.email).toBe("new@test.local");

    const set = await request(app).post("/api/auth/reset-password").send({ token: token(), password: PASSWORD });
    expect(set.status).toBe(200);
    const login = await request(app).post("/api/auth/login").send({ email: "new@test.local", password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("mentor");
  });
});

describe("API behavior", () => {
  it("returns JSON 404 for unknown API routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
  });

  it("returns 400 JSON for malformed JSON bodies", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(res.status).toBe(400);
    expect(res.body.message).toBeTruthy();
  });

  it("returns null when a participant has no roadmap", async () => {
    const p = await signUp("p@test.local", "participant");
    const res = await p.agent.get("/api/roadmap");
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("lists public and own projects for participants, all for investors", async () => {
    const owner = await signUp("owner@test.local", "participant");
    const other = await signUp("other@test.local", "participant");
    const investorUser = await signUp("inv@test.local", "investor");
    await owner.agent.post("/api/projects").send({ name: "Private" });
    await owner.agent.post("/api/projects").send({ name: "Public", isPublic: true });

    const forOther = await other.agent.get("/api/projects");
    expect(forOther.body.map((p: any) => p.name)).toEqual(["Public"]);
    const forInvestor = await investorUser.agent.get("/api/projects");
    expect(forInvestor.body.length).toBe(2);
  });

  it("lets investors request a meeting and list their interests", async () => {
    const owner = await signUp("owner@test.local", "participant");
    const investorUser = await signUp("inv@test.local", "investor");
    await query(sql`INSERT INTO investors (user_id, organization) VALUES (${investorUser.id}, 'Fund')`);
    const project = await owner.agent.post("/api/projects").send({ name: "Startup", isPublic: true });

    const req1 = await investorUser.agent.post("/api/investor/meetings").send({ startupId: project.body.id, message: "Let's talk" });
    expect(req1.status).toBe(201);
    expect(req1.body.level).toBe("requested_info");

    const list = await investorUser.agent.get("/api/investor/interests");
    expect(list.body[0]).toMatchObject({ projectName: "Startup" });
  });

  it("refuses upload URLs when storage is not configured", async () => {
    const p = await signUp("p@test.local", "participant");
    const res = await p.agent.post("/api/uploads").send({ fileName: "deck.pdf", contentType: "application/pdf", size: 1000 });
    expect(res.status).toBe(503);
    const tooBig = await p.agent.post("/api/uploads").send({ fileName: "x.pdf", contentType: "application/pdf", size: 50 * 1024 * 1024 });
    expect(tooBig.status).toBe(400);
  });

  it("parses file owners only from well-formed paths", () => {
    const id = "8f652628-6513-435c-b4d7-e6edf37dee6b";
    expect(ownerOfPath(`${id}/00000000-0000-4000-8000-000000000000/deck.pdf`)).toBe(id);
    expect(ownerOfPath(`${id}/../other/deck.pdf`)).toBeNull();
    expect(ownerOfPath(`deck.pdf`)).toBeNull();
  });

  it("logs out with POST /api/auth/logout", async () => {
    const p = await signUp("p@test.local", "participant");
    expect((await p.agent.post("/api/auth/logout")).status).toBe(200);
    expect((await p.agent.get("/api/auth/user")).status).toBe(401);
  });
});
