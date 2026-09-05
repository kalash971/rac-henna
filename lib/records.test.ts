import assert from "node:assert/strict";
import test from "node:test";
import { type Enquiry, type EnquiryStatus, sortEnquiries } from "./records.ts";

function make(id: string, status: EnquiryStatus, eventDate: string, createdAt = "2026-09-01T00:00:00.000Z") {
  return {
    id,
    name: id,
    phone: "9901349272",
    occasion: "Bridal Mehndi",
    eventDate,
    area: null,
    notes: null,
    status,
    adminNotes: null,
    createdAt,
  } satisfies Enquiry;
}

test("unanswered enquiries come first, whatever their date", () => {
  const sorted = sortEnquiries([
    make("booked-soon", "booked", "2026-09-10"),
    make("new-later", "new", "2027-01-01"),
    make("closed-soonest", "closed", "2026-09-05"),
    make("contacted-mid", "contacted", "2026-10-01"),
  ]);
  assert.deepEqual(
    sorted.map((e) => e.id),
    ["new-later", "contacted-mid", "booked-soon", "closed-soonest"]
  );
});

test("within a status, the soonest event is first", () => {
  const sorted = sortEnquiries([
    make("c", "new", "2026-12-01"),
    make("a", "new", "2026-09-15"),
    make("b", "new", "2026-10-01"),
  ]);
  assert.deepEqual(sorted.map((e) => e.id), ["a", "b", "c"]);
});

test("a tie on date breaks to the most recently received", () => {
  const sorted = sortEnquiries([
    make("older", "new", "2026-10-01", "2026-09-01T09:00:00.000Z"),
    make("newer", "new", "2026-10-01", "2026-09-02T09:00:00.000Z"),
  ]);
  assert.deepEqual(sorted.map((e) => e.id), ["newer", "older"]);
});

test("the input array is left alone", () => {
  const input = [make("b", "closed", "2026-09-05"), make("a", "new", "2026-12-01")];
  const before = input.map((e) => e.id);
  sortEnquiries(input);
  assert.deepEqual(input.map((e) => e.id), before, "sortEnquiries must not mutate");
});

test("an empty list is fine", () => {
  assert.deepEqual(sortEnquiries([]), []);
});
