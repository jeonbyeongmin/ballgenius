import { NextResponse } from "next/server";

// 회원가입 API 비활성화: DB 없이 동작하므로 501 에러 반환
export async function POST() {
  return NextResponse.json(
    { error: "회원가입 기능이 비활성화되었습니다." },
    { status: 501 }
  );
}
