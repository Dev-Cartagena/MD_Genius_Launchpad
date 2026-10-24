## Learning objectives

- Identify the data you need and confirm you have the rights to collect, use and train on it.
- Map how your AI product can fail, who is harmed and how badly, including bias across user groups.
- Design human oversight that matches the stakes of each decision your product supports.
- Explain the main ideas of current AI regulation, including the EU AI Act's risk tiers, and where sector rules apply.

## Overview

Responsible AI is often treated as something to deal with after product-market fit. That is a costly mistake. The decisions you make in your first weeks, such as what data you collect, what consent you ask for and what the product is allowed to do on its own, are hard to undo later. They also decide whether customers trust you. In business markets, a security review or a single public failure can end a deal or a company. Building responsibly from day one is not a brake on speed. It is what lets you keep moving fast without having to rebuild.

## Data rights and privacy

### Know what you are allowed to use

AI products depend on data, and every dataset comes with rights attached. Before you collect or train on anything, answer four questions:

- Where does this data come from? Your users, your customers, public sources, partners or vendors?
- What are you allowed to do with it? Read the terms. Public on the internet does not mean free to use for any purpose. Licensed content, such as manuals, articles or images, may restrict copying or training.
- Who is in it? Data about identifiable people is personal data under laws such as the EU's GDPR and Brazil's LGPD, and it carries obligations around purpose, consent, retention and access.
- Who owns what the product produces and what it learns from customer data? Put the answer in your customer contracts.

### Practical habits

- Collect only what you need for a clear purpose. Every extra field is a liability.
- Ask for consent in plain language, especially for recordings of voice or video.
- Separate each customer's data, and be explicit about whether you use it to improve models for other customers.
- Encrypt data, restrict who can access it and log that access. Business customers will ask.
- Keep a simple data inventory: what you hold, why, where it lives and when you delete it.

## Bias and failure modes

### How AI products fail

AI systems fail differently from traditional software. They can be confidently wrong, behave differently on inputs unlike their training data and degrade quietly over time. For each feature, list:

- Wrong answers: the model gives incorrect information with confidence.
- Missing answers: the model fails to flag something important.
- Unequal performance: the product works well for some users and poorly for others.
- Misuse: someone uses the product in a way you did not intend.
- Drift: performance drops as real-world inputs change.

### Rate severity, not just frequency

For each failure, ask who is harmed and how badly. A wrong restaurant suggestion is an annoyance. A wrong answer about a gas valve, a medication dose or a loan decision can cause serious harm. Rank failures by severity and likelihood, and spend your effort on the severe ones first.

### Bias is a product-quality problem

Unequal performance is often bias. In speech recognition, a Stanford-led study published in the Proceedings of the National Academy of Sciences in 2020 found that major commercial systems made substantially more errors for Black speakers than for white speakers. If your users speak with different accents, in more than one language or in noisy settings, test performance for each group separately. An average accuracy number can hide a product that fails for a large share of users.

## Human oversight and trust

### Match oversight to the stakes

Human oversight means a person can understand, check and override what the system does. The right level depends on the stakes:

- Low stakes and easy to reverse: the system can act on its own, with logging. Drafting a summary is an example.
- Medium stakes: the system suggests and a person approves. Ordering a part is an example.
- High stakes or safety-critical: the system can inform, but a qualified person decides and confirms. Any step involving electrical, gas or health risks belongs here.

### Make oversight real

Oversight fails when people approve without looking. Help them check:

- Show sources, such as the manual page or record an answer is based on.
- Show uncertainty, and say "I am not sure" rather than guessing.
- Make overrides easy and record them. Corrections are valuable evaluation data.
- Never hide that a user is dealing with an AI system.

### Building trust

Trust is earned through behavior and evidence. A few concrete practices:

- Write a one-page explanation of what your product does with data, in plain language.
- Prepare for security questionnaires early. Business buyers will send them.
- Track and share accuracy honestly, including where the product is weak.
- Have a clear way to report problems and a promise about how fast you respond.

## An overview of current regulation

AI regulation is moving quickly, and what follows is a general summary as of 2026, not legal advice. Check official sources and speak to a lawyer before you launch in a regulated market.

### The EU AI Act

