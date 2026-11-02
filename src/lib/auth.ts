import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const COOKIE = "cinephil_session";
const digest = (v: string) => createHash("sha256").update(v).digest("hex");
export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const { data } = await db().from("user_sessions").select("user_id, expires_at, users(id, username, display_name)").eq("token_hash", digest(token)).maybeSingle();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  return (data as any).users as {id:string; username:string; display_name:string};
}
export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + 1000*60*60*24*30).toISOString();
  const { error } = await db().from("user_sessions").insert({ user_id:userId, token_hash:digest(token), expires_at:expires });
  if (error) throw error;
  (await cookies()).set(COOKIE, token, { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", path:"/", expires:new Date(expires) });
}
export async function endSession() {
  const jar = await cookies(); const token = jar.get(COOKIE)?.value;
  if (token) await db().from("user_sessions").delete().eq("token_hash", digest(token));
  jar.delete(COOKIE);
}
export const usernamePattern = /^[a-zA-Z0-9_]{3,24}$/;
