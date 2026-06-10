"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Wishlist } from "@/lib/types";

let globalWishlists: Wishlist[] | null = null;
let globalLoading = false;
let globalFetchPromise: Promise<Wishlist[]> | null = null;
const subscribers = new Set<(wishlists: Wishlist[]) => void>();

export function useSharedWishlists(token: string | null) {
  const [wishlists, setWishlists] = useState<Wishlist[]>(globalWishlists || []);

  useEffect(() => {
    subscribers.add(setWishlists);
    if (globalWishlists) {
      setWishlists(globalWishlists);
    }
    return () => {
      subscribers.delete(setWishlists);
    };
  }, []);

  const notify = (updated: Wishlist[]) => {
    globalWishlists = updated;
    subscribers.forEach((fn) => fn(updated));
  };

  const fetchWishlists = async (force = false) => {
    if (!token) return;
    if (globalWishlists && !force) return;
    if (globalLoading && globalFetchPromise) {
      try {
        await globalFetchPromise;
      } catch (e) {
        // ignore error, handled below
      }
      return;
    }

    globalLoading = true;
    globalFetchPromise = api.getWishlists(token);
    try {
      const data = await globalFetchPromise;
      notify(data || []);
    } catch (err) {
      console.error("Failed to fetch wishlists:", err);
    } finally {
      globalLoading = false;
      globalFetchPromise = null;
    }
  };

  useEffect(() => {
    if (token && !globalWishlists) {
      void fetchWishlists();
    }
  }, [token]);

  const addToList = async (wishlistId: string, listingId: string) => {
    if (!token) return;
    await api.addWishlistItem(token, wishlistId, listingId);
    const updated = await api.getWishlists(token);
    notify(updated || []);
  };

  const removeFromList = async (wishlistId: string, listingId: string) => {
    if (!token) return;
    await api.removeWishlistItem(token, wishlistId, listingId);
    const updated = await api.getWishlists(token);
    notify(updated || []);
  };

  const createList = async (name: string) => {
    if (!token) return null;
    const newList = await api.createWishlist(token, { name });
    const updated = await api.getWishlists(token);
    notify(updated || []);
    return newList;
  };

  return {
    wishlists,
    loading: globalLoading,
    fetchWishlists,
    addToList,
    removeFromList,
    createList,
  };
}
