"use client";
import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    // TODO: 실제 회원가입 API 연동
    if (email === "test@example.com") {
      setError("이미 존재하는 이메일입니다.");
      return;
    }
    setSuccess(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-900 rounded-xl shadow p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h2 className="text-xl font-bold mb-2">회원가입</h2>
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
        <input
          type="password"
          placeholder="비밀번호 확인"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        {success && (
          <div className="text-green-600 text-sm">
            회원가입이 완료되었습니다. 로그인 해주세요.
          </div>
        )}
        <button
          type="submit"
          className="bg-blue-500 text-white rounded px-4 py-2 font-bold hover:bg-blue-600"
        >
          회원가입
        </button>
      </form>
    </div>
  );
}
