## Learning objectives

- Describe the four layers of a modern AI product and what each one owns.
- Choose between prompting, retrieval (RAG), fine-tuning and agents for a given problem.
- Reason about the cost, latency and quality trade-off with real levers, not guesses.
- Write a one-page architecture that a technical advisor can critique in ten minutes.

## Overview

As of 2026, any startup can reach a capable foundation model through an API in an afternoon. You no longer need a research team to ship something impressive, but neither do your competitors. What separates a product from a demo is the system around the model: the data you feed it, the workflow it fits into, how you know when it is wrong, and what each answer costs you. This lesson gives you a simple map of that system and a disciplined way to make the big early choices without overbuilding.

## The four layers of an AI product

Think of an AI product as four stacked layers, each with its own failure modes and its own kind of moat.

### Model layer

This is the foundation model itself: a large language model, a speech-to-text model, a vision model, or several of them. For nearly all early-stage startups this layer is bought, not built. Your job is selection, not training. Expect to replace the model several times a year as better and cheaper options appear, and design so that a swap is a configuration change, not a rewrite.

### Context layer

This is everything the model needs to know that it did not learn in training: your customer's documents, product catalogs, past tickets, user history. Most of the value in vertical AI lives here, because this is where proprietary and hard-to-collect data enters the system. Retrieval pipelines, search indexes and the logic that decides what goes into the prompt live here.

### Orchestration layer

This is the code that turns a single model call into a reliable behavior: prompt templates, tool calls, routing between models, retries, guardrails, and the steps of a workflow or agent. It is ordinary software engineering, and it is where most bugs hide.

### Product and workflow layer

This is the interface and the job it fits into: the screen, the voice flow, the approval step, the integration with the system of record. Founders underinvest here, yet this is where users decide whether the product saves them time. A mediocre model inside a well-designed workflow often beats a better model inside a clumsy one.

## Build versus buy, and the ladder of techniques

The most common architecture mistake is reaching for the most sophisticated technique first. A better habit is to climb a ladder, moving up a rung only when you have evidence the lower rung is not enough.

### Rung 1: prompting a strong model

Start with a strong general model, a clear prompt, a few examples and structured output. Measure it. This often goes further than expected, and it sets the baseline every later investment must beat.

### Rung 2: retrieval-augmented generation (RAG)

When the model needs facts it does not have, such as a specific manufacturer's manual or a customer's policies, retrieve the relevant passages at question time and put them in the prompt. RAG keeps knowledge fresh without retraining and lets you cite sources. Its quality depends mostly on retrieval: how you split documents into chunks, how you search them (keyword, vector embeddings, or both), and whether you rerank results. When a RAG system gives a wrong answer, check first whether the right passage was retrieved at all.

### Rung 3: fine-tuning

Fine-tuning adjusts a model's weights using your own examples. It is good at teaching form and behavior: a consistent output format, a house style, a narrow classification task, or getting a smaller and cheaper model to match a larger one on one job. It is poor at teaching facts that change, which RAG handles better. Fine-tune once you have a stable task, a few hundred to a few thousand good examples, and an eval set that proves the tuned model is better.

### Rung 4: agents

Anthropic's engineering guide "Building effective agents" draws a useful line between workflows, where your code defines the steps and the model fills them in, and agents, where the model decides which tools to call and in what order. Agents are powerful for open-ended tasks, but every extra autonomous step multiplies cost, latency and the chance of an error compounding. The guide advises starting with the simplest pattern that works and adding autonomy only when it clearly improves results. For most first products, a fixed workflow with one or two tool calls is the right answer.

### What to build yourself

Buy the model, the vector database, speech recognition and observability tooling unless one of them is your core differentiation. Build the context pipeline for your domain, the workflow, and your evaluation set. Those are the parts competitors cannot rent.

## The cost, latency and quality trade-off

Every AI feature sits on a triangle of cost, latency and quality. You rarely get all three, so decide which matters most to the user at each step.

### Know your numbers per task

Estimate, for one typical user task: how many model calls it takes, how many input and output tokens each call uses, which model handles it, and the provider's published price. Multiply by expected tasks per user per month. Do this in a spreadsheet before you scale, and update it as prices change, because as of 2026 model prices still shift often. You will use this number again in Week 6 when we calculate AI gross margin.

### Levers that actually move the triangle

- Route by difficulty: send easy requests to a small, fast model and hard ones to a large model.
- Retrieve less but better: a tight context of five relevant passages is cheaper and often more accurate than fifty loose ones.
- Cache what repeats: system prompts, common documents and frequent answers.
- Stream responses so users see progress, which matters more for perceived speed than total time.
- Set a confidence threshold and send uncertain cases to a human rather than to a bigger model.

### Writing the architecture one-pager

Capture your choices on one page: the user task, the four layers with the specific tool or model at each, the data sources, the flow of one request from input to answer, the estimated cost and latency per task, the main failure modes, and what a human reviews. Keep it short enough that an advisor can find the weak point quickly.

## Case study: Fieldnote

By the end of Week 4, Fieldnote's concierge MVP was Tomás answering technicians' WhatsApp messages by hand from a folder of manufacturer manuals. That gave the founders something no API provides: real questions and the answers that actually helped. Ana noticed most were variations of "what does this error code mean on this unit" and "which part do I need".

Climbing the ladder, Tomás first tried prompting a general model with no documents. It sounded confident and was often wrong about model-specific error codes, which in HVAC can mean a wasted truck roll. So the founders chose RAG over manufacturer manuals as the core of the context layer, indexed by brand, model series and document section, with both keyword and vector search because technicians often type exact codes. They decided not to fine-tune yet, and not to build an agent: the flow is a fixed workflow of transcribe the voice note, identify the unit, retrieve, answer with citations, and log the report.

For the product layer, they kept voice first, because technicians have their hands full and gloves on. They bought speech-to-text rather than building it. Their one-pager estimates cost per diagnostic question from token counts and current list prices, and sets a rule: when the model's answer is low confidence or retrieval finds no matching manual, the question goes to a human reviewer, initially Tomás, before the technician receives it. All of these numbers are the founders' own early estimates.

## Common mistakes

- Starting with fine-tuning or a multi-agent system before a prompted baseline has been measured.
- Blaming the model when the real problem is that retrieval returned the wrong passages.
- Ignoring cost per task until the first large customer arrives and margins turn out negative.
- Spending all the effort on the model and none on the workflow the user actually touches.

## Your turn

Take 20 minutes. Write down your product's single most important user task. Sketch the four layers for it, naming the model, data sources, orchestration steps and the screen or channel. Then mark which rung of the ladder you are on today and what evidence would justify moving up one rung. Finish with a rough cost-per-task estimate, even if it is a range.

## Key takeaways

- An AI product is a system of model, context, orchestration and workflow; your moat is mostly in context and workflow.
- Climb the ladder: prompting, then RAG, then fine-tuning, then agents, each justified by measured results.
- Buy commodity components and build what is specific to your domain.
- Know your cost and latency per task early, and use routing, caching and human fallback to manage them.

## Resources

- Building effective agents (Anthropic): https://www.anthropic.com/engineering/building-effective-agents
- Patterns for Building LLM-based Systems and Products (Eugene Yan): https://eugeneyan.com/writing/llm-patterns/
- What We Learned From a Year of Building with LLMs: https://applied-llms.org/
- Building LLM applications for production (Chip Huyen): https://huyenchip.com/2023/04/11/llm-engineering.html
- Optimizing LLM accuracy (OpenAI): https://platform.openai.com/docs/guides/optimizing-llm-accuracy
