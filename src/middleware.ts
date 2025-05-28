export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/"], // 홈(메인) 페이지 보호, 필요시 경로 추가
};
