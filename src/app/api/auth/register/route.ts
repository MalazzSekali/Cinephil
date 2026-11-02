import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { startSession, usernamePattern } from "@/lib/auth";
const schema = z.object({username:z.string().regex(usernamePattern), password:z.string().min(10).max(128)});
export async function POST(req:Request) {
  const parsed = schema.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({error:"Username must be 3–24 letters, numbers or underscores; password must be at least 10 characters."},{status:400});
  const username=parsed.data.username.toLowerCase();
  const hash=await bcrypt.hash(parsed.data.password,12);
  const {data,error}=await db().from("users").insert({username,password_hash:hash,display_name:parsed.data.username}).select("id").single();
  if(error) return NextResponse.json({error:error.code==="23505"?"Username is already taken.":"Could not create your account."},{status:error.code==="23505"?409:500});
  await startSession(data.id);
  return NextResponse.json({ok:true});
}
