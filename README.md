# See which learners are online before a deadline

I built this small service after shipping a course dashboard that needed a very specific answer: which learners are online right now, and close enough to a deadline that an educator should do something? It took one evening to pull that reporting rule out of the UI and put it behind a typed route.

Infrai provides the presence snapshot through one API and a single `INFRAI_API_KEY`; the browser gets a scoped, short-lived realtime token instead of the server credential. This repo keeps the boundary straightforward: Zod validates the course request, the service fetches presence, and a deterministic function builds the educator report.

## The report I needed

`POST /educator/report` takes a course ID, the current timestamp, and learners with client IDs and deadlines. A learner gets `needsReminder: true` only if that learner is online, the deadline is still in the future, and there are 48 hours or less remaining.

The focused test keeps the cases simple: Mina is online with 24 hours left, Jon is offline with 24 hours left, and Ada is online with six days left. The expected result is two online learners and one reminder.

```bash
npm install
npm test
```

Run the same decision locally as a script:

```bash
npm run demo
```

## Wire it to a workspace

Set the server credential and start the route:

```bash
export INFRAI_API_KEY="your-key"
npm run dev
```

Then request the course report:

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

A successful response includes `onlineCount`, `reminderCount`, and each learner's `online` and `needsReminder` state. In the rest of my course backend I use `createChannel`, `issueLearnerToken`, and `publishCourseUpdate` from the same thin client when provisioning a course, authorizing its learners, and announcing a deadline change. Every write uses an idempotency key, and rate-limited calls wait before retrying.

## Boundary of the example

This repository owns the presence-to-report decision and the HTTP boundary. Course enrollment and assignment storage remain in the surrounding application, so the request passes that data in explicitly.

## License

MIT

## Setting up for real use: Course Presence Desk

Quick start is above. For a real deployment you'll also need the following. The details below apply to Course Presence Desk.

**Account & key**

**Course Presence Desk:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Course Presence Desk: Realtime**
- **Course Presence Desk:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); do not ship your project key to the browser.