## Learning objectives

- Build a ground-truth eval set from real user inputs, with clear pass criteria for each case.
- Choose the right grading method: code checks, expert review or a calibrated model judge.
- Design a human-in-the-loop step that protects users and feeds a data flywheel.
- Set up the minimum production monitoring an early AI product needs.

## Overview

Traditional software either works or throws an error. AI software fails quietly: it returns a fluent, confident answer that is wrong. You cannot catch that by clicking around a demo, and you cannot improve what you cannot measure. Practitioners such as Hamel Husain, in his essay "Your AI Product Needs Evals", argue that teams who build a disciplined evaluation habit early improve far faster than teams who tweak prompts by feel. Evals are also how you will convince a cautious customer, and later an investor, that your product is reliable. This lesson shows you how to build one from scratch with no ML background.

## Ground truth: building your eval set

An eval set is a fixed collection of test cases, each with an input and a way to decide whether the output passed. It is the closest thing an AI product has to a unit test suite.

### Where cases come from

The best cases are real inputs from real users: messages from your concierge MVP, support tickets, recorded calls, documents customers sent you. Add three more kinds deliberately:

- Edge cases: unusual but legitimate inputs, such as rare equipment or ambiguous phrasing.
- Hard negatives: questions your product should refuse or escalate, such as anything outside its scope.
- High-stakes cases: inputs where a wrong answer causes real harm, which you weight more heavily.

Avoid inventing all your cases yourself. Founders unconsciously write questions their system already handles.

### The anatomy of a case

Give every case the same fields:

1. Input: exactly what the user sends, including the messy parts.
2. Expected answer or pass criteria: a reference answer when one exists, or a short checklist such as "names the correct fault, cites the manual, includes the safety warning".
3. Grading method: how this case is scored (see below).
4. Tags: segment, task type, difficulty and risk level, so you can see where failures cluster.

A spreadsheet is enough to start. Fifty well-chosen cases will teach you more than five hundred careless ones. Grow the set every week from real failures.

### Who decides what is correct

Ground truth needs a domain expert, not just an engineer. If your users are nurses, accountants or technicians, someone with that experience must write or approve the expected answers. When experts disagree, write down the rule you chose. Those decisions become your product's quality standard.

## Grading: how to score outputs

Different checks suit different criteria. Use the cheapest method that is reliable for each one.

### Code-based checks

Anything objective should be checked by code: the output is valid JSON, the part number exists in the catalog, the answer cites at least one source, the response is under a length limit. These checks are fast, free and never drift.

### Expert human review

For judgment calls, such as whether a diagnosis is right or an answer is complete, a domain expert grades pass or fail against the criteria. Binary pass or fail with a one-line reason is more consistent than a 1 to 10 scale. Human review is slow, so you reserve it for the cases that need it and for calibrating the next method.

### Model as judge

You can ask a strong model to grade outputs against your criteria. This scales well, but a judge is itself an AI system that can be wrong. Hamel Husain's guide to LLM-as-a-judge recommends calibrating it: have your expert grade a sample, run the judge on the same sample, and only trust the judge once it agrees with the expert at a level you accept. Re-check agreement whenever you change the judge prompt or model.

### Error analysis comes first

Before chasing a single accuracy number, read the failures. Group them into categories: retrieval found the wrong passage, the model ignored the passage, the input was misheard, the question was out of scope. In RAG systems, score retrieval separately by checking whether the correct source appeared in the top results. The largest failure category tells you what to fix next, and it is often not the model.

## Human in the loop and the data flywheel

Early on, the safest way to ship an imperfect model is to put a person in the loop for the cases that matter.

### Confidence routing

Decide which outputs go straight to the user and which go to a reviewer first. Signals include the model's own stated confidence, whether retrieval found a strong match, the risk tag of the request, and simple rules such as "anything involving electrical safety". Start strict and loosen the threshold as your eval results improve.

### Turning reviews into a flywheel

Every human correction is valuable data. Log the original input, the model's answer, the corrected answer and the reason. Add the interesting ones to your eval set. Over time these corrections become training data for fine-tuning, better retrieval rules and sharper prompts. This loop, more usage producing more corrected data producing a better product, is the data flywheel that people mean when they talk about AI moats. It only works if your contracts and privacy terms allow you to use the data, so revisit the data rights work from Week 2.

## Monitoring in production

Evals tell you how the system performs on known cases. Monitoring tells you what happens with unknown ones.

### What to log

For every request, log the input, the retrieved context, the model and prompt version, the output, latency, cost, and any user reaction. Mask or exclude personal data you do not need.

### Signals worth watching

- Explicit feedback, such as thumbs up or down.
- Implicit feedback: users editing an answer, asking the same question again, or escalating to a human.
- Escalation rate and reviewer override rate.
- Cost and latency per task, against the estimates in your architecture one-pager.

### Regression runs

Model providers update models, and you will change prompts weekly. Run the full eval set before every change ships, and compare results with the previous version. A prompt that fixes one category and breaks another should not reach users.

## Case study: Fieldnote

Fieldnote's concierge weeks produced a log of real questions from technicians. Ana and Tomás selected 120 real diagnostic questions to form their first eval set, all of them the founders' own data. Ana, with her HVAC operations background, wrote the pass criteria for each: the correct likely fault, the right manual reference, the right part when relevant, and any required safety warning. They tagged every case by brand, equipment type, task (error code, symptom diagnosis, part lookup) and risk.

The first run surprised them. Error analysis showed the biggest failure category was retrieval, not reasoning: older units had scanned PDF manuals that had been indexed poorly, so the model never saw the right page. Tomás fixed the text extraction for scanned manuals before touching the prompt. Exact error codes were graded by code, part numbers were checked against the parts catalog, and diagnoses were graded by Ana. They tried a model judge for completeness but only used it after it matched Ana's grades on a sample she had already scored.

In the pilot build, any answer with weak retrieval, low stated confidence or a safety tag goes to a human review queue before reaching the technician. Each correction is logged and the best ones become new eval cases. The founders agreed with their pilot customers, in writing, how question data may be used.

## Common mistakes

- Judging quality by trying a few examples in a demo instead of running a fixed eval set.
- Writing every test case yourself, so the set only contains questions you expect.
- Trusting a model judge that has never been compared with an expert.
- Tuning the prompt without first checking whether retrieval found the right source.
- Shipping prompt or model changes without a regression run.

## Your turn

Spend 25 minutes. Pull 15 real inputs from your users, your concierge MVP or your interviews. For each, write the expected answer or pass criteria, choose a grading method, and add tags. Run them through your current prototype or a plain model, grade the results, and group the failures into categories. Note the largest category.

## Key takeaways

- Evals are a fixed set of real cases with clear pass criteria; start with about 50 and grow them from failures.
- Use code checks for objective criteria, experts for judgment, and a model judge only after calibration.
- Read failures and fix the biggest category first; in RAG, measure retrieval separately.
- Human review of uncertain answers protects users and powers the data flywheel.
- Log every request and run regression evals before every change.

## Resources

- Your AI Product Needs Evals (Hamel Husain): https://hamel.dev/blog/posts/evals/
- Using LLM-as-a-Judge for evaluation (Hamel Husain): https://hamel.dev/blog/posts/llm-judge/
- A Field Guide to Rapidly Improving AI Products (Hamel Husain): https://hamel.dev/blog/posts/field-guide/
- Define success criteria and build evaluations (Anthropic): https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests
- Rules of Machine Learning (Google): https://developers.google.com/machine-learning/guides/rules-of-ml
