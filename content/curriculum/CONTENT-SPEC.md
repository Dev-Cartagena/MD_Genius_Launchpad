# Content spec for curriculum writers

Read `content/curriculum/SYLLABUS.md` first. It fixes the stages, weeks, lesson titles
and topics. This spec fixes the format, voice and quality bar.

## Files per week (`NN` = 01–08)

```
content/curriculum/week-NN/
  module.json           module metadata, EN + ES
  lesson-1.en.md        lecture, English
  lesson-1.es.md        lecture, Spanish (same structure and same facts)
  lesson-1.video.md     video script, bilingual narration, scene list and image prompts
  lesson-2.*, lesson-3.*
  quiz.json             8 questions, EN + ES aligned by index
  exercise.en.md        weekly exercise (becomes a roadmap task)
  exercise.es.md
```

### module.json

```json
{
  "week": 1,
  "stage": "foundation",
  "orderIndex": 1,
  "title": "Founders and the AI opportunity",
  "description": "One or two sentences on what the week achieves.",
  "objectives": ["4 to 6 measurable outcomes, starting with a verb"],
  "resources": ["Title of resource — https://public.url"],
  "translations": { "es": { "title": "…", "description": "…", "objectives": ["same count, same order"], "resources": ["same count; keep the URL, translate the title"] } },
  "lessons": [
    { "orderIndex": 1, "file": "lesson-1", "title": "How great startups begin", "es": "Cómo empiezan las grandes startups", "minutes": 15 }
  ]
}
```

### Lesson markdown

The platform renderer supports only `##` headings, `###` subheadings, `-` bullets,
`1.` numbered lists and plain paragraphs. It has no bold, tables, images, links or
blockquotes inside the text. Put URLs only in the Resources list, as plain `Title: URL`
lines.

Use this section order. The heading names are fixed: in English the first heading is
`## Learning objectives`; in Spanish it is `## Objetivos de aprendizaje`.

