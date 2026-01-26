import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/idols/:id
 * 指定の推しの詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const idol = await prisma.idol.findUnique({
      where: { id },
      include: {
        supporters: {
          select: { id: true, email: true, createdAt: true },
        },
        transactions: {
          select: {
            id: true,
            amount: true,
            activityPoints: true,
            createdAt: true,
            user: { select: { email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: { supporters: true, transactions: true },
        },
      },
    });

    if (!idol) {
      return NextResponse.json(
        { success: false, error: "Idol not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: idol,
    });
  } catch (error) {
    console.error("GET /api/idols/:id error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch idol" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/idols/:id
 * 推しの情報を更新 (公式オーナーのみ)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, snsHandle, profileImage } = body;

    // TODO: 認証チェック & 権限確認 (claimedBy == session.user.id)

    const idol = await prisma.idol.update({
      where: { id },
      data: {
        ...(description !== undefined && { description }),
        ...(snsHandle !== undefined && { snsHandle }),
        ...(profileImage !== undefined && { profileImage }),
      },
    });

    return NextResponse.json({
      success: true,
      data: idol,
    });
  } catch (error) {
    console.error("PATCH /api/idols/:id error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update idol" },
      { status: 500 }
    );
  }
}
