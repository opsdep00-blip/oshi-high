import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as logger from "@/lib/logger";

export async function POST() {
  // Safety: only allow in non-production or when explicitly enabled
  if (process.env.NODE_ENV === "production") {
    logger.warn("Attempted DB reset in production blocked");
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }
  if (process.env.ENABLE_DB_RESET !== "true") {
    logger.warn("DB reset attempted but ENABLE_DB_RESET is not true");
    return NextResponse.json({ error: "DB reset not enabled" }, { status: 403 });
  }

  try {
    // Delete dependent records first to satisfy FK constraints
    const deleted = {
      supportTransactions: 0,
      yellMaterials: 0,
      ads: 0,
      idols: 0,
      accounts: 0,
      sessions: 0,
      verificationTokens: 0,
      users: 0,
    };

    await prisma.$transaction(async (tx) => {
      deleted.supportTransactions = await tx.supportTransaction.deleteMany({}).then((r) => r.count);
      deleted.yellMaterials = await tx.yellMaterial.deleteMany({}).then((r) => r.count);
      deleted.ads = await tx.ad.deleteMany({}).then((r) => r.count);
      deleted.idols = await tx.idol.deleteMany({}).then((r) => r.count);
      deleted.accounts = await tx.account.deleteMany({}).then((r) => r.count);
      deleted.sessions = await tx.session.deleteMany({}).then((r) => r.count);
      deleted.verificationTokens = await tx.verificationToken.deleteMany({}).then((r) => r.count);
      deleted.users = await tx.user.deleteMany({}).then((r) => r.count);
    });

    logger.info("DB reset performed (dev)", deleted);

    return NextResponse.json({ success: true, deleted }, { status: 200 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    logger.error("DB reset failed:", err);
    return NextResponse.json({ error: "Reset failed", details: err.message }, { status: 500 });
  }
}