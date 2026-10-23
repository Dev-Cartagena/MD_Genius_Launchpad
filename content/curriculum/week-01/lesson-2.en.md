## Learning objectives

- Distinguish AI-native workflows from AI features added to existing software.
- Explain the difference between horizontal and vertical AI, and between copilots and agents.
- Evaluate which defensibility sources (proprietary data, workflow embedding, distribution) are realistic for your startup.
- Place your own idea on a simple value map and name the moat you intend to build.

## Overview

Foundation models are improving fast and getting cheaper, and anyone can call them through an API. That is good news for startups, because you can build on top of capabilities that cost billions to create. It is also a warning. Whatever the model can do on its own, your competitors can do too, and the model providers may ship it themselves next quarter. The question is not whether AI is valuable. It is where, in a specific workflow, a startup can capture value that is hard to copy.

## AI-native workflows

### Features versus workflows

Most software companies are adding AI as a feature: a summary button, a smarter search box, a writing assistant in the corner. That is useful, but it rarely changes how the work gets done. An AI-native workflow starts from a different question: if software could understand language, documents, images and speech, how would we design this job from scratch?

A helpful way to see the difference is to look at who does the work. In a traditional tool, the person does the work and the software records it. In an AI-native workflow, the software does a meaningful share of the work, and the person reviews, corrects and decides.

### Where to look

AI-native opportunities tend to cluster where:

- Work involves reading, writing, listening or looking at unstructured information, such as manuals, contracts, calls, forms and photos.
- Skilled people spend much of their time on repetitive judgment, not on the parts of the job that need their expertise.
- Labor is scarce or expensive, so doing more with the same team has a clear dollar value.
- Errors are costly but checkable, so a human can review output quickly.

That last point matters. A workflow where you can verify AI output in seconds is far easier to automate safely than one where mistakes only show up months later.

## Vertical AI, copilots and agents

### Horizontal versus vertical

Horizontal AI products serve everyone: a general assistant, a general writing tool, a general coding model. They compete directly with the largest companies in the world. Vertical AI products go deep on one industry or job, such as legal intake, dental billing or equipment repair. They win by understanding the vocabulary, data, regulations and workflow of that one domain better than any general tool.

YC partners have argued on their Lightcone podcast that vertical AI agents could become very large businesses, possibly larger than the vertical software companies they compete with. Their reasoning is that these products can be paid for out of a labor budget, not just a software budget. Treat that as a thesis to test, not a law. It holds only when the product really does a measurable share of the work.

YC's public Requests for Startups also point in this direction, with repeated calls for AI that performs specific professional jobs. Read the current list. It is a useful map of where experienced investors expect value to appear.

### Copilots versus agents

Two product shapes dominate:

- A copilot works alongside a person. It suggests, drafts, retrieves and explains, and the person stays in control of every action. Copilots are easier to trust and easier to sell, because the user remains responsible.
- An agent takes actions on its own toward a goal: it fills in the form, places the order, sends the message or files the report. Agents can deliver more value, but they need stronger reliability, clear limits and a way for a human to step in.

Think of it as a dial rather than a switch. Most successful products start closer to the copilot end, earn trust with accurate output, and then automate the steps users already approve without changes. Moving the dial too early is one of the fastest ways to lose a customer's trust.

## Where the moats come from

A moat is whatever makes it hard for a competitor, including a model provider, to take your customers. In AI, the model itself is rarely the moat. Here are the three sources this program focuses on.

### Proprietary data

Data can be a moat, but less often than founders hope. Martin Casado and Peter Lauten of Andreessen Horowitz argued in "The Empty Promise of Data Moats" that data advantages often weaken as you collect more, because each new batch of data tends to cost more to get, overlaps with what you already have and adds less value. Data becomes defensible when:

- It comes from your product's own use and competitors cannot buy or scrape it.
- It captures something specific, such as which answer actually fixed the problem, not just more of the same raw text.
- It feeds back into the product in a way users notice, which is often called a data flywheel.

### Workflow embedding

The strongest early moat for most AI startups is becoming part of how work gets done. When your product is connected to the customer's systems, holds their history, matches their approval steps and is used every day, replacing it means retraining people and rebuilding integrations. That is real switching cost. It is earned by solving the boring details: permissions, integrations, edge cases, reporting.

### Distribution

The startup that reaches customers first, and keeps reaching them cheaply, often wins even with a similar product. Distribution advantages include a founder's network in an industry, partnerships with associations or suppliers, a community, or a product that spreads from user to user. In a market where many teams can build similar features, owning the path to the customer is often the deciding factor.

### What is not a moat

- Access to a foundation model. Everyone has it.
- A clever prompt. It can be copied in an afternoon.
- Being first with a feature the platform will add soon.

Speed is not a moat on its own, but it buys you time to build the real ones.

## Case study: Fieldnote

Ana and Tomás mapped their idea against this lesson.

AI-native workflow: today a technician works the job, then documents it. Fieldnote flips that. The technician talks through the visit while working, and the assistant answers diagnostic questions, looks up parts and drafts the report from what was said. The technician reviews and submits. The work involves unstructured information, like manuals, fault codes and spoken notes, and the output is checkable on site.

Vertical: they are not building a general voice assistant. They are building for HVAC first, with electrical and solar later, because they share manufacturer manuals, fault codes and job structures.

Copilot first: Tomás proposed letting Fieldnote order parts automatically. Ana pushed back. A wrong part order costs a truck roll and a customer's patience. They agreed to start as a copilot that suggests and drafts, and to automate only steps technicians accept without changes.

Moat hypothesis:

- Data: a record of which diagnosis actually fixed which unit, created through normal use. Manuals alone are not a moat, since anyone can get them.
- Workflow embedding: reports that flow straight into the contractor's existing job-management system.
- Distribution: Ana's network of contractors and, later, industry associations.

They wrote "data moat" with a question mark. It only becomes real if technicians use the product enough to generate fix outcomes.

## Common mistakes

- Building a thin layer over a foundation model and calling the model your moat.
- Jumping straight to a fully autonomous agent before users trust the output.
- Claiming a data moat for data that competitors can buy, scrape or generate.
- Choosing a horizontal market because it sounds bigger, then competing with the largest companies in the world.
- Ignoring distribution until the product is "ready".

## Your turn

Take 25 minutes. Draw two lines on a page. On the horizontal axis put "copilot" on the left and "agent" on the right. On the vertical axis put "horizontal" at the bottom and "vertical" at the top. Place your product where it starts today and where you want it in two years. Then write one sentence each for your data, workflow and distribution moat, and mark each as "have", "can build" or "unlikely".

## Key takeaways

- The value is in redesigning a specific workflow around what AI can do, not in adding a feature.
- Vertical products can win by knowing one domain deeply, and they may be paid from labor budgets when they do real work.
- Start as a copilot, earn trust, and automate step by step.
- Moats come from proprietary usage data, deep workflow embedding and distribution, not from the model.

## Resources

- Y Combinator, Requests for Startups: https://www.ycombinator.com/rfs
- Y Combinator, Vertical AI Agents Could Be 10X Bigger Than SaaS (Lightcone Podcast): https://www.ycombinator.com/library/Lt-vertical-ai-agents-could-be-10x-bigger-than-saas
- Andreessen Horowitz, The Empty Promise of Data Moats: https://a16z.com/the-empty-promise-of-data-moats/
- Stanford HAI, AI Index Report: https://hai.stanford.edu/ai-index
