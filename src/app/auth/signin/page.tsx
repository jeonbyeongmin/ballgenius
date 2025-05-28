"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });
    if (res?.error) setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    if (res?.ok) window.location.href = "/";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-900 rounded-xl shadow p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h2 className="text-xl font-bold mb-2">로그인</h2>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button
          type="submit"
          className="bg-blue-500 text-white rounded px-4 py-2 font-bold hover:bg-blue-600"
        >
          로그인
        </button>
      </form>
    </div>
  );
}
