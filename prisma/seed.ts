import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 시드 데이터 생성 시작...");

  // 테스트 사용자 생성
  const hashedPassword = await bcrypt.hash("test1234", 12);

  const testUser = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "테스트유저",
      password: hashedPassword,
      points: 1000,
    },
  });

  console.log("✅ 테스트 사용자 생성:", testUser.email);

  // 샘플 상점 아이템 생성
  const shopItems = [
    {
      name: "골든 배트",
      description: "황금빛으로 빛나는 특별한 배트 아바타",
      price: 500,
      category: "AVATAR" as const,
      imageUrl: "/images/items/golden-bat.png",
    },
    {
      name: "승리의 뱃지",
      description: "10연승을 달성한 플레이어만 착용할 수 있는 뱃지",
      price: 1000,
      category: "BADGE" as const,
      imageUrl: "/images/items/victory-badge.png",
    },
    {
      name: "포인트 부스터",
      description: "다음 5경기에서 획득하는 포인트가 2배가 됩니다",
      price: 300,
      category: "BOOST" as const,
      imageUrl: "/images/items/point-booster.png",
    },
    {
      name: "황금 글러브",
      description: "전설적인 야구선수들이 사용했던 글러브",
      price: 2000,
      category: "SPECIAL" as const,
      imageUrl: "/images/items/golden-glove.png",
    },
  ];

  for (const item of shopItems) {
    await prisma.shopItem.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    });
  }

  console.log("✅ 상점 아이템 생성 완료");

  // 오늘 날짜로 샘플 경기 생성 (실제로는 KBO API에서 가져올 예정)
  const today = new Date();
  const dateString = today.toISOString().slice(0, 10).replace(/-/g, "");

  const sampleGames = [
    {
      id: `${dateString}SKWO0`,
      date: dateString,
      time: "18:30",
      homeTeamId: "WO",
      homeTeamName: "키움",
      awayTeamId: "SK",
      awayTeamName: "SK",
      stadium: "고척스카이돔",
      status: "SCHEDULED" as const,
      homePitcherName: "후라도",
      awayPitcherName: "박종훈",
    },
    {
      id: `${dateString}LGOB0`,
      date: dateString,
      time: "18:30",
      homeTeamId: "OB",
      homeTeamName: "두산",
      awayTeamId: "LG",
      awayTeamName: "LG",
      stadium: "잠실야구장",
      status: "SCHEDULED" as const,
      homePitcherName: "발라즈",
      awayPitcherName: "임찬규",
    },
    {
      id: `${dateString}KTSS0`,
      date: dateString,
      time: "18:30",
      homeTeamId: "SS",
      homeTeamName: "SSG",
      awayTeamId: "KT",
      awayTeamName: "KT",
      stadium: "문학야구장",
      status: "SCHEDULED" as const,
      homePitcherName: "안우진",
      awayPitcherName: "고영표",
    },
  ];

  for (const game of sampleGames) {
    await prisma.game.upsert({
      where: { id: game.id },
      update: {},
      create: game,
    });

    // 각 경기에 대한 배팅 풀 생성
    await prisma.betPool.upsert({
      where: { gameId: game.id },
      update: {},
      create: {
        gameId: game.id,
        homePool: 0,
        awayPool: 0,
        totalPool: 0,
        homeOdds: 1.0,
        awayOdds: 1.0,
      },
    });
  }

  console.log("✅ 샘플 경기 및 배팅 풀 생성 완료");

  console.log("🎉 시드 데이터 생성 완료!");
}

main()
  .catch((e) => {
    console.error("❌ 시드 데이터 생성 중 오류:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
