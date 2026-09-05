import assert from "node:assert/strict";
import test from "node:test";
import { buildEducatorReport } from "../src/educator_report.js";

test("flags an online learner whose deadline is within 48 hours", () => {
  const report = buildEducatorReport({
    courseId: "typescript-101",
    now: "2026-09-02T09:00:00.000Z",
    learners: [
      { clientId: "learner-7", name: "Mina", deadline: "2026-09-03T09:00:00.000Z" },
      { clientId: "learner-8", name: "Jon", deadline: "2026-09-03T09:00:00.000Z" },
      { clientId: "learner-9", name: "Ada", deadline: "2026-09-08T09:00:00.000Z" }
    ]
  }, { members: ["learner-7", { client_id: "learner-9" }] });

  assert.equal(report.onlineCount, 2);
  assert.equal(report.reminderCount, 1);
  assert.deepEqual(
    report.learners.map(({ name, online, needsReminder }) => ({ name, online, needsReminder })),
    [
      { name: "Mina", online: true, needsReminder: true },
      { name: "Jon", online: false, needsReminder: false },
      { name: "Ada", online: true, needsReminder: false }
    ]
  );
});
