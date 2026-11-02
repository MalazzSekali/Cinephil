import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";
const schema=z.object({username:z.string().min(3).max(24),password:z.string().min(1).max(128)});
export async function POST(req:Request){
 const p=schema.safeParse(await req.json().catch(()=>null)); if(!p.success)return NextResponse.json({error:"Enter your username and password."},{status:400});
 const username=p.data.username.toLowerCase(), ip=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()??"unknown";
 const {data:allowed}=await db().rpc("allow_login_attempt",{p_username:username,p_ip:ip} as never);
 if(allowed===false)return NextResponse.json({error:"Too many attempts. Try again in 15 minutes."},{status:429});
 const {data}=await db().from("users").select("id,password_hash").eq("username",username).maybeSingle();
 if(!data || !(await bcrypt.compare(p.data.password,data.password_hash)))return NextResponse.json({error:"Username or password is incorrect."},{status:401});
 await db().rpc("clear_login_attempts",{p_username:username,p_ip:ip} as never); await startSession(data.id); return NextResponse.json({ok:true});
}
