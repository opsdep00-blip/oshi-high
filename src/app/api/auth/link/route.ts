import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as logger from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const token = body?.token;
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const pending = await prisma.pendingLink.findUnique({ where: { token } });
    if (!pending) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    if (pending.expiresAt < new Date()) return NextResponse.json({ error: "Token expired" }, { status: 410 });

    // ensure provider/account not already linked
    const exists = await prisma.account.findUnique({ where: { provider_providerAccountId: { provider: pending.provider, providerAccountId: pending.providerAccountId } } });
    if (exists) return NextResponse.json({ error: "Account already linked" }, { status: 409 });

    // create account attached to current user
    await prisma.account.create({ data: { userId: session.user.id, type: "oauth", provider: pending.provider, providerAccountId: pending.providerAccountId, /* optionally store data */ } });

    // delete pending
    await prisma.pendingLink.delete({ where: { token } });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    logger.error("/api/auth/link error", { error: err });
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
