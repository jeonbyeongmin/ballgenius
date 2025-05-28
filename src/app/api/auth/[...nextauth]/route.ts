import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: {
          label: "이메일",
          type: "email",
          placeholder: "user@example.com",
        },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // DB 없이 하드코딩 예시 (실제 서비스에서는 사용 금지)
        if (
          credentials.email === "test@example.com" &&
          credentials.password === "test1234"
        ) {
          return { id: "1", email: "test@example.com", name: "테스트유저" };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin" },
});
export { handler as GET, handler as POST };
