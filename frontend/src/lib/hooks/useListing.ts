"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { api, ApiError } from "@/lib/api";
import type { Listing } from "@/lib/types";

export interface UseListingOptions {
  search?: string;
  enabled?: boolean;
  lat?: number;
  lng?: number;
  radius_km?: number;
}

export interface UseListingResult {
  listings: Listing[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useListing({ search = "", enabled = true, lat, lng, radius_km }: UseListingOptions = {}): UseListingResult {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const next = new URLSearchParams();
    if (search.trim()) {
      next.set("search", search.trim());
    }
    if (lat !== undefined && lat !== null) {
      next.set("lat", String(lat));
    }
    if (lng !== undefined && lng !== null) {
      next.set("lng", String(lng));
    }
    if (radius_km !== undefined && radius_km !== null) {
      next.set("radius_km", String(radius_km));
    }
    return next;
  }, [search, lat, lng, radius_km]);

  const loadListings = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const items = await api.listListings(params.toString() ? params : undefined);
      setListings(items);
    } catch (err) {
      const message = err instanceof ApiError || err instanceof Error ? err.message : "Không thể tải danh sách.";
      setError(message);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, params]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) {
        return;
      }
      void loadListings();
    }, search.trim() ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadListings, search]);

  const refetch = useCallback(async () => {
    await loadListings();
  }, [loadListings]);

  return { listings, loading, error, refetch };
}
