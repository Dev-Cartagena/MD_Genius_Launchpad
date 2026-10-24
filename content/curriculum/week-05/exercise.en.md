## Goal

Produce two artifacts that turn your MVP into a product you can measure: a one-page architecture for your core user task, and an eval set of at least 50 real cases that tells you whether that architecture works. Together they show a mentor or investor that you know how your product behaves, what it costs, and where it fails.

Estimated time: 3 to 4 hours.

## Steps

1. Name the single user task that matters most, in one sentence, for example "a technician gets a correct diagnosis for an error code in under a minute".
2. Draw the four layers for that task: model (which one, bought or open-weight), context (data sources and how they are retrieved), orchestration (the fixed steps or tool calls) and product (screen, voice flow, channel).
3. State which rung of the ladder you are on (prompting, RAG, fine-tuning, agents) and the evidence that would justify moving up one rung.
4. Trace one real request from input to answer, step by step.
5. Estimate cost and latency per task: model calls, approximate input and output tokens, current list prices, and the expected number of tasks per user per month. Mark it as an estimate with the date.
6. List the top three failure modes and what a human reviews, including your confidence-routing rule.
7. Collect at least 50 real inputs from your concierge MVP, interviews, support messages or pilot users. Add a few edge cases, out-of-scope questions and high-stakes cases on purpose.
8. For each case, fill in: input, expected answer or pass criteria, grading method (code check, expert review or calibrated model judge) and tags (task type, segment, difficulty, risk).
9. Run every case through your current prototype or a plain model. Grade the results, group the failures into categories and record the pass rate per tag.
10. Write three lines at the bottom of the one-pager: the largest failure category, what you will change first, and the date of your next eval run.

## Deliverable

- An architecture one-pager (PDF or doc) covering steps 1 to 6 and 10.
- An eval spreadsheet with at least 50 cases, the four required fields per case, the grades from your first run and a short summary of failure categories.

## How it will be reviewed

- The architecture names a specific choice at every layer and explains each build-or-buy decision.
- The chosen technique is justified by evidence, not by what sounds most advanced.
- Cost per task is estimated with visible assumptions.
- The eval set has 50 or more cases, most from real users, with clear pass criteria a second person could apply.
- High-risk cases are tagged and a human review rule exists for them.
- The first run is graded and the next fix follows from the largest failure category.
