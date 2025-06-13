import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * API 응답을 표준화합니다
 */
export function createApiResponse<T>(
  data?: T,
  message?: string,
  status: number = 200
) {
  return NextResponse.json(
    {
      success: status < 400,
      data,
      message,
    },
    { status }
  );
}

/**
 * API 에러 응답을 생성합니다
 */
export function createErrorResponse(error: string, status: number = 400) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

/**
 * 현재 로그인한 사용자 정보를 가져옵니다
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

/**
 * 사용자 인증을 확인합니다
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

/**
 * 페이지네이션 정보를 계산합니다
 */
export function calculatePagination(
  page: number = 1,
  limit: number = 10,
  total: number
) {
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    total,
    totalPages,
    offset,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * 검색 파라미터를 파싱합니다
 */
export function parseSearchParams(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50); // 최대 50개로 제한
  const search = searchParams.get("search") || undefined;
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  return {
    page,
    limit,
    search,
    sortBy,
    sortOrder,
  };
}

/**
 * 날짜 범위를 파싱합니다
 */
export function parseDateRange(searchParams: URLSearchParams) {
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  return {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  };
}

/**
 * 에러를 처리하고 적절한 응답을 반환합니다
 */
export function handleApiError(error: unknown) {
  console.error("API Error:", error);

  if (error instanceof Error) {
    if (error.message === "Authentication required") {
      return createErrorResponse("로그인이 필요합니다", 401);
    }
    return createErrorResponse(error.message, 400);
  }

  return createErrorResponse("내부 서버 오류가 발생했습니다", 500);
}
