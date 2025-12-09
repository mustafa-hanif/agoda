import { useState, useEffect, useCallback } from 'react';

export type SortField = 'price' | 'rating' | 'name';
export type SortOrder = 'asc' | 'desc';

export interface HotelFilters {
  search: string;
  priceRange: [number, number];
  amenities: string[];
  minRating: number;
  dateRange: {
    checkIn: string | null;
    checkOut: string | null;
  };
  sort: {
    primary: {
      field: SortField;
      order: SortOrder;
    };
    secondary: {
      field: SortField | null;
      order: SortOrder;
    };
  };
}

const DEFAULT_FILTERS: HotelFilters = {
  search: '',
  priceRange: [0, 1000],
  amenities: [],
  minRating: 0,
  dateRange: {
    checkIn: null,
    checkOut: null,
  },
  sort: {
    primary: {
      field: 'price',
      order: 'asc',
    },
    secondary: {
      field: null,
      order: 'asc',
    },
  },
};

const STORAGE_KEY = 'hotel-filters';
const URL_PARAMS_KEY = 'filters';

/**
 * Custom hook for managing hotel filters with URL params and localStorage persistence
 */
export function useHotelFilters() {
  const [filters, setFilters] = useState<HotelFilters>(() => {
    // Try to load from URL params first, then localStorage, then defaults
    if (typeof window === 'undefined') return DEFAULT_FILTERS;

    // Load from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const urlFilters = urlParams.get(URL_PARAMS_KEY);
    if (urlFilters) {
      try {
        const parsed = JSON.parse(decodeURIComponent(urlFilters));
        return { ...DEFAULT_FILTERS, ...parsed };
      } catch {
        // Invalid URL params, continue to localStorage
      }
    }

    // Load from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_FILTERS, ...parsed };
      } catch {
        // Invalid localStorage, use defaults
      }
    }

    return DEFAULT_FILTERS;
  });

  // Update URL params when filters change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const filtersString = JSON.stringify(filters);
    urlParams.set(URL_PARAMS_KEY, encodeURIComponent(filtersString));
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}?${urlParams.toString()}`
    );

    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, filtersString);
  }, [filters]);

  const updateFilters = useCallback((updates: Partial<HotelFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const setSearch = useCallback((search: string) => {
    updateFilters({ search });
  }, [updateFilters]);

  const setPriceRange = useCallback((priceRange: [number, number]) => {
    updateFilters({ priceRange });
  }, [updateFilters]);

  const setAmenities = useCallback((amenities: string[]) => {
    updateFilters({ amenities });
  }, [updateFilters]);

  const toggleAmenity = useCallback((amenity: string) => {
    setFilters((prev) => {
      const amenities = prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity];
      return { ...prev, amenities };
    });
  }, []);

  const setMinRating = useCallback((minRating: number) => {
    updateFilters({ minRating });
  }, [updateFilters]);

  const setDateRange = useCallback((dateRange: { checkIn: string | null; checkOut: string | null }) => {
    updateFilters({ dateRange });
  }, [updateFilters]);

  const setSort = useCallback((sort: HotelFilters['sort']) => {
    updateFilters({ sort });
  }, [updateFilters]);

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const getActiveFilterCount = useCallback((): number => {
    let count = 0;
    if (filters.search) count++;
    if (filters.priceRange[0] !== DEFAULT_FILTERS.priceRange[0] || 
        filters.priceRange[1] !== DEFAULT_FILTERS.priceRange[1]) count++;
    if (filters.amenities.length > 0) count++;
    if (filters.minRating > 0) count++;
    if (filters.dateRange.checkIn || filters.dateRange.checkOut) count++;
    return count;
  }, [filters]);

  return {
    filters,
    updateFilters,
    setSearch,
    setPriceRange,
    setAmenities,
    toggleAmenity,
    setMinRating,
    setDateRange,
    setSort,
    clearAllFilters,
    getActiveFilterCount,
  };
}

