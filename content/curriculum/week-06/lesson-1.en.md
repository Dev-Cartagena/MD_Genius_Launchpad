## Learning objectives

- Explain what product-market fit is, and recognize the false signals founders often mistake for it.
- Run the Sean Ellis 40% survey correctly and interpret the result with care.
- Read a cohort retention curve and tell a flattening curve from a leaking one.
- Use Superhuman's PMF engine to turn survey answers into a focused roadmap.

## Overview

Every startup lesson so far has been building toward one question: do people truly need what you made? Marc Andreessen's 2007 essay "The only thing that matters" defined product-market fit as being in a good market with a product that can satisfy that market, and argued it is the one thing a startup must reach. Before it, almost nothing else matters; after it, almost everything changes. AI products make the question harder, because a novel demo can create excitement and trial usage that fade in weeks. This lesson gives you three instruments that cut through the noise: a survey, a retention curve and a method for raising both.

## What product-market fit is and is not

### The signs of real pull

Andreessen described the difference vividly. Without fit, customers get little value, word of mouth is weak, usage grows slowly and sales cycles drag. With fit, customers buy as fast as you can deliver, usage grows faster than you can add capacity, and you are hiring support staff as quickly as you can. Michael Seibel's YC post "The Real Product Market Fit" adds a warning: many founders believe they have fit long before they do, and then hire, spend and optimize too early.

### False signals

Watch out for these, which feel like fit but are not:

- Sign-ups and waitlists driven by curiosity about AI.
- Pilots that never convert to paid use.
- Praise from people who do not use the product weekly.
- Growth bought with paid ads that stops when spending stops.
- A large funding round or a growing headcount.

### Fit is per segment

You rarely have fit with a whole market at once. You have it with a specific group of users doing a specific job. Most of the useful work in this lesson comes from finding that group and serving it better.

## The Sean Ellis 40% test

Sean Ellis, who ran early growth at companies including Dropbox and LogMeIn and coined the term growth hacking, developed a simple leading indicator of fit. It is one survey question.

### The question

"How would you feel if you could no longer use this product?" Answers: very disappointed, somewhat disappointed, not disappointed. Ellis's benchmark, based on his work with many startups, is that companies where at least 40% of users answer "very disappointed" tend to find it much easier to grow, while those well below it usually struggle.

### Who to survey

Survey only people who have experienced the core of the product. As described in First Round Review's account of Superhuman's method, that means users who have used the product at least twice in the last two weeks. Survey each person once. About 40 responses give a directional read; fewer than that, treat the number as anecdote.

### How to read the result

The score is a thermometer, not a verdict, and 40% is a rough benchmark, not a hard line. It is most useful as a trend you track every few weeks and as a lens for segmenting your users. Small samples swing a lot, so report the number of respondents with the percentage. A result just above 40% from one enthusiastic customer is weaker evidence than 35% across five.

## Retention curves: the behavioral test

Surveys capture what people say. Retention captures what they do. Investors often trust retention more than any other early metric.

### How to build one

Group users into cohorts by the week or month they started. For each cohort, plot the share still doing the core action in each following period. Choose an action that reflects real value at the product's natural frequency: a daily tool should be measured daily or weekly, an accounting product monthly. For B2B, track both accounts that stay and active users per account.

### Reading the shape

Every curve drops at first as casual users leave. What matters is what happens next. A curve that flattens into a stable plateau means a core group gets lasting value; that plateau is the strongest early evidence of fit. A curve that keeps sliding toward zero means you are leaking users, and no amount of acquisition will fix it. Newer cohorts that flatten higher than older ones mean your product is improving.

### AI-specific traps

AI products often see a novelty spike: people try the impressive thing, then drift away. Do not count a first-week cohort as retained until it survives the novelty period. Also measure whether users accept the AI's output or override it, because a user who logs in daily to correct every answer is not getting value.

## Superhuman's product-market fit engine

Rahul Vohra, founder of the email client Superhuman, described in First Round Review how his team turned the Ellis question into a repeatable process. When they first ran the survey, 22% of users said very disappointed.

### Four questions

They asked:

1. How would you feel if you could no longer use Superhuman?
2. What type of people do you think would most benefit from Superhuman?
3. What is the main benefit you receive from Superhuman?
4. How can we improve Superhuman for you?

### Segment, then focus

They grouped responses by persona and found that some groups, such as founders and executives, were far more likely to be very disappointed. Focusing on those segments alone raised the score to 33%. Answers to question 2 described their high-expectation customer in detail.

### Build half for lovers, half for the persuadable

Next they ignored users who would not be disappointed. Among the somewhat disappointed, they kept only those whose main benefit matched what the lovers valued, which for Superhuman was speed, and asked what held them back. The roadmap was then split: half doubled down on what lovers loved, half removed what held back the persuadable. Vohra reports that after about three quarters of this work the score reached 58%. Tracking the score regularly made fit a number the team could manage.

## Case study: Fieldnote

Fieldnote is now running with 3 pilot contractors. After several weeks of pilot use, the founders surveyed technicians who had used the assistant at least twice in the previous two weeks. In the founders' own data, 46% answered very disappointed, from 52 responses across the three pilots.

Ana and Tomás treated this as encouraging, not as proof. Segmenting showed that technicians in their first three years answered very disappointed far more often than veterans, and the most common main benefit was "error codes and part numbers answered on the spot". Among the somewhat disappointed who named the same benefit, the top blocker was poor signal in basements and plant rooms. Veterans who were not disappointed mostly said they already knew the codes; the team set them aside.

Their weekly retention chart by pilot cohort showed an early drop and then a plateau in active technicians at two of the three contractors. At the third, usage kept sliding; interviews revealed the dispatcher had never told technicians the tool was approved. Following the Superhuman split, half of the next month's roadmap goes to faster answers on error codes and parts, and half goes to an offline mode for low-signal sites. All figures are the founders' own.

## Common mistakes

- Treating sign-ups, pilots or praise as product-market fit.
- Surveying everyone, including people who barely used the product, or reporting a percentage without the sample size.
- Averaging the survey across all users instead of segmenting to find who loves the product.
- Ignoring a retention curve that never flattens while spending more on acquisition.
- Building for users who would not be disappointed, at the expense of those who would.

## Your turn

Spend 25 minutes. Draft your version of the four Superhuman questions. Define who qualifies to receive the survey, using a usage rule. Then sketch the retention curve you would expect if you had fit: name the core action, the time period and the plateau level you would consider strong for your market, and how you will measure it.

## Key takeaways

- Product-market fit shows up as pull: customers using, buying and referring faster than you can keep up.
- The Sean Ellis test asks how users would feel without the product; 40% "very disappointed" is the benchmark.
- A retention curve that flattens is the best behavioral evidence of fit; one that slides to zero is a leak.
- Superhuman's engine segments users, focuses on lovers and the persuadable, and tracks the score over time.

## Resources

- The only thing that matters (Marc Andreessen): https://pmarchive.com/guide_to_startups_part4.html
- The Real Product Market Fit (Michael Seibel, YC): https://www.ycombinator.com/blog/the-real-product-market-fit/
- How Superhuman built an engine to find product-market fit (First Round Review): https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/
- Product/Market fit survey (Sean Ellis): https://pmfsurvey.com/
- What is good retention (Lenny Rachitsky): https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29
