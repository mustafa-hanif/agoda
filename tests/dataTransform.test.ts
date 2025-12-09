import { expect, test } from "bun:test";
import { bookings, transformData } from "../src/dataTransform";
import { result1, result2 } from "./mockoutput";
test("transformData should return the correct result", () => {
  const result = transformData(bookings, {
    groupBy: ['category'],
    aggregations: { price: 'sum', passengers: 'count' },
    sortBy: { field: 'nights', order: 'desc' }
  });
  expect(result).toEqual(result1);
});

test("transformData should return the correct result 2", () => {
  const result = transformData(bookings, {
    groupBy: ['category', 'location.city'],
    aggregations: { price: 'sum', nights: 'avg' },
    sortBy: { field: 'price', order: 'desc' }
  });
  expect(result).toEqual(result2);
});