1. `## Learning objectives`: 3 or 4 bullets.
2. `## Overview` (ES `## Resumen`): 1 paragraph on why this matters now.
3. Three or four content sections (`##` with `###` subsections). Explain the frameworks
   plainly, credit their author or source in the text ("Steve Blank's customer
   development…", "Paul Graham's essay *How to Get Startup Ideas*…"), and add practical
   steps.
4. `## Case study: Fieldnote` (ES `## Caso: Fieldnote`): apply the lesson to the running
   case. Fieldnote is a two-founder startup (Ana, ex-HVAC operations lead; Tomás, ML
   engineer) building an AI assistant that lets field technicians diagnose equipment,
   find parts and file reports by voice. Keep the case consistent with the other weeks
   (see "Case continuity" below).
5. `## Common mistakes` (ES `## Errores comunes`): 3–5 bullets.
6. `## Your turn` (ES `## Tu turno`): a short exercise for this lesson, 15–30 minutes.
7. `## Key takeaways` (ES `## Ideas clave`): 3–5 bullets.
8. `## Resources` (ES `## Recursos`): 3–6 bullets of public, free sources in
   `Title: https://…` form. Use only URLs you have verified exist, with WebFetch or
   WebSearch. Prefer stable pages: paulgraham.com essays, ycombinator.com/library and
   Startup School, steveblank.com, dschool.stanford.edu, ecorner.stanford.edu,
   skydeck.berkeley.edu, official regulator pages. If you can't verify a URL, cite the
   source by name with no URL.

Length: 1,200–1,800 words per lesson per language.

### Video script (`lesson-N.video.md`)

The target is 3–5 minutes. It is produced later with HyperFrames or Remotion, an AI
presenter and generated photorealistic imagery, in the Launchpad brand (Navy #082B42,
Steel #3A607D, Mist #97B7C1, White Smoke #F3F3F3, Space Grotesk titles; calm and
professional; no hype).

```markdown
# Video: <lesson title>
Duration: ~4:00 · Format: 16:9 1920×1080 · Presenter: <name, short description, consistent across the program>

## Scene 1 — Hook (0:00–0:20)
- Type: presenter | motion | broll | split
- On screen: <titles, diagram, data viz, kinetic text — describe the motion graphic precisely>
- Image prompt (if broll): <photorealistic prompt, natural light, documentary style, diverse people, no logos or text in image>
- Narration EN: <exact words>
- Narración ES: <exact words, same meaning, natural Latin American Spanish>
```

Plan 6–10 scenes. Mix presenter and motion: framework diagrams as motion graphics, the
Fieldnote case as realistic B-roll. Write about 140–160 spoken words per minute per
language. End with a one-line recap and a cue for the exercise.

### quiz.json

```json
{
  "title": "Week 1 quiz: Founders and the AI opportunity",
  "passThreshold": 70,
  "maxAttempts": 3,
  "questions": [
    { "question": "…", "options": ["A", "B", "C", "D"], "correctAnswer": 1, "explanation": "Why the answer is right, 1–2 sentences." }
  ],
  "translations": { "es": { "title": "…", "questions": [ { "question": "…", "options": ["same order"], "explanation": "…" } ] } }
}
```

There are 8 questions, 4 options each. The correct option sits in a different position
from question to question, and no option is "all of the above". Questions test
application ("Fieldnote's interviews show X; what should they do next?") more than recall.
Cover all 3 lessons. The Spanish `questions` array has the same length and option order,
and carries no correctAnswer field.

### Exercise (`exercise.*.md`)

The weekly deliverable becomes a roadmap task. Use these sections: `## Goal`
(ES `## Objetivo`), `## Steps` (`## Pasos`), `## Deliverable` (`## Entregable`),
`## How it will be reviewed` (`## Cómo se revisará`), and an estimate of 2–4 hours.

## Voice

- **English.** Clear, calm, practical and confident, written for smart young founders.
  No hype, no exclamation marks, no emoji. Short sentences and concrete examples.
- **Spanish.** Neutral Latin American, using tú, respectful and professional. Follow the
  glossary in `docs/i18n/spanish-style-guide.md`: cohorte, hoja de ruta, startup, pitch,
  MVP, inversionista, mentor, entregable, hito. Write it as a native text with the same
  content, not a word-for-word translation. Use no ¡ or !.
- **Accuracy.** No invented statistics. If you give a number, attribute it ("YC
  partners often say…", "Sean Ellis's benchmark is 40%"). Present frameworks faithfully.
  Mark facts that change over time, such as regulation or funding norms, with "as of
  2026" and keep them general.
- **Originality.** Write all text yourself. Don't reproduce copyrighted passages; short
  quotes of a famous line are fine if attributed (for example "Make something people
  want").

## Case continuity (Fieldnote)

| Week | State of Fieldnote |
|---|---|
| 1 | Founders form, the idea comes from Ana's HVAC experience, why now (speech models plus mobile) |
| 2 | Problem: technicians lose about 30–40% of a visit to diagnosis and paperwork (founders' estimate, to be validated); assumptions mapped |
| 3 | 18 interviews; the real pain is first-time-fix rate and parts lookup more than paperwork; beachhead is mid-size HVAC contractors (20–200 techs) |
| 4 | Bottom-up market sizing; competitors are field-service-management suites and paper manuals; concierge MVP over WhatsApp with Tomás answering by hand |
| 5 | RAG over manufacturer manuals plus voice; eval set of 120 real diagnostic questions; human review of low-confidence answers |
| 6 | 3 pilot contractors; the 40% test gives 46% "very disappointed" among techs; per-technician pricing tested against per-job pricing |
| 7 | Founder-led sales to operations managers; HVAC association channel; referral loop from techs |
| 8 | Raising a pre-seed on a post-money SAFE; deck and 2-minute Demo Day pitch |

Keep every number labeled as the founders' own data, since Fieldnote is fictional.