The EU AI Act takes a risk-based approach and applies to companies that place AI systems on the EU market, wherever they are based. It sorts systems into tiers:

- Unacceptable risk: a short list of practices that are banned, such as certain manipulative systems and social scoring. These prohibitions have applied since February 2025.
- High risk: systems used in sensitive areas, such as employment, education, credit, essential services and safety components of products. They face requirements for risk management, data quality, documentation, human oversight and accuracy. These obligations are being phased in, and their dates were amended during 2026, so check the European Commission's AI Act Service Desk timeline for the current schedule.
- Limited risk: systems with transparency duties, such as telling people they are talking to an AI or labeling AI-generated content.
- Minimal risk: most other systems, with no specific new obligations.

Separate obligations apply to providers of general-purpose AI models, and those began in August 2025. Most startups building on top of these models are not model providers, but they still need to know which tier their own product falls into.

### Sector rules and frameworks

General privacy laws and existing sector rules often matter more than AI-specific laws. As of 2026, the United States has no single comprehensive federal AI law, but regulators apply existing consumer-protection, anti-discrimination, health-privacy and financial rules to AI products, and several states have passed their own AI laws. Many Latin American countries already have data-protection laws, such as Brazil's LGPD, and several have been debating AI bills.

Two voluntary frameworks give useful structure even where the law is silent. The US NIST AI Risk Management Framework organizes the work into four functions: govern, map, measure and manage. The OECD AI Principles, adopted by dozens of countries, describe shared expectations around transparency, robustness and accountability.

## Case study: Fieldnote

Ana and Tomás reviewed Fieldnote with this lesson in mind.

Data rights: manufacturer manuals are copyrighted. Some are free to download, but that does not mean they can be used in any way. They started a list of manufacturers to contact about licensing, and they will use only manuals they have permission to use. Voice recordings capture technicians and sometimes homeowners, so the app will ask for clear consent, avoid recording until the technician starts a session and delete raw audio after a short period. Contracts will state that each contractor's job data stays theirs.

Failure modes: the most severe failure is a confident wrong answer on a safety-critical step, such as a gas valve, high voltage or refrigerant handling. Next is a wrong part order, which costs money and a second visit. Paperwork errors are less severe, but they still matter.

Bias: many technicians have regional accents or switch between English and Spanish on the job. Tomás will test speech accuracy separately for each group and for noisy rooms before any pilot.

Oversight: Fieldnote will always show the manual source for a diagnosis, will say when it is unsure and will never give step-by-step instructions on safety-critical work without telling the technician to follow the manufacturer's procedure and their training. Part orders need the technician's approval.

Regulation: as a tool supporting skilled workers in HVAC, Fieldnote is unlikely to fall into the EU AI Act's high-risk tier as currently described, but they noted that features such as ranking technician performance could change that, because employment uses are listed as sensitive. They will revisit this before entering any EU market.

## Common mistakes

- Assuming public data is free to use for any purpose, including training.
- Reporting one average accuracy number that hides poor performance for some groups.
- Adding human review in name only, with no sources or uncertainty to check against.
- Leaving data and privacy terms out of customer contracts.
- Ignoring regulation until a large customer's legal team raises it.

## Your turn

Take 25 minutes. List every type of data your product will collect or use and, for each, its source, your right to use it and whether it includes personal data. Then list your top five failure modes, rate each from 1 to 5 for severity and likelihood, and choose the oversight level for the most severe one: act with logging, suggest and approve, or inform only.

## Key takeaways

- Confirm data rights and consent before you collect or train, and collect only what you need.
- Rank failure modes by severity, and test performance for each user group separately.
- Match human oversight to the stakes, and give people sources and uncertainty so their review is real.
- As of 2026, the EU AI Act sorts AI systems by risk tier, while sector and privacy rules apply almost everywhere.
- Trust comes from clear data practices, honest accuracy reporting and fast responses to problems.

## Resources

- European Commission AI Act Service Desk, timeline for the implementation of the EU AI Act: https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act
- NIST, AI Risk Management Framework: https://www.nist.gov/itl/ai-risk-management-framework
- OECD, AI Principles: https://oecd.ai/en/ai-principles
- European Commission, data protection: https://commission.europa.eu/law/law-topic/data-protection_en
