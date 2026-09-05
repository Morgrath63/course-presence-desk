import { z } from "zod";

export const reportRequestSchema = z.object({
  courseId: z.string().min(1),
  now: z.iso.datetime(),
  learners: z.array(z.object({
    clientId: z.string().min(1),
    name: z.string().min(1),
    deadline: z.iso.datetime()
  })).min(1)
});

const presenceSchema = z.object({
  members: z.array(z.union([
    z.string(),
    z.object({ client_id: z.string() })
  ])).default([])
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;

export function buildEducatorReport(input: ReportRequest, rawPresence: unknown) {
  const presence = presenceSchema.parse(rawPresence);
  const onlineIds = new Set(presence.members.map((member) =>
    typeof member === "string" ? member : member.client_id
  ));
  const now = new Date(input.now).getTime();
  const reminderWindowMs = 48 * 60 * 60 * 1000;

  const learners = input.learners.map((learner) => {
    const millisecondsLeft = new Date(learner.deadline).getTime() - now;
    const online = onlineIds.has(learner.clientId);
    return {
      ...learner,
      online,
      needsReminder: online && millisecondsLeft >= 0 && millisecondsLeft <= reminderWindowMs
    };
  });

  return {
    courseId: input.courseId,
    onlineCount: learners.filter((learner) => learner.online).length,
    reminderCount: learners.filter((learner) => learner.needsReminder).length,
    learners
  };
}
