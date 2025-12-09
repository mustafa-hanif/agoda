import lGroupBy from 'lodash/groupBy';
import get from 'lodash/get';

/**
 * Valid fields that can be used for sorting booking data
 */
type sortFields = 'price' | 'nights' | 'passengers';

/**
 * Represents a booking record with optional fields for nights and passengers
 */
interface Booking {
  id: number;
  category: string;
  location: { city: string; country: string };
  price: number;
  nights?: number;
  passengers?: number;
}

/**
 * Aggregated values for numeric fields (price, nights, passengers)
 * All fields are optional as they may not be present in all aggregations
 */
interface Aggregates {
  price?: number;
  nights?: number;
  passengers?: number;
}

/**
 * Result structure for grouped and aggregated booking data
 * Contains the group key, aggregated values, sorted items, and count
 */
type Result = Record<string, any>;

/**
 * Calculates an aggregated value for a specific field across a collection of bookings
 * 
 * @param items - Array of booking items to aggregate
 * @param field - Field name to aggregate (supports nested paths via lodash get)
 * @param aggregation - Type of aggregation to perform: sum, avg, min, max, or count
 * @returns The aggregated numeric value
 * 
 * @example
 * getAggregatedValue(bookings, 'price', 'sum') // Returns sum of all prices
 * getAggregatedValue(bookings, 'nights', 'avg') // Returns average nights
 */
function getAggregatedValue(items: Booking[], field: string, aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count'): number {
  // Extract values from items using lodash get (supports nested paths)
  // Filter out zero values to exclude missing/undefined fields
  const values = items.map(item => get(item, field) ?? 0).filter(value => value !== 0);

  // Perform the requested aggregation operation
  switch (aggregation) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'count':
      return values.length;
    default:
      return 0;
  }
}
/**
 * Transforms booking data by grouping, aggregating, and sorting
 * 
 * Groups bookings by specified field(s), calculates aggregations for numeric fields,
 * and sorts items within each group according to the sort configuration.
 * 
 * @param arr - Array of booking records to transform
 * @param options - Configuration object containing:
 *   - groupBy: Field name(s) to group by (string or array of strings)
 *   - aggregations: Object mapping field names to aggregation types
 *   - sortBy: Sort configuration with field and order (asc/desc)
 * @returns Array of Result objects, each containing grouped data with aggregates
 * 
 * @example
 * transformData(bookings, {
 *   groupBy: 'category',
 *   aggregations: { price: 'sum', nights: 'avg' },
 *   sortBy: { field: 'price', order: 'desc' }
 * })
 */
export function transformData(arr: Booking[], options: {
  groupBy: string | string[];
  aggregations: Record<string, 'sum' | 'avg' | 'min' | 'max' | 'count'>;
  sortBy: { field: sortFields; order: 'asc' | 'desc' };
}): Result[] {
  const { groupBy, aggregations, sortBy } = options;
  let allGroupBy: string[] = [];
  let results: Result[] = [];

  // Normalize groupBy to always be an array for consistent processing
  if (typeof groupBy === 'string') {
    allGroupBy = [groupBy];
  } else {
    allGroupBy = groupBy;
  }

  // Process each grouping field
  for (const group of allGroupBy) {
    // Group bookings by the specified field using lodash groupBy
    // Supports nested field paths via lodash get
    const groupedData = lGroupBy(arr, (obj: Booking) => {
      return get(obj, group);
    });

    // Process each group
    for (const [key, items] of Object.entries(groupedData)) {
      // Calculate aggregations for each requested field
      // Only calculate if the aggregation type is specified in options
      let price = aggregations.price ? getAggregatedValue(items, 'price', aggregations.price) : 0;
      let nights = aggregations.nights ? getAggregatedValue(items, 'nights', aggregations.nights) : 0;
      let passengers = aggregations.passengers ? getAggregatedValue(items, 'passengers', aggregations.passengers) : 0;

      // Build aggregates object, only including non-zero values
      const _aggregations: Aggregates = {};
      if (price) {
        _aggregations.price = price;
      }
      if (nights) {
        _aggregations.nights = nights;
      }
      if (passengers) {
        _aggregations.passengers = passengers;
      }

      // Create result object with group key, aggregates, sorted items, and count
      const result: Result = {
        [group]: key, // Dynamic key based on group field name
        aggregates: _aggregations,
        // Sort items within the group by the specified field and order
        items: items.sort((a, b) => {
          return sortBy.order === 'asc'
            ? get(a, sortBy.field, 0) - get(b, sortBy.field, 0)
            : get(b, sortBy.field, 0) - get(a, sortBy.field, 0);
        }),
        count: items.length,
      };
      results.push(result);
    }
  }
  return results;
}


export const bookings = [
  {
    id: 1,
    category: 'Hotel',
    location: { city: 'Bangkok', country: 'TH' },
    price: 120, nights: 2
  },
  {
    id: 2, category: 'Flight',
    location: { city: 'Tokyo', country: 'JP' },
    price: 450, passengers: 1
  },
  {
    id: 3,
    category: 'Hotel',
    location: { city: 'Bangkok', country: 'TH' },
    price: 80,
    nights: 3
  },
  {
    id: 4,
    category: 'Hotel',
    location: { city: 'Dubai', country: 'AE' },
    price: 200,
    nights: 1
  },
  {
    id: 5,
    category: 'Flight',
    location: { city: 'Bangkok', country: 'TH' },
    price: 300,
    passengers: 2
  },
]

let answer = transformData(bookings,
  {
    groupBy: ['category', 'location.city'],
    aggregations: { price: 'sum', nights: 'avg' },
    sortBy: { field: 'price', order: 'desc' }
  }
);

console.log(JSON.stringify(answer, null, 2));