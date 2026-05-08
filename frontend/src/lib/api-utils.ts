import { NextResponse } from "next/server";

export class RouteError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "RouteError";
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json(
    { error: { code: "BAD_REQUEST", message, details } },
    { status: 400 }
  );
}

export function notFound(message = "Resource not found") {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message } },
    { status: 404 }
  );
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";
  console.error("[API Error]", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message } },
    { status: 500 }
  );
}

export function withError(handler: () => Promise<NextResponse>) {
  return handler().catch((error) => {
    if (error instanceof RouteError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.status }
      );
    }
    return serverError(error);
  });
}
