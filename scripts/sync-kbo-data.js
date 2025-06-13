#!/usr/bin/env node

/**
 * KBO 데이터 자동 동기화 스크립트
 * 매일 아침 9시에 실행되어 오늘의 경기 데이터를 동기화합니다.
 *
 * 사용법:
 * node scripts/sync-kbo-data.js [날짜]
 *
 * 예시:
 * node scripts/sync-kbo-data.js          # 오늘 날짜
 * node scripts/sync-kbo-data.js 20240613 # 특정 날짜
 */

const { spawn } = require("child_process");
const path = require("path");

// 환경변수 로드
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const API_BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const SYNC_API_KEY = process.env.SYNC_API_KEY || "ballgenius-sync-2024-secret";

// 명령행 인수에서 날짜 가져오기
const args = process.argv.slice(2);
const targetDate = args[0]; // YYYYMMDD 형식

async function syncKboData() {
  try {
    console.log("🚀 KBO 데이터 동기화 시작...");

    const body = targetDate ? { date: targetDate } : {};

    const response = await fetch(`${API_BASE_URL}/api/kbo/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SYNC_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log("✅ 동기화 성공!");
      console.log(`📅 날짜: ${result.date}`);
      console.log(`🆕 생성된 경기: ${result.gamesCreated}개`);
      console.log(`🔄 업데이트된 경기: ${result.gamesUpdated}개`);
      console.log(`📊 총 경기: ${result.totalGames}개`);

      if (result.gamesCreated === 0 && result.gamesUpdated === 0) {
        console.log("ℹ️ 업데이트할 경기가 없습니다.");
      }
    } else {
      console.error("❌ 동기화 실패:", result.error || "알 수 없는 오류");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ 동기화 중 오류 발생:", error.message);
    process.exit(1);
  }
}

// 개발 서버가 실행 중인지 확인
async function checkServerHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/kbo/sync`, {
      method: "GET",
    });

    if (response.ok) {
      console.log("✅ 서버가 실행 중입니다.");
      return true;
    } else {
      console.log("⚠️ 서버 응답 오류:", response.status);
      return false;
    }
  } catch (error) {
    console.log("⚠️ 서버에 연결할 수 없습니다:", error.message);
    return false;
  }
}

async function main() {
  console.log("🏃‍♂️ KBO 데이터 동기화 스크립트 실행");

  if (targetDate) {
    console.log(`📅 대상 날짜: ${targetDate}`);
  } else {
    const now = new Date();
    const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}`;
    console.log(`📅 대상 날짜: ${today} (오늘)`);
  }

  // 서버 상태 확인
  const isServerRunning = await checkServerHealth();

  if (!isServerRunning) {
    console.log("🚀 개발 서버를 시작합니다...");

    // 개발 서버 시작
    const serverProcess = spawn("npm", ["run", "dev"], {
      cwd: path.join(__dirname, ".."),
      stdio: "pipe",
      detached: false,
    });

    // 서버가 시작될 때까지 대기
    await new Promise((resolve, reject) => {
      let output = "";

      const timeout = setTimeout(() => {
        serverProcess.kill();
        reject(new Error("서버 시작 시간 초과"));
      }, 30000); // 30초 타임아웃

      serverProcess.stdout.on("data", (data) => {
        output += data.toString();
        console.log(data.toString().trim());

        if (output.includes("Ready in")) {
          clearTimeout(timeout);
          resolve();
        }
      });

      serverProcess.stderr.on("data", (data) => {
        console.error(data.toString().trim());
      });

      serverProcess.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    console.log("✅ 개발 서버가 시작되었습니다.");

    // 잠시 대기 후 동기화 실행
    setTimeout(async () => {
      await syncKboData();
      serverProcess.kill();
      process.exit(0);
    }, 2000);
  } else {
    // 서버가 이미 실행 중이면 바로 동기화
    await syncKboData();
  }
}

// 전역 fetch 폴리필 (Node.js 18 미만에서 필요)
if (typeof fetch === "undefined") {
  global.fetch = require("node-fetch");
}

main().catch((error) => {
  console.error("❌ 스크립트 실행 중 오류:", error);
  process.exit(1);
});
