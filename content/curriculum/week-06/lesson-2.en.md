## Learning objectives

- Choose one primary metric and the few input metrics that drive it.
- Define activation and retention events that reflect real value for your users.
- Calculate CAC, LTV and payback, and explain what they mean at an early stage.
- Build an AI gross margin that includes inference and human review, and check whether you are "default alive".

## Overview

Metrics are how a startup knows whether this week was better than last week. Without them, founders drift into activity that feels productive but changes nothing. AI startups need one more discipline that software founders could once skip: their cost of delivering the product does not round to zero. Every answer costs money in model calls, and often in human review too. Investors know this, and as of 2026 they routinely ask AI founders about gross margin and inference costs at the seed stage. This lesson gives you a small, honest set of numbers to run the company on.

## The metrics that matter

### One primary metric

YC partners consistently advise picking one primary metric, the number you would bet the company on, and making it the center of every weekly meeting. Paul Graham's essay "Startup = Growth" says the best thing to measure is revenue, with active users the next best choice for startups not yet charging. He also notes that a good growth rate during YC is 5 to 7% a week. Treat that as a reference for momentum, not a requirement for every business.

### Input metrics

Under the primary metric, choose three to five input metrics you can directly influence, such as new accounts activated, weekly active users per account or pilots converted. Together they form a simple metric tree: if an input moves, the primary metric should follow.

### Avoid vanity metrics

Total sign-ups, page views and model calls go up and to the right without telling you whether anyone gets value. Prefer rates and cohorts over cumulative totals.

### Activation: the first moment of value

Activation is the point at which a new user first gets the value you promised. Define it as a specific event, not a feeling: "completed the first report", "got a correct answer to a real question". Then measure the share of new users who reach it and how long it takes. Time to value is often where AI products win or lose, because a slow setup kills the magic.

### Retention: value that lasts

Lesson 1 covered retention curves. For your dashboard, pick one retention number at your product's natural frequency, such as weekly active users in week 4 for each cohort. For B2B products, also track net revenue retention: revenue from an existing cohort of customers a year later, including expansion and minus churn, divided by their starting revenue. A figure above 100% means existing customers grow on their own.

## Unit economics: CAC, LTV and payback

### Customer acquisition cost

CAC is what you spend to win one customer: sales and marketing costs divided by new customers in the same period. Early on, include founder time at a fair cost, because founder-led sales is not free; it is just unpaid.

### Lifetime value

A simple LTV is average monthly revenue per customer, multiplied by gross margin, divided by monthly churn rate. The gross-margin term matters: lifetime value is the profit a customer generates, not the revenue. With only a few months of data, churn estimates are fragile, so show LTV as a range.

### Ratios people use

David Skok's widely used "SaaS Metrics 2.0" guide offers two rules of thumb: LTV should be at least three times CAC, and CAC should be recovered within about 12 months of gross profit. These are guides for scaling businesses. At the pilot stage, use them to check direction, not to reject an idea.

## AI gross margin and inference costs

### What goes into cost of goods sold

Gross margin is revenue minus cost of goods sold (COGS), divided by revenue. For an AI product, COGS usually includes model inference, speech or vision APIs, retrieval and hosting infrastructure, and any human review or labeling that is part of delivering the answer. Support costs that scale with customers often belong here too.

### Why AI margins differ

In a 2020 analysis, "The New Business of AI", the venture firm a16z observed that AI companies often had gross margins in the 50 to 60% range, below the 60 to 80% or more typical of comparable SaaS businesses, mainly because of cloud compute and human involvement. Model prices have fallen since then, but usage per user has often grown, so the lesson still holds: margin is a design decision, not a given.

### Heavy users and the margin levers

Average cost hides the problem. A small share of heavy users can consume most of your inference budget, so look at cost per user by percentile, not just the mean. The levers are the ones from Week 5: route easy requests to cheaper models, retrieve less and better, cache repeats, and reduce the share of answers that need human review as your evals improve. Pricing, covered in Lesson 3, is the other lever.

## Default alive or default dead

Paul Graham's essay "Default Alive or Default Dead?" asks a blunt question: assuming expenses stay constant and revenue keeps growing at its recent rate, will you reach profitability on the money you have left? If yes, you are default alive. If not, you are default dead, and you need to change something or raise money while you still have time. Trevor Blackwell built a simple calculator for this, linked from the essay. Run it monthly. Most pre-seed startups are default dead, which is normal; the danger is not knowing it.

## Case study: Fieldnote

Fieldnote's dashboard puts one primary metric at the top: weekly active technicians across the 3 pilot contractors, to be replaced by revenue once pilots convert. Inputs are technicians activated, defined as receiving a correct, accepted answer to a real job question in the first week; questions per active technician per week; and the share of answers sent to human review.

To estimate gross margin, Tomás built a cost model per technician per month. These are the founders' own hypothetical estimates. He assumed about 60 questions per active technician per month. Model inference, retrieval and speech-to-text came to a few cents per question, roughly 2 to 3 dollars per technician. Human review was the surprise. With 15% of answers reviewed at about three minutes each, and reviewer time costed at roughly 30 dollars an hour, review cost several times more than the models, around 13 to 14 dollars per technician. At a test price of 40 dollars per technician per month, that left a gross margin near 60%. Cutting the review rate to 5% as evals improve would lift it above 80%.

That told the team where to work: the review rate, not the model bill, was the largest cost driver. Running Graham's question, Ana confirmed that with pilots still free, Fieldnote is default dead. Converting pilots to paid contracts became the most urgent job of the month.

## Common mistakes

- Tracking ten metrics with equal weight, so none of them drives decisions.
- Reporting cumulative sign-ups instead of activation and retention by cohort.
- Calculating LTV from revenue instead of gross profit, or from a single month of churn.
- Leaving inference and human review out of COGS, which makes margins look like classic SaaS.
- Not knowing whether you are default alive until runway is short.

## Your turn

Spend 25 minutes. Write your primary metric and three input metrics. Define your activation event in one sentence. Then build a one-tab cost model: tasks per user per month, model and API cost per task, share of tasks reviewed by a human and the cost per review, and the resulting cost per user. Compare it with a candidate price and calculate gross margin.

## Key takeaways

- Run the company on one primary metric, ideally revenue, with a few input metrics beneath it.
- Define activation and retention as concrete events tied to real value.
- LTV is built on gross profit; compare it with CAC and payback as directional checks.
- AI gross margin must include inference and human review, and both can be designed down.
- Know every month whether you are default alive.

## Resources

- Startup = Growth (Paul Graham): https://paulgraham.com/growth.html
- Default Alive or Default Dead? (Paul Graham): https://paulgraham.com/aord.html
- Key Startup Metrics, Tom Blomfield (YC Startup Library): https://www.ycombinator.com/library/KR-key-startup-metrics
- 16 Startup Metrics (a16z): https://a16z.com/16-startup-metrics/
- The New Business of AI (a16z): https://a16z.com/the-new-business-of-ai-and-how-its-different-from-traditional-software/
