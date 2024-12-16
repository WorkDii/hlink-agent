import { assertEquals } from "jsr:@std/assert";
import { getStartEndDate } from "./resync.ts";

Deno.test("getStartEndDate should return correct start and end dates", () => {
  // Test case 1: Regular month
  const result1 = getStartEndDate({ year: 2024, month: 3 });
  assertEquals(result1.startDateOfThisMonth, "2024-03-01");
  assertEquals(result1.startDateOfNextMonth, "2024-04-01");

  // Test case 2: Single digit month
  const result2 = getStartEndDate({ year: 2024, month: 1 });
  assertEquals(result2.startDateOfThisMonth, "2024-01-01");
  assertEquals(result2.startDateOfNextMonth, "2024-02-01");

  // Test case 3: December (month 12)
  const result3 = getStartEndDate({ year: 2024, month: 12 });
  assertEquals(result3.startDateOfThisMonth, "2024-12-01");
  assertEquals(result3.startDateOfNextMonth, "2025-01-01");
});
