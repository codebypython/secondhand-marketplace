"use client";

import React, { useState, useEffect, useRef } from "react";
import { Heart, Check } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSharedWishlists } from "@/lib/hooks/useSharedWishlists";
import { showToast } from "@/components/toast";
import styles from "./WishlistButton.module.css";

interface WishlistButtonProps {
  listingId: string;
  style?: React.CSSProperties;
  iconSize?: number;
  variant?: "circle" | "text";
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  listingId,
  style,
  iconSize = 18,
  variant = "circle",
}) => {
  const { token } = useAuth();
  const {
    wishlists,
    addToList,
    removeFromList,
    createList,
  } = useSharedWishlists(token);

  const [showPopover, setShowPopover] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Check if item is in any wishlist
  const isWishlisted = wishlists.some((wl) =>
    wl.items?.some((item) => item.listing_id === listingId)
  );

  useEffect(() => {
    if (!showPopover) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showPopover]);

  const handleHeartClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!token) {
      showToast("Vui lòng đăng nhập để sử dụng tính năng này", "danger");
      return;
    }

    if (!isWishlisted) {
      try {
        if (wishlists.length > 0) {
          const defaultList = wishlists[0];
          await addToList(defaultList.id, listingId);
          showToast(`Đã thêm vào danh sách "${defaultList.name}"!`, "success");
        } else {
          const newList = await createList("Yêu thích");
          if (newList) {
            await addToList(newList.id, listingId);
            showToast("Đã tạo và thêm vào danh sách Yêu thích!", "success");
          }
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Thao tác thất bại", "danger");
      }
    }

    setShowPopover(!showPopover);
  };

  const handleToggleWishlist = async (e: React.MouseEvent, wishlistId: string, hasItem: boolean) => {
    e.stopPropagation();
    e.preventDefault();

    if (loadingMap[wishlistId]) return;

    setLoadingMap((prev) => ({ ...prev, [wishlistId]: true }));
    try {
      if (hasItem) {
        await removeFromList(wishlistId, listingId);
        showToast("Đã xóa khỏi Wishlist", "default");
      } else {
        await addToList(wishlistId, listingId);
        showToast("Đã thêm vào Wishlist!", "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Thao tác thất bại", "danger");
    } finally {
      setLoadingMap((prev) => ({ ...prev, [wishlistId]: false }));
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!newListName.trim() || creating) return;

    setCreating(true);
    try {
      const newList = await createList(newListName.trim());
      if (newList) {
        await addToList(newList.id, listingId);
        showToast(`Đã tạo và thêm vào Wishlist "${newListName.trim()}"`, "success");
        setNewListName("");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Tạo thất bại", "danger");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.container} style={style} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={variant === "text" ? "button secondary sm" : `${styles.heartBtn} ${isWishlisted ? styles.active : ""}`}
        onClick={handleHeartClick}
        aria-label="Add to wishlist"
        style={{ display: "flex", alignItems: "center", gap: 6 }}
      >
        <Heart size={iconSize} fill={isWishlisted ? (variant === "text" ? "#ff4b4b" : "currentColor") : "none"} color={isWishlisted && variant === "text" ? "#ff4b4b" : undefined} />
        {variant === "text" && (isWishlisted ? "Đã thích" : "Yêu thích")}
      </button>

      {showPopover && (
        <div
          className={`${styles.popover} ${variant === "text" ? styles.popoverLeft : ""}`}
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
        >
          <h4 className={styles.title}>Lưu vào Yêu thích</h4>
          <div className={styles.list}>
            {wishlists.length === 0 ? (
              <p className={styles.emptyText}>Chưa có danh sách nào</p>
            ) : (
              wishlists.map((wl) => {
                const hasItem = wl.items?.some((item) => item.listing_id === listingId) ?? false;
                const isLoading = loadingMap[wl.id] ?? false;

                return (
                  <button
                    key={wl.id}
                    type="button"
                    className={`${styles.listItem} ${hasItem ? styles.listItemActive : ""}`}
                    onClick={(e) => handleToggleWishlist(e, wl.id, hasItem)}
                    disabled={isLoading}
                  >
                    <span className={`${styles.checkbox} ${hasItem ? styles.checkboxActive : ""}`}>
                      {hasItem && <Check size={10} strokeWidth={3} />}
                    </span>
                    <span style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {wl.name}
                    </span>
                    {isLoading && (
                      <span className="spinner" style={{ width: 10, height: 10, border: "2px solid var(--color-peach)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <form className={styles.createArea} onSubmit={handleCreateList}>
            <input
              type="text"
              className={styles.input}
              placeholder="Tạo danh sách mới..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              disabled={creating}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={!newListName.trim() || creating}
            >
              {creating ? "..." : "Tạo"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default WishlistButton;
