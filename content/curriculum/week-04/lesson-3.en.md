## Learning objectives

- Define an MVP as the smallest experiment that tests your riskiest assumption, not as a smaller version of the final product.
- Choose between concierge, Wizard-of-Oz and other MVP types, and explain the ethical line between them.
- Write an experiment plan with a hypothesis, a metric, a success line and a time box.
- Apply YC's advice to launch early and run tight build-measure-learn loops.

## Overview

With AI coding tools, you can build a convincing product in days. That makes it tempting to skip straight to building. Steve Blank argued in September 2026 that AI-built products have become so easy to make that a working MVP no longer proves anything about customers, and proposed calling them Initial Untested Products. Whether or not the name sticks, the point holds: the goal of an MVP was never the product. It is the learning. This lesson shows you how to design the smallest test that answers your biggest open question, and how to run it this month.

## What an MVP is for

### The original idea

Eric Ries, in "The Lean Startup", defines the minimum viable product as the version of a new product that lets a team collect the maximum amount of validated learning about customers with the least effort. The key word is learning. An MVP is an experiment. Its success is measured by what you learn, not by how polished it looks.

Ries pairs the MVP with the build-measure-learn loop. You build the smallest thing that can test a hypothesis, measure how real customers behave, and learn whether to persevere or change course. The aim is to make each loop as short as possible. A team that completes a loop every week learns many times faster than one that completes a loop every quarter.

### Test the riskiest assumption first

Some practitioners use the phrase "riskiest assumption test" to make the point sharper. Before you build anything, ask which assumption, if wrong, would kill the company, and what the cheapest test of it is. Often the answer is not software at all. It might be a landing page with a sign-up, a manual service, a pre-sale or a prototype shown in a sales call.

Go back to your week 2 assumption map and your week 3 results. Some assumptions are now confirmed. Pick the riskiest one that is still open. That is what your MVP tests.

## Types of MVP

### Concierge

In a concierge MVP, you deliver the service by hand, and the customer knows a person is doing it. You act as the product. This is slow and does not scale, which is the point: you see every request, every edge case and every moment of delight or frustration. Paul Graham's essay "Do Things That Don't Scale" makes the broader case for this kind of manual early work, and you will return to it in week 5.

### Wizard of Oz

In a Wizard-of-Oz MVP, the customer sees what looks like an automated product, but a person is doing the work behind the curtain. A classic example is the early Zappos story: founder Nick Swinmurn tested whether people would buy shoes online by posting photos of shoes from local stores and buying them at retail when orders came in.

Wizard of Oz lets you test the experience of an automated product before you build the automation. It carries a responsibility. If customers share sensitive data, or if they would act differently knowing a person is involved, you must think carefully about consent and disclosure. For AI products in regulated or high-stakes settings, prefer the concierge model, or tell users clearly that answers are reviewed by people. Lesson 3 of week 2 on responsible AI applies here.

### Other cheap tests

- Landing page or smoke test: describe the product and measure who signs up or pays a deposit.
- Pre-sale or letter of intent: ask for money or a written commitment before you build.
- Clickable prototype: show the workflow in a sales or interview setting and watch where people hesitate.
- Single-feature product: build only the one capability that tests your core hypothesis.

### Why concierge and Wizard of Oz suit AI startups

For AI products, a person in the loop does more than test demand. Every request and every correct answer becomes labeled data. You learn what questions users really ask, what a good answer looks like and where mistakes are costly. That becomes the first version of the evaluation set you will build in week 5.

## Launch early, then iterate

### YC's advice

Y Combinator has told founders for years to launch early and talk to users. Michael Seibel's talk "How to Plan an MVP" makes it practical: set a short deadline, write down what the first version must do, then cut that list hard and ship. He stresses that early customers will forgive a rough product if it solves a problem they care about, and that the real work starts after launch, when you see what people actually do.

Launching does not mean a press event. For most early startups, launching means putting the product in front of the first real users and asking for their time and money.

### Write the experiment plan

Before you start, write a one-page plan:

