import { createServer, type ServerResponse } from "node:http";
import { InfraiError, InfraiRealtime } from "./infrai_realtime.js";
import { buildEducatorReport, reportRequestSchema } from "./educator_report.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const infrai = new InfraiRealtime(apiKey);
const port = Number(process.env.PORT ?? 3000);

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/educator/report") {
    json(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = reportRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const presence = await infrai.getPresence(`course-${input.courseId}`);
    json(response, 200, buildEducatorReport(input, presence));
  } catch (error) {
    if (error instanceof InfraiError) {
      json(response, error.status >= 400 && error.status < 500 ? error.status : 502, {
        error: error.code
      });
      return;
    }
    json(response, 400, { error: error instanceof Error ? error.message : "Invalid request" });
  }
});

server.listen(port, () => console.log(`Course presence service listening on http://localhost:${port}`));
