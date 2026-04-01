import { WORDLIST } from "./wordlist";

export interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN: string;
}

interface TabData {
  id: number;
  windowId: number;
  title: string;
  url: string;
  favIconUrl: string;
  active: boolean;
  pinned: boolean;
}

const SESSION_TTL = 86400; // 24 hours in seconds

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function corsHeaders(origin: string, allowedOrigin: string): Record<string, string> {
  // Allow the configured origin, any subdomain of it, and chrome extensions
  const isAllowed =
    origin === allowedOrigin ||
    origin.endsWith("." + allowedOrigin.replace("https://", "")) ||
    origin.startsWith("chrome-extension://");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, status = 200, cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors },
  });
}

function extractBearer(request: Request): string | null {
  const auth = request.headers.get("Authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

function generateCode(): string {
  const arr = new Uint32Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((n) => WORDLIST[n % WORDLIST.length])
    .join("-");
}

async function cleanupExpired(db: D1Database): Promise<void> {
  await db
    .prepare("DELETE FROM sessions WHERE expires_at < ?")
    .bind(Math.floor(Date.now() / 1000))
    .run();
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleCreate(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  let body: { tabs: TabData[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, cors);
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_TTL;
  const secretToken = crypto.randomUUID();

  // Piggyback expired session cleanup
  await cleanupExpired(env.DB);

  let code = "";
  let inserted = false;

  for (let attempt = 0; attempt < 3; attempt++) {
    code = generateCode();
    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO sessions (code, tabs, secret_token, created_at, updated_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(code, JSON.stringify(body.tabs ?? []), secretToken, now, now, expiresAt)
      .run();

    if (result.meta.changes > 0) {
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    return json({ error: "Could not generate unique code, please retry" }, 503, cors);
  }

  return json({ code, secret_token: secretToken }, 201, cors);
}

async function handleRead(code: string, env: Env, cors: Record<string, string>): Promise<Response> {
  const now = Math.floor(Date.now() / 1000);
  const session = await env.DB.prepare(
    "SELECT tabs, updated_at FROM sessions WHERE code = ? AND expires_at > ?"
  )
    .bind(code, now)
    .first<{ tabs: string; updated_at: number }>();

  if (!session) {
    return json({ error: "Session not found or expired" }, 404, cors);
  }

  return json({ tabs: JSON.parse(session.tabs), updated_at: session.updated_at }, 200, cors);
}

async function handleUpdate(request: Request, code: string, env: Env, cors: Record<string, string>): Promise<Response> {
  const secret = extractBearer(request);
  if (!secret) return json({ error: "Unauthorized" }, 401, cors);

  const session = await env.DB.prepare("SELECT secret_token FROM sessions WHERE code = ?")
    .bind(code)
    .first<{ secret_token: string }>();

  if (!session) return json({ error: "Session not found" }, 404, cors);
  if (session.secret_token !== secret) return json({ error: "Unauthorized" }, 401, cors);

  let body: { tabs: TabData[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, cors);
  }

  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare("UPDATE sessions SET tabs = ?, updated_at = ? WHERE code = ?")
    .bind(JSON.stringify(body.tabs ?? []), now, code)
    .run();

  return json({ ok: true }, 200, cors);
}

async function handleDelete(request: Request, code: string, env: Env, cors: Record<string, string>): Promise<Response> {
  const secret = extractBearer(request);
  if (!secret) return json({ error: "Unauthorized" }, 401, cors);

  const session = await env.DB.prepare("SELECT secret_token FROM sessions WHERE code = ?")
    .bind(code)
    .first<{ secret_token: string }>();

  if (!session) return json({ error: "Session not found" }, 404, cors);
  if (session.secret_token !== secret) return json({ error: "Unauthorized" }, 401, cors);

  await env.DB.prepare("DELETE FROM sessions WHERE code = ?").bind(code).run();

  return json({ ok: true }, 200, cors);
}

// ---------------------------------------------------------------------------
// Main fetch handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? "";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const path = url.pathname;

    if (path === "/ping") {
      return json({ status: "ok" }, 200, cors);
    }

    if (request.method === "POST" && path === "/sessions") {
      return handleCreate(request, env, cors);
    }

    const codeMatch = path.match(/^\/sessions\/([\w-]+)$/);
    if (codeMatch) {
      const code = codeMatch[1];
      try {
        if (request.method === "GET") return handleRead(code, env, cors);
        if (request.method === "PATCH") return handleUpdate(request, code, env, cors);
        if (request.method === "DELETE") return handleDelete(request, code, env, cors);
      } catch (err) {
        console.error(err);
        return json({ error: "Internal server error" }, 500, cors);
      }
    }

    return json({ error: "Not found" }, 404, cors);
  },
};