1. Hypothesis: the riskiest open assumption, written so it can fail.
2. Test: what you will do, for whom and for how long.
3. Metric: the one behavior you will measure, such as weekly use, a repeat purchase or a payment.
4. Success line: the result that would count as a pass, set in advance.
5. Time box and cost: the end date and what you will spend.
6. Decision: what you will do if it passes and what you will do if it fails.

Keep the time box short. Two to four weeks is usual for an early test. If you cannot measure the result by then, the test is too big.

## Case study: Fieldnote

The riskiest open assumption after week 3 was not whether the problem existed. It was whether technicians would actually reach for a new tool in the middle of a hard job, and whether a fast answer would change the outcome. Building a voice AI over manufacturer manuals would take months. Ana and Tomás decided to test the behavior first.

They ran a concierge MVP over WhatsApp, which the technicians already used every day. Technicians at the five shops that had committed in week 3 could send a photo of the equipment nameplate and a voice note describing the symptom. Tomás, with Ana backing him on HVAC questions, answered by hand, using manufacturer manuals and parts catalogs, with a target reply time of under ten minutes during working hours.

They chose concierge over Wizard of Oz on purpose. Technicians were told that the Fieldnote team was answering personally while the product was being built. The founders thought this was the honest choice, and that it would make technicians more forgiving of slow replies. They also asked each shop's permission before saving any photo or message, and they removed customer names and addresses from the job notes they kept.

Their experiment plan:

- Hypothesis: technicians at mid-size shops will use an on-demand diagnosis and parts helper at least twice a week, and assisted jobs will be fixed on the first visit more often than the shop's usual rate.
- Test: two technicians at each of five shops, four weeks.
- Metrics: requests per technician per week; first-time-fix rate on assisted jobs compared with each shop's own baseline, from the managers' records; time from request to answer.
- Success line: at least 6 of 10 technicians use it twice a week by week three, and at least two shops agree to a paid pilot at the end.
- Decision: if it passes, build the first automated version around the most common questions. If use fades after the first week, go back to the interviews and find out why.

Every exchange went into a spreadsheet: the question, the photo, the answer, the sources used and whether the fix worked. Tomás saw at once that this was also their first labeled dataset, the start of the evaluation set they would need in week 5.

## Common mistakes

- Building the full product before testing the riskiest assumption.
- Treating the MVP as a product launch and judging it on polish rather than learning.
- Running a test with no success line or no end date.
- Using a Wizard-of-Oz test where users would object if they knew a person was involved, or without handling their data with care.
- Measuring compliments or sign-ups when the hypothesis is about repeated use or payment.

## Your turn

Pick your riskiest open assumption. Choose the cheapest MVP type that could test it, and write a one-page experiment plan with all six parts. Name the first five people who will take part, and send the first invitation today. Spend 25 to 30 minutes.

## Key takeaways

- An MVP is an experiment that maximizes learning for the least effort, not a smaller product.
- Test the riskiest open assumption first, often without writing code.
- Concierge MVPs are honest and teach you every detail. Wizard of Oz needs care with consent and data.
- For AI startups, human-in-the-loop MVPs produce the first labeled data and evaluation set.
- Launch early, set a success line and a time box, and decide in advance what each result will mean.

## Resources

- Michael Seibel, How to Plan an MVP (YC Startup Library): https://www.ycombinator.com/library/6f-how-to-plan-an-mvp
- Eric Ries, Minimum Viable Product, a guide: https://www.startuplessonslearned.com/2009/08/minimum-viable-product-guide.html
- Y Combinator, Why Startup Founders Should Launch Companies Sooner Than They Think: https://www.ycombinator.com/library/LG-why-startup-founders-should-launch-companies-sooner-than-they-think
- Steve Blank, AI Killed the MVP. Long Live the IUP (2026): https://steveblank.com/2026/09/25/ai-killed-the-mvp-long-live-the-iup/
- Paul Graham, Do Things That Don't Scale: https://paulgraham.com/ds.html
