/**
 * Imports content/curriculum into one cohort: 8 modules, 24 lessons, 8 quizzes, 4 stage
 * milestones and a default roadmap template (one item per lesson plus the weekly exercise).
 *
 * Usage (local):      npx tsx --env-file=.env scripts/curriculum/import.ts --cohort-name "…" --start 2027-01-11 --capacity 25
 * Production:         DATABASE_URL=… DATABASE_SSL=require npx tsx scripts/curriculum/import.ts …
 *
 * Creates the cohort when no cohort has that name. Refuses to import into a cohort that
 * already has modules, so running it twice never duplicates content.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db, pool } from "../../server/db.js";
import { storage } from "../../server/storage.js";
import { sanitizeTranslations } from "../../server/translations.js";
import { cohorts, milestones, modules } from "../../shared/schema.js";

const ROOT = join(import.meta.dirname, "../../content/curriculum");
const DAY = 24 * 60 * 60 * 1000;

/** Lesson videos that exist; every other lesson gets the "video coming soon" placeholder. */
const VIDEOS: Record<string, string[]> = {
  "1.1": [
    "https://klpwffswfhfwvsuqosct.supabase.co/storage/v1/object/public/lesson-media/week-01/w01-l1-en.mp4",
    "https://klpwffswfhfwvsuqosct.supabase.co/storage/v1/object/public/lesson-media/week-01/w01-l1-es.mp4",
  ],
};
const VIDEO_PENDING = "video:pending";

const EXERCISES: Record<number, { en: string; es: string; hours: number }> = {
  1: { en: "Founder and idea memo", es: "Memo de fundadores e idea", hours: 3 },
  2: { en: "Problem statement and assumption map", es: "Planteamiento del problema y mapa de supuestos", hours: 3 },
  3: { en: "10 customer interviews and a synthesis board", es: "10 entrevistas con clientes y tablero de síntesis", hours: 4 },
  4: { en: "Market sizing and MVP experiment plan", es: "Tamaño de mercado y plan de experimento MVP", hours: 3 },
  5: { en: "Architecture one-pager and eval set", es: "One-pager de arquitectura y set de evaluación", hours: 4 },
  6: { en: "Metrics dashboard and pricing hypothesis", es: "Panel de métricas e hipótesis de precio", hours: 3 },
  7: { en: "GTM plan and 30-day sales sprint", es: "Plan de GTM y sprint de ventas de 30 días", hours: 3 },
  8: { en: "Seed deck, pitch video and investor list", es: "Pitch deck semilla, video de pitch y lista de inversionistas", hours: 4 },
};

const STAGES = [
  { week: 2, en: "Foundation complete", es: "Fundamentos completos",
    den: "Team formed, a problem worth solving defined and the riskiest assumptions mapped.",
    des: "Equipo formado, un problema que vale la pena resolver definido y los supuestos más riesgosos mapeados.",
    cen: ["Founder and idea memo reviewed by a mentor", "Problem statement and assumption map submitted"],
    ces: ["Memo de fundadores e idea revisado por un mentor", "Planteamiento del problema y mapa de supuestos entregados"] },
  { week: 4, en: "Validation complete", es: "Validación completa",
    den: "Customer evidence collected, market sized bottom-up and the first MVP experiment designed.",
    des: "Evidencia de clientes reunida, mercado dimensionado de abajo hacia arriba y el primer experimento MVP diseñado.",
    cen: ["At least 10 customer interviews synthesized", "MVP experiment plan with a pass/fail line"],
    ces: ["Al menos 10 entrevistas con clientes sintetizadas", "Plan de experimento MVP con criterio de éxito"] },
  { week: 6, en: "Development complete", es: "Desarrollo completo",
    den: "A working product in users' hands, measured with an eval set and real usage metrics.",
    des: "Un producto funcionando en manos de usuarios, medido con un set de evaluación y métricas reales de uso.",
    cen: ["Eval set of 50 or more cases", "Metrics dashboard and a pricing hypothesis"],
    ces: ["Set de evaluación de 50 casos o más", "Panel de métricas e hipótesis de precio"] },
  { week: 8, en: "Demo Day ready", es: "Lista para el Demo Day",
    den: "A go-to-market plan, a seed deck and a two-minute pitch ready for investors.",
    des: "Un plan de salida al mercado, un pitch deck semilla y un pitch de dos minutos listos para inversionistas.",
    cen: ["Seed deck reviewed by a mentor", "Two-minute pitch recorded", "Investor target list"],
    ces: ["Pitch deck semilla revisado por un mentor", "Pitch de dos minutos grabado", "Lista de inversionistas objetivo"] },
];

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`--${name} is required`);
}

const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

