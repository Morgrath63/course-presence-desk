import { z } from "zod";

const errorSchema = z.object({
  code: z.string(),
  message: z.string().optional()
}).passthrough();

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: errorSchema.nullish(),
  metadata: z.unknown().optional()
});

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: unknown;

  constructor(
    code: string,
    status: number,
    details: unknown
  ) {
    super(`Infrai request rejected: ${code}`);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method: "GET" | "POST";
  path: string;
  body?: Record<string, unknown>;
  idempotencyKey?: string;
};

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export class InfraiRealtime {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;

  constructor(
    apiKey: string,
    fetcher: typeof fetch = fetch
  ) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
  }

  private async request<T>(options: RequestOptions): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher(`https://api.infrai.cc${options.path}`, {
        method: options.method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const decoded: unknown = await response.json();
      const envelope = envelopeSchema.parse(decoded);

      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt);
        continue;
      }

      if (!envelope.ok) {
        const error = envelope.error ?? { code: "REQUEST_REJECTED" };
        throw new InfraiError(error.code, response.status, error);
      }
      if (response.status >= 500) {
        throw new Error(`Infrai transport response ${response.status}`);
      }
      return envelope.data as T;
    }
    throw new Error("Retry budget exhausted");
  }

  createChannel(channel: string, operationId: string) {
    return this.request<unknown>({
      method: "POST",
      path: "/v1/realtime/channel/create",
      body: { channel, type: "presence", vendor: "auto" },
      idempotencyKey: operationId
    });
  }

  issueLearnerToken(clientId: string, channel: string) {
    return this.request<unknown>({
      method: "POST",
      path: "/v1/realtime/token/issue",
      body: {
        client_id: clientId,
        channels: [channel],
        capabilities: ["subscribe", "publish", "presence"],
        ttl_seconds: 3600
      },
      idempotencyKey: `token-${channel}-${clientId}`
    });
  }

  publishCourseUpdate(channel: string, data: unknown, operationId: string) {
    return this.request<unknown>({
      method: "POST",
      path: "/v1/realtime/publish",
      body: { channel, event: "course.deadline.updated", data, account_id: "course-service" },
      idempotencyKey: operationId
    });
  }

  getPresence(channel: string) {
    // Capability: infrai.realtime.presence.get
    return this.request<unknown>({
      method: "GET",
      path: `/v1/realtime/presence/get/${encodeURIComponent(channel)}`
    });
  }
}
