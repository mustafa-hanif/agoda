import { useMemo, useCallback, memo, useState, useEffect } from 'react';
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown, Download, Filter, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useDebounce } from '@/hooks/useDebounce';
import { useHotelFilters, type SortField } from '@/hooks/useHotelFilters';
import { cn } from '@/lib/utils';

// Fix typo: amenties -> amenities
type Hotel = {
  id: number;
  name: string;
  city: string;
  price: number;
  rating: number;
  amenities: string[];
  availability: {
    checkIn: string; // ISO 8601 date string
    checkOut: string; // ISO 8601 date string
  };
};

export const HOTELS: Hotel[] = [
  {
    id: 1,
    name: 'Agoda Palace',
    city: 'Bangkok',
    price: 120,
    rating: 4.5,
    amenities: ['Wi-Fi', 'Pool', 'Gym'],
    availability: {
      checkIn: '2025-01-15',
      checkOut: '2025-01-20',
    },
  },
  {
    id: 2,
    name: 'Seaside View',
    city: 'Phuket',
    price: 80,
    rating: 4.2,
    amenities: ['Wi-Fi', 'Beach'],
    availability: {
      checkIn: '2025-01-10',
      checkOut: '2025-01-25',
    },
  },
  {
    id: 3,
    name: 'Mountain Stay',
    city: 'Chiang Mai',
    price: 100,
    rating: 4.8,
    amenities: ['Wi-Fi', 'Gym', 'Spa'],
    availability: {
      checkIn: '2025-01-05',
      checkOut: '2025-01-30',
    },
  },
  {
    id: 4,
    name: 'Urban Loft',
    city: 'Bangkok',
    price: 150,
    rating: 4.6,
    amenities: ['Wi-Fi', 'Pool'],
    availability: {
      checkIn: '2025-01-12',
      checkOut: '2025-01-18',
    },
  },
  {
    id: 5,
    name: 'Tropical Resort',
    city: 'Phuket',
    price: 200,
    rating: 4.9,
    amenities: ['Wi-Fi', 'Pool', 'Beach', 'Spa'],
    availability: {
      checkIn: '2025-01-08',
      checkOut: '2025-01-22',
    },
  },
];

// Get all unique amenities from hotels
const ALL_AMENITIES = Array.from(new Set(HOTELS.flatMap((h) => h.amenities))).sort();

// Get min and max prices
const MIN_PRICE = Math.min(...HOTELS.map((h) => h.price));
const MAX_PRICE = Math.max(...HOTELS.map((h) => h.price));

const ITEMS_PER_PAGE = 10;

