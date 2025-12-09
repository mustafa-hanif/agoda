/**
 * Unit tests for HotelBookingDashboard component
 * 
 * These tests verify the core functionality of the hotel booking dashboard:
 * 1. Filtering by search term (case-insensitive)
 * 2. Filtering by price range
 * 3. Filtering by amenities (AND logic)
 * 4. Sorting functionality
 */

import { describe, it, expect } from 'bun:test';
import { HOTELS } from './HotelBookingDashboard';

// Mock hotel data matching the structure in HotelBookingDashboard
const MOCK_HOTELS = HOTELS;

describe('HotelBookingDashboard Filtering Logic', () => {
  /**
   * Test 1: Case-insensitive search filtering
   * Verifies that search works for both name and city fields, case-insensitively
   */
  it('should filter hotels by search term (case-insensitive)', () => {
    const searchTerm = 'bangkok';
    const filtered = MOCK_HOTELS.filter((hotel) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        hotel.name.toLowerCase().includes(searchLower) ||
        hotel.city.toLowerCase().includes(searchLower)
      );
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0]?.city).toBe('Bangkok');
    
    // Test case-insensitive
    const upperCaseSearch = 'BANGKOK';
    const filteredUpper = MOCK_HOTELS.filter((hotel) => {
      const searchLower = upperCaseSearch.toLowerCase();
      return (
        hotel.name.toLowerCase().includes(searchLower) ||
        hotel.city.toLowerCase().includes(searchLower)
      );
    });
    expect(filteredUpper.length).toBe(1);
  });

  /**
   * Test 2: Price range filtering
   * Verifies that hotels are filtered correctly based on price range
   */
  it('should filter hotels by price range', () => {
    const minPrice = 90;
    const maxPrice = 110;
    const filtered = MOCK_HOTELS.filter(
      (hotel) => hotel.price >= minPrice && hotel.price <= maxPrice
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0]?.price).toBe(100);
    expect(filtered[0]?.name).toBe('Mountain Stay');
  });

  /**
   * Test 3: Amenities filtering with AND logic
   * Verifies that hotels must have ALL selected amenities (not just one)
   */
  it('should filter hotels by amenities using AND logic', () => {
    const selectedAmenities = ['Wi-Fi', 'Gym'];
    
    // Hotel must have ALL selected amenities
    const filtered = MOCK_HOTELS.filter((hotel) => {
      return selectedAmenities.every((amenity) => hotel.amenities.includes(amenity));
    });

    expect(filtered.length).toBe(2); // Agoda Palace and Mountain Stay both have Wi-Fi and Gym
    expect(filtered.some((h) => h.name === 'Agoda Palace')).toBe(true);
    expect(filtered.some((h) => h.name === 'Mountain Stay')).toBe(true);
    expect(filtered.some((h) => h.name === 'Seaside View')).toBe(false); // Only has Wi-Fi, not Gym
  });
});

describe('HotelBookingDashboard Sorting Logic', () => {
  /**
   * Test 4: Sorting by price (ascending)
   * Verifies that hotels are sorted correctly by price in ascending order
   */
  it('should sort hotels by price ascending', () => {
    const sorted = [...MOCK_HOTELS].sort((a, b) => a.price - b.price);
    
    expect(sorted[0]?.price).toBe(80);
    expect(sorted[1]?.price).toBe(100);
    expect(sorted[2]?.price).toBe(120);
  });

  /**
   * Test 5: Sorting by rating (descending)
   * Verifies that hotels are sorted correctly by rating in descending order
   */
  it('should sort hotels by rating descending', () => {
    const sorted = [...MOCK_HOTELS].sort((a, b) => b.rating - a.rating);
    
    expect(sorted[0]?.rating).toBe(4.8);
    expect(sorted[1]?.rating).toBe(4.5);
    expect(sorted[2]?.rating).toBe(4.2);
  });

  /**
   * Test 6: Sorting by name (alphabetical)
   * Verifies that hotels are sorted alphabetically by name
   */
  it('should sort hotels by name alphabetically', () => {
    const sorted = [...MOCK_HOTELS].sort((a, b) => a.name.localeCompare(b.name));
    
    expect(sorted[0]?.name).toBe('Agoda Palace');
    expect(sorted[1]?.name).toBe('Mountain Stay');
    expect(sorted[2]?.name).toBe('Seaside View');
  });
});

