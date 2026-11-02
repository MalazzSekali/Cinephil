import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { error } = await db().from("users").select("id", { head: true }).limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (error) {
    const configMissing = error instanceof Error && error.message.includes("Database is not configured");
    const details = error && typeof error === "object" ? error as { name?: unknown; code?: unknown; status?: unknown } : {};
    console.error("Cinephil database readiness check failed", {
      name: typeof details.name === "string" ? details.name : "unknown",
      code: typeof details.code === "string" ? details.code : undefined,
      status: typeof details.status === "number" ? details.status : undefined,
    });
    return NextResponse.json(
      { status: "unavailable", reason: configMissing ? "configuration_missing" : "connection_failed" },
      { status: 503 },
    );
  }
}
