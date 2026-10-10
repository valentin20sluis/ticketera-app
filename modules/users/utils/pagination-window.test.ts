import { describe, expect, it } from "vitest";
import { paginationWindow } from "./pagination-window";

describe("paginationWindow", () => {
  it("shows every page when there are few", () => {
    expect(paginationWindow(1, 1)).toEqual([1]);
    expect(paginationWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("adds a gap only where pages are skipped", () => {
    expect(paginationWindow(1, 20)).toEqual([1, 2, 3, null, 20]);
    expect(paginationWindow(10, 20)).toEqual([1, null, 8, 9, 10, 11, 12, null, 20]);
    expect(paginationWindow(20, 20)).toEqual([1, null, 18, 19, 20]);
  });

  it("keeps the current page's neighbours contiguous", () => {
    expect(paginationWindow(6, 12)).toEqual([1, null, 4, 5, 6, 7, 8, null, 12]);
    expect(paginationWindow(3, 7)).toEqual([1, 2, 3, 4, 5, null, 7]);
  });
});
