import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as logger from "@/lib/logger";
import { auth } from "@/auth";

/**
 * GET /api/users
 * ユーザー一覧を取得 (管理者のみ)
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        supportingIdolId: true,
        createdAt: true,
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    logger.error("GET /api/users error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
