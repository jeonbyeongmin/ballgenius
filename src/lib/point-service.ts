import { prisma } from "./prisma";
import { PointType } from "@prisma/client";

export class PointService {
  // 포인트 추가
  static async addPoints(
    userId: string,
    amount: number,
    type: PointType,
    description?: string,
    relatedId?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // 사용자 포인트 업데이트
      await tx.user.update({
        where: { id: userId },
        data: { points: { increment: amount } },
      });

      // 포인트 히스토리 기록
      await tx.pointHistory.create({
        data: {
          userId,
          amount,
          type,
          description,
          relatedId,
        },
      });
    });
  }

  // 포인트 차감
  static async deductPoints(
    userId: string,
    amount: number,
    type: PointType,
    description?: string,
    relatedId?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // 사용자 포인트 확인
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { points: true },
      });

      if (!user || user.points < amount) {
        throw new Error("포인트가 부족합니다.");
      }

      // 포인트 차감
      await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: amount } },
      });

      // 포인트 히스토리 기록
      await tx.pointHistory.create({
        data: {
          userId,
          amount: -amount,
          type,
          description,
          relatedId,
        },
      });
    });
  }

  // 사용자 포인트 조회
  static async getUserPoints(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });
    return user?.points || 0;
  }

  // 포인트 히스토리 조회
  static async getPointHistory(userId: string, limit: number = 50) {
    return await prisma.pointHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
