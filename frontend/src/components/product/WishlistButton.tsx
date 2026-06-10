"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Heart, Check, X, Plus } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSharedWishlists } from "@/lib/hooks/useSharedWishlists";
import { Wishlist } from "@/lib/types";
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
  const [mounted, setMounted] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Safe client mounting check for Next.js SSR hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showPopover) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showPopover]);

  // Check if item is in any wishlist
  const isWishlisted = wishlists.some((wl) =>
    wl.items?.some((item) => item.listing_id === listingId)
  );

  const handleHeartClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!token) {
      showToast("Vui lòng đăng nhập để sử dụng tính năng này", "danger");
      return;
    }

    if (isWishlisted) {
      try {
        const listsWithItem = wishlists.filter((wl) =>
          wl.items?.some((item) => item.listing_id === listingId)
        );
        for (const wl of listsWithItem) {
          await removeFromList(wl.id, listingId);
        }
        showToast("Đã xóa khỏi danh sách yêu thích", "default");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Thao tác thất bại", "danger");
      }
    } else {
      try {
        let targetList: Wishlist | null = wishlists[0] || null;
        if (!targetList) {
          targetList = await createList("Yêu thích");
        }
        if (targetList) {
          await addToList(targetList.id, listingId);
          showToast(`Đã thêm vào danh sách "${targetList.name}"!`, "success");
          
          if (variant === "text") {
            setShowPopover(true);
          }
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Thao tác thất bại", "danger");
      }
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent, wishlistId: string, hasItem: boolean) => {
    e.stopPropagation();
    e.preventDefault();

    if (loadingMap[wishlistId]) return;

    setLoadingMap((prev) => ({ ...prev, [wishlistId]: true }));
    try {
      if (hasItem) {
        await removeFromList(wishlistId, listingId);
        showToast("Đã xóa khỏi danh sách", "default");
      } else {
        await addToList(wishlistId, listingId);
        showToast("Đã thêm vào danh sách!", "success");
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
        showToast(`Đã tạo và thêm vào "${newListName.trim()}"`, "success");
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
        <Heart 
          size={iconSize} 
          fill={isWishlisted ? (variant === "text" ? "#ff4b4b" : "currentColor") : "none"} 
          color={isWishlisted && variant === "text" ? "#ff4b4b" : undefined}
          className={styles.heartIcon}
        />
        {variant === "text" && (isWishlisted ? "Đã thích" : "Yêu thích")}
      </button>

      {showPopover && mounted && createPortal(
        <div className={styles.modalOverlay} onClick={() => setShowPopover(false)}>
          <div 
            className={styles.modalContent} 
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Visual indicator for mobile bottom sheet swipe */}
            <div className={styles.dragHandle} />

            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Lưu vào Yêu thích</h3>
              <button
                type="button"
                className={styles.btnClose}
                onClick={() => setShowPopover(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

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
                      <span className={styles.listName}>
                        {wl.name}
                      </span>
                      {isLoading && (
                        <span className={styles.spinner} />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <form className={styles.createArea} onSubmit={handleCreateList}>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Tạo danh sách mới..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  disabled={creating}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <button
                type="submit"
                className={styles.btnSubmit}
                disabled={!newListName.trim() || creating}
              >
                {creating ? <span className={styles.spinner} style={{ width: 12, height: 12 }} /> : <Plus size={16} />}
                <span>Tạo</span>
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WishlistButton;
