import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { startSession, usernamePattern } from "@/lib/auth";
const schema = z.object({username:z.string().regex(usernamePattern), password:z.string().min(10).max(128)});
export async function POST(req:Request) {
  const parsed = schema.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({error:"Username must be 3–24 letters, numbers or underscores; password must be at least 10 characters."},{status:400});
  try {
    const username=parsed.data.username.toLowerCase();
    const hash=await bcrypt.hash(parsed.data.password,12);
    const {data,error}=await db().from("users").insert({username,password_hash:hash,display_name:parsed.data.username}).select("id").single();
    if(error) return NextResponse.json({error:error.code==="23505"?"Username is already taken.":"Could not create your account."},{status:error.code==="23505"?409:500});
    await startSession(data.id);
    return NextResponse.json({ok:true});
  } catch (error) {
    const missingConfig=error instanceof Error && error.message.includes("Database is not configured");
    return NextResponse.json({error:missingConfig?"Account creation is temporarily unavailable because database setup is incomplete.":"Could not create your account right now."},{status:missingConfig?503:500});
  }
}
