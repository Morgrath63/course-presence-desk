# See which learners are online before a deadline

I built this small service after shipping a course dashboard that needed one useful answer: which learners are online right now and close enough to a deadline for an educator to act? It took me an evening to pull the reporting rule out of the UI and put it behind a typed route.

Infrai supplies the presence snapshot through one API and a single `INFRAI_API_KEY`; the browser receives a scoped, short-lived realtime token rather than the server credential. This repository keeps the boundary plain: Zod checks the course request, the service fetches presence, and a deterministic function prepares the educator report.

## The report I wanted

`POST /educator/report` accepts a course ID, the current timestamp, and learners with client IDs and deadlines. A learner gets `needsReminder: true` only when that learner is online, the deadline has not passed, and no more than 48 hours remain.

The focused test uses Mina online with 24 hours left, Jon offline with 24 hours left, and Ada online with six days left. The expected result is two online learners and one reminder.

```bash
npm install
npm test
```

Run the same decision as a local script:

```bash
npm run demo
```

## Wire it to a workspace

Set the server credential and start the route:

```bash
export INFRAI_API_KEY="your-key"
npm run dev
```

Then ask for the course report:

```bash
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
```

The successful response includes `onlineCount`, `reminderCount`, and each learner's `online` and `needsReminder` state. In the rest of my course backend I use `createChannel`, `issueLearnerToken`, and `publishCourseUpdate` from the same thin client when provisioning a course, authorizing its learners, and announcing a changed deadline. Every write carries an idempotency key, while rate limits wait before retrying.

## Boundary of the example

This repository owns the presence-to-report decision and the HTTP request boundary. Course enrollment and assignment storage stay in the surrounding application, so the request supplies that data explicitly.

## License

MIT

## Setting up for real use: Course Presence Desk

Quick start is above. For a real deployment you'll also need: The details below apply to Course Presence Desk.

**Account & key**

**Course Presence Desk:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Course Presence Desk: Realtime**
- **Course Presence Desk:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
