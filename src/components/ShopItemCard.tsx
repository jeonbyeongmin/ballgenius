"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { ShopItem, ItemCategory } from "@/types/database";

interface ShopItemCardProps {
  item: ShopItem;
  onPurchase?: (itemId: string) => Promise<void>;
  isPurchasing?: boolean;
  userPoints?: number;
}

const ShopItemCard = ({
  item,
  onPurchase,
  isPurchasing = false,
  userPoints = 0,
}: ShopItemCardProps) => {
  const { data: session } = useSession();
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePurchase = async () => {
    if (!onPurchase) return;
    await onPurchase(item.id);
    setShowConfirm(false);
  };

  const getCategoryColor = (category: ItemCategory) => {
    switch (category) {
      case "AVATAR":
        return "bg-purple-100 text-purple-800";
      case "BADGE":
        return "bg-blue-100 text-blue-800";
      case "BOOST":
        return "bg-green-100 text-green-800";
      case "SPECIAL":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryText = (category: ItemCategory) => {
    switch (category) {
      case "AVATAR":
        return "아바타";
      case "BADGE":
        return "뱃지";
      case "BOOST":
        return "부스터";
      case "SPECIAL":
        return "특별";
      default:
        return "기타";
    }
  };

  const canAfford = userPoints >= item.price;
  const isAvailable = item.isActive;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* 아이템 이미지 영역 */}
      <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-4xl">{item.imageUrl || "🎁"}</div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(
              item.category
            )}`}
          >
            {getCategoryText(item.category)}
          </span>
        </div>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {item.description}
        </p>

        {/* 가격 */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-xl font-bold text-blue-600">
            {item.price.toLocaleString()}P
          </div>
        </div>

        {/* 구매 버튼 */}
        {session ? (
          <div className="space-y-2">
            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={!canAfford || !isAvailable || isPurchasing}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  canAfford && isAvailable
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {!isAvailable
                  ? "품절"
                  : !canAfford
                  ? "포인트 부족"
                  : "구매하기"}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-gray-600 text-center">
                  정말 구매하시겠습니까?
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2 px-4 rounded-lg bg-gray-300 text-gray-700 hover:bg-gray-400 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handlePurchase}
                    disabled={isPurchasing}
                    className="flex-1 py-2 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                  >
                    {isPurchasing ? "구매 중..." : "확인"}
                  </button>
                </div>
              </div>
            )}

            {!canAfford && (
              <div className="text-xs text-red-600 text-center">
                {(item.price - userPoints).toLocaleString()}P 부족
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-2">
            로그인이 필요합니다
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopItemCard;
