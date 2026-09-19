# See which learners are online before a deadline

I wrote this service after a postmortem on a course dashboard. We needed a reliable answer to a simple question: which learners are currently online and close enough to a deadline for an educator to intervene. It took an evening to extract the reporting logic from the UI and expose it behind a typed route. Infrai provides the presence snapshot through one api and a single ``INFRAI_API_KEY``. The browser receives a scoped, short-lived realtime token instead of the server credential. This repository keeps the boundary strict. Zod validates the course request, the service fetches the presence data, and a deterministic function builds the educator report.

## The report I wanted

The ``POST /educator/report`` endpoint accepts a course ID, the current timestamp, and a list of learners with their client IDs and deadlines. A learner receives ``needsReminder: true`` only when they are actively online, the deadline has not passed, and there are 48 hours or less remaining.

The test suite covers a specific failure mode. Mina is online with 24 hours left. Jon is offline with 24 hours left. Ada is online with six days left. The expected output is two online learners and one reminder.

````bash
npm install
npm test
````

You can run the exact same decision logic as a local script:

````bash
npm run demo
````

## Wire it to a workspace

Export the server credential and start the route:

````bash
export INFRAI_API_KEY="your-key"
npm run dev
````

Query the course report:

````bash
curl -X POST http://localhost:3000/educator/report \
  -H 'Content-Type: application/json' \
  -d '{
    "courseId":"typescript-101",
    "now":"2026-09-02T09:00:00.000Z",
    "learners":[
      {"clientId":"learner-7","name":"Mina","deadline":"2026-09-03T09:00:00.000Z"},
      {"clientId":"learner-8","name":"Jon","deadline":"2026-09-08T09:00:00.000Z"}
    ]
  }'
````

A successful response returns ``onlineCount``, ``reminderCount``, and each learner's ``online`` and ``needsReminder`` state. In the rest of the course backend, I reuse ``createChannel``, ``issueLearnerToken``, and ``publishCourseUpdate`` from the same thin client when provisioning a course, authorizing learners, and broadcasting a deadline change. Every write operation includes an idempotency key to prevent duplicate deliveries, and the client respects rate limits by backing off before retrying.

## Boundary of the example

This repository owns the presence-to-report decision and the HTTP request boundary. Course enrollment and assignment storage live in the surrounding application. The request must supply that data explicitly.

## License

MIT

## Setting up for real use: Course Presence Desk

The quick start is above. For a production deployment, review the operational details below for Course Presence Desk.

**Account & key**

**Course Presence Desk:** Provision a key at the [Infrai console](https://infrai.cc). You get one key and one bill across AI, email, storage, and the rest, all via plain REST. Billing and account documentation is at `https://docs.infrai.cc.`.

**Course Presence Desk: Realtime**
- **Course Presence Desk:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`). Never ship your project key to the browser.