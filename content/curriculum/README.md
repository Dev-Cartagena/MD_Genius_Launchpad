# Curriculum content

Source of the Launchpad curriculum: 8 weeks in 4 stages, 3 lessons, a quiz and an exercise per
week, in English and Spanish. `SYLLABUS.md` is the outline and `CONTENT-SPEC.md` the writing rules.

## Import into a cohort

```bash
# local
npx tsx --env-file=.env scripts/curriculum/import.ts --cohort-name "Launchpad Cohort 1" \
  --cohort-name-es "Cohorte 1 de Launchpad" --start 2027-01-11 --capacity 25
# production: DATABASE_URL=<session pooler URL> DATABASE_SSL=require (values in .env.supabase)
```

It creates the cohort if no cohort has that name, then 8 modules, 24 lessons, 8 quizzes (attached
to each week's last lesson), 4 stage milestones and a default roadmap template (one item per
lesson plus the weekly exercise). It refuses a cohort that already has modules. Later cohorts can
copy modules with Admin → Curriculum → duplicate.

## Lesson videos

- Videos live in the public Supabase Storage bucket `lesson-media`, as
  `week-NN/wNN-lM-<lang>.mp4` with a poster `wNN-lM-<lang>-poster.jpg` beside it.
- A lesson's `media` list holds the video URL(s). The lesson page plays the viewer's language
  (`-es.mp4`) and falls back to English.
- `video:pending` in `media` shows a "Video coming soon" placeholder. Replace it with the URL
  when the video is produced.
- Produced so far: lesson 1.1 in English and Spanish. The HyperFrames projects and the fal.ai
  helper scripts are in `~/Documents/MD_Genius_Launchpad_Videos/w01-l1` and `w01-l1-es` (kept
  outside the repo; media is large). The Spanish film is generated from the English one by
  `w01-l1-es/scripts/make-es.py` (translated on-screen text and Spanish cue words).
