import request from "supertest";
import { sql } from "drizzle-orm";
import { createApp } from "../server/app";
import { db } from "../server/db";
import type { User } from "../shared/schema";

export const app = createApp();

export const PASSWORD = "Password123!";

/** Empties every table except migrations, between tests. */
export async function resetDatabase() {
  const { rows } = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const tables = rows.map((r) => `"${r.tablename}"`).join(", ");
  if (tables) await db.execute(sql.raw(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`));
}

export type Agent = ReturnType<typeof request.agent>;

/** Registers a user through the API, sets their role, and returns a logged-in agent. */
export async function signUp(
  email: string,
  role: User["role"] = "public_visitor",
): Promise<{ agent: Agent; id: string }> {
  const agent = request.agent(app);
  const res = await agent
    .post("/api/auth/register")
    .send({ email, password: PASSWORD, firstName: email.split("@")[0] });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const id = res.body.user.id as string;
  if (role !== "public_visitor") {
    await db.execute(sql`UPDATE users SET role = ${role} WHERE id = ${id}`);
  }
  return { agent, id };
}

export async function query<T = Record<string, unknown>>(text: ReturnType<typeof sql>) {
  const { rows } = await db.execute(text);
  return rows as T[];
}
