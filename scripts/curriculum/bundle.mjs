// Bundles content/curriculum/week-NN/* into one JSON file (used for review and import).
// Usage: node scripts/curriculum/bundle.mjs [outFile]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../../content/curriculum");
const out = process.argv[2] ?? join(ROOT, "curriculum.bundle.json");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const STAGES = {
  foundation: { en: "Foundation", es: "Fundamentos" },
  validation: { en: "Validation", es: "Validación" },
  development: { en: "Development", es: "Desarrollo" },
  launch: { en: "Launch", es: "Lanzamiento" },
};

const weeks = [];
for (let w = 1; w <= 8; w++) {
  const dir = `week-${String(w).padStart(2, "0")}`;
  if (!existsSync(join(ROOT, dir, "module.json"))) continue;
  const module = JSON.parse(read(`${dir}/module.json`));
  const quiz = JSON.parse(read(`${dir}/quiz.json`));
  const lessons = module.lessons.map((l) => ({
    ...l,
    content: { en: read(`${dir}/${l.file}.en.md`), es: read(`${dir}/${l.file}.es.md`) },
    video: read(`${dir}/${l.file}.video.md`),
  }));
  weeks.push({
    ...module,
    lessons,
    quiz,
    exercise: { en: read(`${dir}/exercise.en.md`), es: read(`${dir}/exercise.es.md`) },
  });
}

writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), stages: STAGES, weeks }, null, 0));
console.log(`bundled ${weeks.length} weeks, ${weeks.reduce((n, w) => n + w.lessons.length, 0)} lessons -> ${out}`);
