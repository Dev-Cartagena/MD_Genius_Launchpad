## Learning objectives

- Apply Paul Graham's "do things that don't scale" to an AI product's first users.
- Set up a weekly release rhythm with an eval gate, so speed does not cost reliability.
- Build feedback loops that turn user behavior into next week's priorities.
- Separate technical debt worth taking on from debt you must never take.

## Overview

At this stage your biggest risk is not that the code is messy. It is that you build for months and learn too little. Startups that win early tend to learn faster than their competitors, and learning comes from putting something real in front of users and watching what happens. AI products make this both easier and harder: you can ship a working prototype in days, but its behavior is unpredictable until real people use it on real tasks. This lesson is about building a team habit of shipping small, often and safely, while doing the manual work that teaches you what to automate next.

## Do things that don't scale

Paul Graham's 2013 essay "Do Things That Don't Scale" is still one of the most useful pieces of startup advice. Its core idea is that the work that gets a startup off the ground looks inefficient, and founders avoid it for exactly that reason.

### Recruit users by hand

Graham describes how the Collison brothers at Stripe would not wait for people to sign up; they would ask for a laptop and set the user up on the spot. Your first users rarely come from a launch post. They come from you calling, visiting and onboarding them one at a time.

### Give an absurd level of attention

Early users should feel that the founders care more about their problem than any vendor they have dealt with. Answer every message personally. Watch them use the product. Fix their problem the same day when you can. This is how you earn the patience a rough first version needs.

### Do the work behind the product yourself

In AI products, doing things that don't scale usually means humans doing part of the job behind the interface. Load a customer's documents into your system yourself. Review uncertain answers by hand, as you designed in Lesson 2. Write the first reports for users from the model's draft. Each manual step teaches you what good looks like before you automate it, and it lets you ship a product that is better than your model alone.

### Know when to stop

Manual work is a learning tool, not a business model. Track how many hours each customer costs you, and automate a step once you understand it and it is consuming time you need elsewhere.

## A weekly release rhythm

Y Combinator has long urged founders to launch early and keep launching. YC partner Kat Manalac's talk "How to launch (again and again)" treats launching as something you do repeatedly, not a single event. Inside the product, the same idea becomes a fixed weekly release rhythm.

### Ship every week

Pick a release day and keep it. A weekly rhythm forces you to cut work into pieces small enough to finish, and it gives users visible proof that you are listening. Ship to a small group first, then everyone, using feature flags if you have them or a simple list of pilot accounts if you do not.

### Gate every release with your evals

Speed in AI products is safe only if you know what each change did. Before any prompt, model or retrieval change ships, run the eval set and compare with last week. If a category got worse, either fix it or hold the change. This makes the eval set from Lesson 2 the brake that lets you drive fast.

### Tell users what changed

Send short release notes to pilot users: what you fixed, who asked for it, what to try. Naming the user who reported a problem is one of the strongest ways to show that feedback matters, and it brings in more feedback.

## Feedback loops that actually teach you

Shipping weekly is only valuable if each release changes what you learn. Build loops that bring evidence back in.

### Watch people use it

Interviews tell you what people think; observation tells you what they do. Sit with users at work, share a screen, or ride along on a job. You will see workarounds, confusion and moments of delight that never appear in a survey.

### Read the logs every week

Review a sample of real requests and outputs weekly, as a team. Look for repeated questions, edited answers, escalations and abandoned sessions. Each pattern is either a bug, a missing feature or a new eval case.

### Run one triage meeting

Once a week, put everything on one board: bugs, eval failures, user requests and observations. Rank them by how many users are affected and how close each is to the core job. Pick what ships next week. Then close the loop with the people who asked.

## Technical debt worth taking on

Technical debt is a shortcut you will pay for later. For an early startup, some debt is a smart loan: it buys learning now, and if the idea fails you never repay it. Other debt can sink the company.

### Debt worth taking

- Manual operations: onboarding, data loading and reviews done by founders.
- Hard-coded settings for your first customers instead of a full admin interface.
- A thin wrapper around one model provider, as long as a swap stays possible.
- Simple infrastructure that will not scale to thousands of users yet.
- Missing features that no early user has asked for.

### Debt you must never take

- Weak security, shared credentials or customer data that is not separated per account.
- Using customer data in ways your agreements do not allow.
- No eval set or regression run, which makes every change a gamble.
- No logging, so you cannot investigate a bad answer.
- No backups of the data customers trust you with.

### Keep a debt register

Write each deliberate shortcut down with the reason and the trigger for paying it back, for example "build an admin page when we reach ten customers". A debt you chose and recorded is a decision; a debt nobody remembers is a risk.

## Case study: Fieldnote

As Fieldnote moved from the WhatsApp concierge to its first pilot build, Ana and Tomás chose to do several things that don't scale. Ana spent full days on ride-alongs with technicians at their first pilot contractor, watching them use the voice assistant in attics and on rooftops. She learned that noisy environments caused more misheard model numbers than expected, so the team added a step that reads the identified unit back to the technician before answering.

Tomás loaded each contractor's equipment list and manuals by hand rather than building a self-service upload, and he personally reviewed every low-confidence answer in the queue. They set Thursday as release day. Every Thursday morning the 120-case eval set runs; if any risk-tagged category drops, the release waits. Pilot users get a short voice note from Ana explaining what changed.

Their debt register lists manual onboarding, a hard-coded parts catalog for two brands and no admin dashboard, each with a trigger for repayment. It also lists what they refused to cut: each contractor's data is kept separate, logs capture every request, and the regression run is never skipped. All of these choices and observations are the founders' own.

## Common mistakes

- Waiting for a polished launch instead of putting a rough version in front of a few real users now.
- Automating a process before doing it by hand enough times to understand it.
- Shipping fast without an eval gate, then losing user trust to a silent regression.
- Collecting feedback and never telling users what you did with it.
- Treating security and data separation as debt to repay later.

## Your turn

Spend 20 minutes. Pick a release day and write it down. List three things you will do by hand for your users in the next two weeks, and what each will teach you. Then start a debt register with at least three shortcuts you are taking, each with a reason and a repayment trigger, and two lines you will not cross.

## Key takeaways

- Do things that don't scale: recruit by hand, over-serve early users and do the work behind the product yourself.
- Ship weekly, gate every release with your eval set, and tell users what changed.
- Observation, weekly log reviews and a single triage meeting turn usage into priorities.
- Take debt that buys learning; never take debt on security, data rights, evals or logging.

## Resources

- Do Things That Don't Scale (Paul Graham): https://paulgraham.com/ds.html
- How to launch (again and again), Kat Manalac (YC Startup Library): https://www.ycombinator.com/library/6i-how-to-launch-again-and-again
- How to plan an MVP, Michael Seibel (YC Startup Library): https://www.ycombinator.com/library/6f-how-to-plan-an-mvp
- YC's essential startup advice (YC Startup Library): https://www.ycombinator.com/library/4D-yc-s-essential-startup-advice
- A Field Guide to Rapidly Improving AI Products (Hamel Husain): https://hamel.dev/blog/posts/field-guide/