// Memoized HotelRow component for performance
const HotelRow = memo(({ hotel }: { hotel: Hotel }) => {
  return (
    <TableRow className="transition-all duration-200 hover:bg-muted/50">
      <TableCell className="font-medium">{hotel.name}</TableCell>
      <TableCell>{hotel.city}</TableCell>
      <TableCell>${hotel.price}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Star className="size-4 fill-yellow-400 text-yellow-400" />
          <span>{hotel.rating.toFixed(1)}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {hotel.amenities.map((amenity) => (
            <Badge key={amenity} variant="secondary" className="text-xs">
              {amenity}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {hotel.availability.checkIn} - {hotel.availability.checkOut}
      </TableCell>
    </TableRow>
  );
});

HotelRow.displayName = 'HotelRow';

// Sort icon component
const SortIcon = memo(({ order }: { order: 'asc' | 'desc' | null }) => {
  if (order === 'asc') return <ArrowUp className="size-4" />;
  if (order === 'desc') return <ArrowDown className="size-4" />;
  return <ArrowUpDown className="size-4 opacity-50" />;
});

SortIcon.displayName = 'SortIcon';

// CSV Export function
const exportToCSV = (hotels: Hotel[]): void => {
  const headers = ['Name', 'City', 'Price', 'Rating', 'Amenities', 'Check-In', 'Check-Out'];
  const rows = hotels.map((hotel) => [
    hotel.name,
    hotel.city,
    hotel.price.toString(),
    hotel.rating.toString(),
    hotel.amenities.join('; '),
    hotel.availability.checkIn,
    hotel.availability.checkOut,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `hotels_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function HotelBookingDashboard() {
  const {
    filters,
    setSearch,
    setPriceRange,
    toggleAmenity,
    setMinRating,
    setDateRange,
    setSort,
    clearAllFilters,
    getActiveFilterCount,
  } = useHotelFilters();

  const [currentPage, setCurrentPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search input
  const debouncedSearch = useDebounce(filters.search, 300);

  // Show loading state during debounce
  useEffect(() => {
    setIsSearching(filters.search !== debouncedSearch);
  }, [filters.search, debouncedSearch]);

  // Validate date range
  const validateDateRange = useCallback(
    (checkIn: string | null, checkOut: string | null): boolean => {
      if (!checkIn || !checkOut) return true; // Allow partial dates
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      return checkOutDate > checkInDate;
    },
    []
  );

  // Filter hotels
  const filteredHotels = useMemo(() => {
    let result = HOTELS.filter((hotel) => {
      // Search filter (case-insensitive)
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch =
          hotel.name.toLowerCase().includes(searchLower) ||
          hotel.city.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Price range filter
      if (hotel.price < filters.priceRange[0] || hotel.price > filters.priceRange[1]) {
        return false;
      }

      // Amenities filter (AND logic - hotel must have all selected amenities)
      if (filters.amenities.length > 0) {
        const hasAllAmenities = filters.amenities.every((amenity) =>
          hotel.amenities.includes(amenity)
        );
        if (!hasAllAmenities) return false;
      }

      // Minimum rating filter
      if (hotel.rating < filters.minRating) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.checkIn || filters.dateRange.checkOut) {
        const hotelCheckIn = new Date(hotel.availability.checkIn);
        const hotelCheckOut = new Date(hotel.availability.checkOut);
        
        // Normalize hotel dates to start of day for accurate comparison
        hotelCheckIn.setHours(0, 0, 0, 0);
        hotelCheckOut.setHours(0, 0, 0, 0);

        // If both dates are provided, check for overlap
        if (filters.dateRange.checkIn && filters.dateRange.checkOut) {
          if (!validateDateRange(filters.dateRange.checkIn, filters.dateRange.checkOut)) {
            return false; // Invalid date range
          }
          const checkInDate = new Date(filters.dateRange.checkIn);
          const checkOutDate = new Date(filters.dateRange.checkOut);
          
          // Normalize requested dates to start of day
          checkInDate.setHours(0, 0, 0, 0);
          checkOutDate.setHours(0, 0, 0, 0);

          // Check if requested date range overlaps with hotel availability
          // Overlap exists if: requested check-in < hotel check-out AND requested check-out > hotel check-in
          const hasOverlap = checkInDate < hotelCheckOut && checkOutDate > hotelCheckIn;
          if (!hasOverlap) return false;
        } 
        // If only check-in is provided, check if hotel is available on or after that date
        else if (filters.dateRange.checkIn) {
          const checkInDate = new Date(filters.dateRange.checkIn);
          checkInDate.setHours(0, 0, 0, 0);
          // Hotel must be available on or before the requested check-in date
          if (checkInDate < hotelCheckIn || checkInDate >= hotelCheckOut) {
            return false;
          }
        }
        // If only check-out is provided, check if hotel is available on or before that date
        else if (filters.dateRange.checkOut) {
          const checkOutDate = new Date(filters.dateRange.checkOut);
          checkOutDate.setHours(0, 0, 0, 0);
          // Hotel must be available on or after the requested check-out date
          if (checkOutDate <= hotelCheckIn || checkOutDate > hotelCheckOut) {
            return false;
          }
        }
      }

      return true;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      // Primary sort
      let comparison = 0;
      const primaryField = filters.sort.primary.field;
      if (primaryField === 'price') {
        comparison = a.price - b.price;
      } else if (primaryField === 'rating') {
        comparison = a.rating - b.rating;
      } else if (primaryField === 'name') {
        comparison = a.name.localeCompare(b.name);
      }

      if (filters.sort.primary.order === 'desc') {
        comparison = -comparison;
      }

      // Secondary sort if primary values are equal
      if (comparison === 0 && filters.sort.secondary.field) {
        const secondaryField = filters.sort.secondary.field;
        let secondaryComparison = 0;
        if (secondaryField === 'price') {
          secondaryComparison = a.price - b.price;
        } else if (secondaryField === 'rating') {
          secondaryComparison = a.rating - b.rating;
        } else if (secondaryField === 'name') {
          secondaryComparison = a.name.localeCompare(b.name);
        }

        if (filters.sort.secondary.order === 'desc') {
          secondaryComparison = -secondaryComparison;
        }
        comparison = secondaryComparison;
      }

      return comparison;
    });

    return result;
  }, [
    debouncedSearch,
    filters.priceRange,
    filters.amenities,
    filters.minRating,
    filters.dateRange,
    filters.sort,
    validateDateRange,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredHotels.length / ITEMS_PER_PAGE);
  const paginatedHotels = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHotels.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredHotels, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredHotels.length]);

  // Event handlers with useCallback
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [setSearch]
  );

  const handlePriceRangeChange = useCallback(
    (values: number[]) => {
      setPriceRange([values[0] ?? MIN_PRICE, values[1] ?? MAX_PRICE]);
    },
    [setPriceRange]
  );

  const handleRatingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value) && value >= 0 && value <= 5) {
        setMinRating(value);
      }
    },
    [setMinRating]
  );

  const handleDateChange = useCallback(
    (type: 'checkIn' | 'checkOut', value: string) => {
      const newDateRange = { ...filters.dateRange };
      if (type === 'checkIn') {
        newDateRange.checkIn = value || null;
      } else {
        newDateRange.checkOut = value || null;
      }

      // Validate before setting
      if (
        newDateRange.checkIn &&
        newDateRange.checkOut &&
        !validateDateRange(newDateRange.checkIn, newDateRange.checkOut)
      ) {
        // Invalid range, don't update
        return;
      }

      setDateRange(newDateRange);
    },
    [filters.dateRange, setDateRange, validateDateRange]
  );

  const handleSortChange = useCallback(
    (type: 'primary' | 'secondary', field: SortField | null, order?: 'asc' | 'desc') => {
      if (type === 'primary' && field) {
        setSort({
          ...filters.sort,
          primary: {
            field,
            order: order ?? filters.sort.primary.order,
          },
        });
      } else if (type === 'secondary') {
        setSort({
          ...filters.sort,
          secondary: {
            field,
            order: order ?? filters.sort.secondary.order,
          },
        });
      }
    },
    [filters.sort, setSort]
  );

  const handleExportCSV = useCallback(() => {
    exportToCSV(filteredHotels);
  }, [filteredHotels]);

  const activeFilterCount = getActiveFilterCount();
  const hasInvalidDateRange =
    filters.dateRange.checkIn &&
    filters.dateRange.checkOut &&
    !validateDateRange(filters.dateRange.checkIn, filters.dateRange.checkOut);

  return (
    <div className="container mx-auto p-4 space-y-6" role="main" aria-label="Hotel Booking Dashboard">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold" id="dashboard-title">
            Hotel Booking Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Find your perfect hotel stay with advanced filtering and sorting
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-sm" aria-label={`${activeFilterCount} active filters`}>
              <Filter className="size-3 mr-1" />
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
            </Badge>
          )}
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            aria-label="Export filtered results to CSV"
          >
            <Download className="size-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Filters and Sorting */}
        <div className="lg:col-span-1 space-y-6">
          {/* Filters Section */}
          <Card className="transition-all duration-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Button
                onClick={clearAllFilters}
                variant="ghost"
                size="sm"
                aria-label="Clear all filters"
              >
                <X className="size-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
          <CardDescription>Refine your search with multiple criteria</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="search-input">Search by Name or City</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="search-input"
                type="text"
                placeholder="Search hotels..."
                value={filters.search}
                onChange={handleSearchChange}
                className="pl-9"
                aria-label="Search hotels by name or city"
                aria-describedby="search-description"
              />
              {isSearching && (
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  role="status"
                  aria-live="polite"
                  aria-label="Searching"
                >
                  <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
            <p id="search-description" className="text-xs text-muted-foreground">
              Case-insensitive search with 300ms debounce
            </p>
          </div>

          <Separator />

          {/* Price Range */}
          <div className="space-y-2">
            <Label htmlFor="price-range">
              Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]}
            </Label>
            <Slider
              id="price-range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              value={filters.priceRange}
              onValueChange={handlePriceRangeChange}
              step={10}
              className="w-full"
              aria-label="Price range slider"
            />
          </div>

          <Separator />

          {/* Amenities Filter */}
          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="grid grid-cols-1 gap-3">
              {ALL_AMENITIES.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity}`}
                    checked={filters.amenities.includes(amenity)}
                    onCheckedChange={() => toggleAmenity(amenity)}
                    aria-label={`Filter by ${amenity} amenity`}
                  />
                  <Label
                    htmlFor={`amenity-${amenity}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {amenity}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Rating Filter */}
          <div className="space-y-2">
            <Label htmlFor="min-rating">
              Minimum Rating: {filters.minRating.toFixed(1)}
            </Label>
            <div className="flex items-center gap-4">
              <Slider
                id="min-rating"
                min={0}
                max={5}
                value={[filters.minRating]}
                onValueChange={(values) => setMinRating(values[0] ?? 0)}
                step={0.1}
                className="flex-1"
                aria-label="Minimum rating slider"
              />
              <div className="flex items-center gap-1 min-w-[60px]">
                <Star className="size-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{filters.minRating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label>Availability Date Range</Label>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="check-in-date">Check-In Date</Label>
                <Input
                  id="check-in-date"
                  type="date"
                  value={filters.dateRange.checkIn || ''}
                  onChange={(e) => handleDateChange('checkIn', e.target.value)}
                  aria-label="Check-in date"
                  aria-invalid={hasInvalidDateRange ? true : undefined}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check-out-date">Check-Out Date</Label>
                <Input
                  id="check-out-date"
                  type="date"
                  value={filters.dateRange.checkOut || ''}
                  onChange={(e) => handleDateChange('checkOut', e.target.value)}
                  aria-label="Check-out date"
                  aria-invalid={hasInvalidDateRange ? true : undefined}
                  className="w-full"
                />
              </div>
            </div>
            {hasInvalidDateRange && (
              <p className="text-sm text-destructive" role="alert" aria-live="polite">
                Check-out date must be after check-in date
              </p>
            )}
          </div>
        </CardContent>
          </Card>

          {/* Sorting Section */}
          <Card>
            <CardHeader>
              <CardTitle>Sorting</CardTitle>
              <CardDescription>Configure primary and secondary sort options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-sort-field">Primary Sort</Label>
                  <div className="flex gap-2">
                    <Select
                      value={filters.sort.primary.field}
                      onValueChange={(value) =>
                        handleSortChange('primary', value as SortField)
                      }
                    >
                      <SelectTrigger id="primary-sort-field" aria-label="Primary sort field" className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleSortChange(
                          'primary',
                          filters.sort.primary.field,
                          filters.sort.primary.order === 'asc' ? 'desc' : 'asc'
                        )
                      }
                      aria-label={`Sort ${filters.sort.primary.order === 'asc' ? 'descending' : 'ascending'}`}
                    >
                      <SortIcon order={filters.sort.primary.order} />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary-sort-field">Secondary Sort (Optional)</Label>
                  <div className="flex gap-2">
                    <Select
                      value={filters.sort.secondary.field || 'none'}
                      onValueChange={(value) =>
                        handleSortChange('secondary', value === 'none' ? null : (value as SortField))
                      }
                    >
                      <SelectTrigger id="secondary-sort-field" aria-label="Secondary sort field" className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                      </SelectContent>
                    </Select>
                    {filters.sort.secondary.field && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          handleSortChange(
                            'secondary',
                            filters.sort.secondary.field,
                            filters.sort.secondary.order === 'asc' ? 'desc' : 'asc'
                          )
                        }
                        aria-label={`Secondary sort ${filters.sort.secondary.order === 'asc' ? 'descending' : 'ascending'}`}
                      >
                        <SortIcon order={filters.sort.secondary.order} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-2">
          <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                Showing {paginatedHotels.length} of {filteredHotels.length} hotels
                {filteredHotels.length !== HOTELS.length && ' (filtered)'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredHotels.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              role="status"
              aria-live="polite"
            >
              <p className="text-lg font-medium mb-2">No hotels found</p>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters to see more results
              </p>
              <Button onClick={clearAllFilters} variant="outline">
                Clear All Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button
                          className="flex items-center gap-2 hover:text-foreground transition-colors"
                          onClick={() =>
                            handleSortChange(
                              'primary',
                              'name',
                              filters.sort.primary.field === 'name' &&
                                filters.sort.primary.order === 'asc'
                                ? 'desc'
                                : 'asc'
                            )
                          }
                          aria-label="Sort by name"
                        >
                          Name
                          {filters.sort.primary.field === 'name' && (
                            <SortIcon order={filters.sort.primary.order} />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="flex items-center gap-2 hover:text-foreground transition-colors"
                          onClick={() =>
                            handleSortChange(
                              'primary',
                              'price',
                              filters.sort.primary.field === 'price' &&
                                filters.sort.primary.order === 'asc'
                                ? 'desc'
                                : 'asc'
                            )
                          }
                          aria-label="Sort by price"
                        >
                          City
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="flex items-center gap-2 hover:text-foreground transition-colors"
                          onClick={() =>
                            handleSortChange(
                              'primary',
                              'price',
                              filters.sort.primary.field === 'price' &&
                                filters.sort.primary.order === 'asc'
                                ? 'desc'
                                : 'asc'
                            )
                          }
                          aria-label="Sort by price"
                        >
                          Price
                          {filters.sort.primary.field === 'price' && (
                            <SortIcon order={filters.sort.primary.order} />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="flex items-center gap-2 hover:text-foreground transition-colors"
                          onClick={() =>
                            handleSortChange(
                              'primary',
                              'rating',
                              filters.sort.primary.field === 'rating' &&
                                filters.sort.primary.order === 'asc'
                                ? 'desc'
                                : 'asc'
                            )
                          }
                          aria-label="Sort by rating"
                        >
                          Rating
                          {filters.sort.primary.field === 'rating' && (
                            <SortIcon order={filters.sort.primary.order} />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>Amenities</TableHead>
                      <TableHead>Availability</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHotels.map((hotel) => (
                      <HotelRow key={hotel.id} hotel={hotel} />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  className="flex items-center justify-center gap-2 mt-4"
                  role="navigation"
                  aria-label="Pagination"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground" aria-current="page">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