async function main() {
  const cohortName = arg("cohort-name");
  const start = new Date(`${arg("start")}T00:00:00Z`);
  const end = new Date(start.getTime() + 55 * DAY); // 8 weeks, Monday to Sunday
  const capacity = Number(arg("capacity", "25"));

  let [cohort] = await db.select().from(cohorts).where(eq(cohorts.name, cohortName));
  if (!cohort) {
    cohort = await storage.createCohort({
      name: cohortName,
      description: "The first MD Genius Launchpad cohort: eight weeks from idea to Demo Day for AI startups.",
      startDate: start,
      endDate: end,
      capacity,
      isActive: true,
      translations: {
        es: {
          name: arg("cohort-name-es", cohortName),
          description: "La primera cohorte de MD Genius Launchpad: ocho semanas, de la idea al Demo Day, para startups de IA.",
        },
      },
    } as any);
    console.log(`created cohort ${cohort.name} (${cohort.id}) ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`);
  } else {
    console.log(`using cohort ${cohort.name} (${cohort.id})`);
  }

  const existing = await db.select({ id: modules.id }).from(modules).where(eq(modules.cohortId, cohort.id));
  if (existing.length > 0) throw new Error(`cohort already has ${existing.length} modules; nothing imported`);

  const template = await storage.createRoadmapTemplate({
    name: "Launchpad 8-week program",
    description: "Weekly lessons and exercises for the MD Genius Launchpad curriculum.",
    cohortId: cohort.id,
    isDefault: true,
    isActive: true,
    translations: { es: { name: "Programa Launchpad de 8 semanas", description: "Lecciones y ejercicios semanales del currículo de MD Genius Launchpad." } },
  } as any);

  let lessonCount = 0;
  for (let w = 1; w <= 8; w++) {
    const dir = `week-${String(w).padStart(2, "0")}`;
    if (!existsSync(join(ROOT, dir, "module.json"))) continue;
    const m = JSON.parse(read(`${dir}/module.json`));
    const q = JSON.parse(read(`${dir}/quiz.json`));

    const mod = await storage.createModule({
      cohortId: cohort.id,
      week: w,
      orderIndex: m.orderIndex ?? w,
      title: m.title,
      description: m.description,
      objectives: m.objectives,
      resources: m.resources,
      translations: { es: m.translations?.es ?? {} },
    } as any);

    const quiz = await storage.createQuiz({
      title: q.title,
      passThreshold: q.passThreshold ?? 70,
      maxAttempts: q.maxAttempts ?? 3,
      questions: q.questions.map((x: any) => ({ question: x.question, options: x.options, correctAnswer: x.correctAnswer, explanation: x.explanation })),
      translations: { es: q.translations?.es ?? {} },
    } as any);

    let order = 0;
    for (const l of m.lessons) {
      const key = `${w}.${l.orderIndex}`;
      const isLast = l.orderIndex === m.lessons.length;
      const lesson = await storage.createLesson({
        moduleId: mod.id,
        orderIndex: l.orderIndex,
        title: l.title,
        content: read(`${dir}/${l.file}.en.md`),
        media: VIDEOS[key] ?? [VIDEO_PENDING],
        quizId: isLast ? quiz.id : null,
        translations: { es: { title: l.es, content: read(`${dir}/${l.file}.es.md`) } },
      } as any);
      lessonCount++;
      await storage.createRoadmapItem({
        templateId: template.id,
        type: "learning",
        title: l.title,
        description: m.description,
        week: w,
        orderIndex: ++order,
        dueOffsetDays: (w - 1) * 7 + l.orderIndex * 2 - 1,
        moduleId: mod.id,
        lessonId: lesson.id,
        autoCompletionType: "lesson",
        estimatedHours: 1,
        translations: { es: { title: l.es, description: m.translations?.es?.description } },
      } as any);
    }

    const ex = EXERCISES[w];
    await storage.createRoadmapItem({
      templateId: template.id,
      type: "assignment",
      title: `Exercise: ${ex.en}`,
      description: read(`${dir}/exercise.en.md`),
      week: w,
      orderIndex: ++order,
      dueOffsetDays: w * 7 - 1,
      moduleId: mod.id,
      autoCompletionType: "none",
      estimatedHours: ex.hours,
      translations: { es: { title: `Ejercicio: ${ex.es}`, description: read(`${dir}/exercise.es.md`) } },
    } as any);
    console.log(`week ${w}: ${m.title} (${m.lessons.length} lessons, quiz, exercise)`);
  }

  for (const [i, s] of STAGES.entries()) {
    await db.insert(milestones).values({
      cohortId: cohort.id,
      title: s.en,
      description: s.den,
      criteria: s.cen,
      dueDate: new Date(start.getTime() + (s.week * 7 - 1) * DAY),
      orderIndex: i + 1,
      translations: sanitizeTranslations("milestone", { es: { title: s.es, description: s.des, criteria: s.ces } }) ?? {},
    });
  }

  console.log(`done: ${lessonCount} lessons, 8 quizzes, ${STAGES.length} milestones, roadmap template ${template.id}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
