import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/idols
 * 全ての推しを取得
 * クエリパラメータ:
 * - claimed: "true" | "false" (公式クレーム済みのみ/未クレーム のみ)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const claimedFilter = searchParams.get("claimed");

    const where: any = {};
    if (claimedFilter === "true") {
      where.claimedBy = { not: null };
    } else if (claimedFilter === "false") {
      where.claimedBy = null;
    }

    const idols = await prisma.idol.findMany({
      where,
      include: {
        supporters: {
          select: { id: true, email: true },
        },
        _count: {
          select: { supporters: true, transactions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: idols,
    });
  } catch (error) {
    console.error("GET /api/idols error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch idols" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/idols
 * 新しい推しを作成 (ファン作成)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, snsHandle, snsLink, description } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // 推し作成
    const idol = await prisma.idol.create({
      data: {
        name,
        snsHandle: snsHandle || null,
        snsLink: snsLink || null,
        description: description || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: idol,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/idols error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create idol" },
      { status: 500 }
    );
  }
}
