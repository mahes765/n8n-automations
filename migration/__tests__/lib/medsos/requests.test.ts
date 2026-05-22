jest.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock("@/lib/medsos/entitlements", () => ({
  chargeMedsosQuota: jest.fn(),
  getActiveMedsosEntitlement: jest.fn(),
}));

jest.mock("@/lib/env", () => ({
  appUrl: (path: string) => path,
}));

import { normalizeMedsosRequestLifecycle } from "@/lib/medsos/requests";
import type { MedsosRequest } from "@/lib/types";

describe("normalizeMedsosRequestLifecycle", () => {
  const baseRequest: MedsosRequest = {
    id: 101,
    user_id: 7,
    entitlement_id: 55,
    platform: "instagram",
    profile_url: "https://instagram.com/example",
    notes: null,
    status: "generating_report",
    progress_percent: 85,
    current_step: "Generating report",
    n8n_execution_id: "exec-123",
    callback_token: "callback-token-123456",
    retry_count: 0,
    max_retries: 3,
    quota_charged: false,
    requested_at: "2026-05-22T10:00:00.000Z",
    started_at: "2026-05-22T10:01:00.000Z",
    completed_at: null,
    failed_at: null,
    error_code: null,
    error_message: null,
    metadata: {},
    created_at: "2026-05-22T10:00:00.000Z",
    updated_at: "2026-05-22T10:05:00.000Z",
  };

  it("marks request as completed when result row exists", () => {
    const normalized = normalizeMedsosRequestLifecycle(baseRequest, { id: 999 });

    expect(normalized.status).toBe("completed");
    expect(normalized.progress_percent).toBe(100);
    expect(normalized.current_step).toBe("Report completed");
    expect(normalized.completed_at).toBe(baseRequest.updated_at);
  });

  it("keeps request unchanged when result row is missing", () => {
    const normalized = normalizeMedsosRequestLifecycle(baseRequest, null);

    expect(normalized).toEqual(baseRequest);
  });
});
