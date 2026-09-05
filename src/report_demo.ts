import { buildEducatorReport } from "./educator_report.js";

const report = buildEducatorReport({
  courseId: "typescript-101",
  now: "2026-09-02T09:00:00.000Z",
  learners: [
    { clientId: "learner-7", name: "Mina", deadline: "2026-09-03T09:00:00.000Z" },
    { clientId: "learner-8", name: "Jon", deadline: "2026-09-08T09:00:00.000Z" }
  ]
}, { members: [{ client_id: "learner-7" }] });

console.log(JSON.stringify(report, null, 2));
