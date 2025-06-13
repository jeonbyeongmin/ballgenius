"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import ShopItemCard from "@/components/ShopItemCard";
import { ShopItem, ItemCategory } from "@/types/database";

interface UserInfo {
  points: number;
}

export default function ShopPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    ItemCategory | "ALL"
  >("ALL");

  const fetchShopItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/shop/items");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "상점 아이템을 불러오는데 실패했습니다");
      }

      setItems(data.items);
    } catch (err) {
      console.error("Error fetching shop items:", err);
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserInfo = useCallback(async () => {
    if (!session) return;

    try {
      const response = await fetch("/api/user/profile");
      const data = await response.json();

      if (response.ok) {
        setUserInfo({ points: data.user.points });
      }
    } catch (err) {
      console.error("Error fetching user info:", err);
    }
  }, [session]);

  useEffect(() => {
    fetchShopItems();
    fetchUserInfo();
  }, [fetchShopItems, fetchUserInfo]);

  const handlePurchase = async (itemId: string) => {
    if (!session) return;

    try {
      setPurchasing(itemId);

      const response = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "구매에 실패했습니다");
      }

      // 성공시 사용자 정보 다시 불러오기
      await fetchUserInfo();
    } catch (err) {
      console.error("Error purchasing item:", err);
      setError(
        err instanceof Error ? err.message : "구매 중 오류가 발생했습니다"
      );
    } finally {
      setPurchasing(null);
    }
  };

  const categories: Array<{ value: ItemCategory | "ALL"; label: string }> = [
    { value: "ALL", label: "전체" },
    { value: "AVATAR", label: "아바타" },
    { value: "BADGE", label: "뱃지" },
    { value: "BOOST", label: "부스터" },
    { value: "SPECIAL", label: "특별" },
  ];

  const filteredItems =
    selectedCategory === "ALL"
      ? items
      : items.filter((item) => item.category === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">로딩 중...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">상점</h1>
              <p className="text-gray-600">
                포인트로 다양한 아이템을 구매하세요
              </p>
            </div>
            {session && userInfo && (
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                <div className="text-sm text-gray-600">보유 포인트</div>
                <div className="text-xl font-bold text-blue-600">
                  {userInfo.points.toLocaleString()}P
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:text-blue-600 border"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* 로그인 안내 */}
        {!session && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
            로그인하면 아이템을 구매할 수 있습니다.
          </div>
        )}

        {/* 아이템 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-500 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <p className="text-lg text-gray-600">
                해당 카테고리에 아이템이 없습니다
              </p>
              <p className="text-sm text-gray-500 mt-2">
                곧 다양한 아이템들이 추가될 예정입니다
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <ShopItemCard
                key={item.id}
                item={item}
                onPurchase={handlePurchase}
                isPurchasing={purchasing === item.id}
                userPoints={userInfo?.points || 0}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
