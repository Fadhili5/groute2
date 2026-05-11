import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

async function backendFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export function proxyGet(path: string) {
  return backendFetch(path);
}

export function proxyPost(path: string, body: unknown) {
  return backendFetch(path, { method: "POST", body: JSON.stringify(body) });
}

export function proxyPut(path: string, body?: unknown) {
  return backendFetch(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined });
}
