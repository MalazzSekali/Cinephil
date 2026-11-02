import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { error } = await db().from("users").select("id", { head: true }).limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (error) {
    const configMissing = error instanceof Error && error.message.includes("Database is not configured");
    return NextResponse.json(
      { status: "unavailable", reason: configMissing ? "configuration_missing" : "connection_failed" },
      { status: 503 },
    );
  }
}
