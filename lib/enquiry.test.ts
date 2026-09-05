import assert from "node:assert/strict";
import test from "node:test";
import { LIMITS, buildEnquiry, localToday, waNumber } from "./enquiry.ts";

const valid = { name: "Aisha", phone: "9901349272", occasion: "Bridal Mehndi", date: "2026-12-01" };

test("a complete enquiry becomes a message", () => {
  const r = buildEnquiry({ ...valid, area: "Indiranagar", notes: "4 people" }, "2026-09-02");
  assert.equal(r.ok, true);
  assert.ok(r.ok && r.message.includes("Name: Aisha"));
  assert.ok(r.ok && r.message.includes("Occasion: Bridal Mehndi"));
  assert.ok(r.ok && r.message.includes("Area: Indiranagar"));
  assert.ok(r.ok && r.message.includes("Notes: 4 people"));
});

test("blank optional fields are left out entirely", () => {
  const r = buildEnquiry({ ...valid, area: "   ", notes: "" }, "2026-09-02");
  assert.ok(r.ok && !r.message.includes("Area:"));
  assert.ok(r.ok && !r.message.includes("Notes:"));
});

test("whitespace is not a name", () => {
  const r = buildEnquiry({ ...valid, name: "  a " }, "2026-09-02");
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.errors.name);
});

test("missing occasion and date are both reported", () => {
  const r = buildEnquiry({ ...valid, occasion: "", date: "" }, "2026-09-02");
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.errors.occasion && r.errors.date);
});

test("a past date is rejected, today is accepted", () => {
  assert.equal(buildEnquiry({ ...valid, date: "2026-09-01" }, "2026-09-02").ok, false);
  assert.equal(buildEnquiry({ ...valid, date: "2026-09-02" }, "2026-09-02").ok, true);
});

test("localToday uses the local calendar day, not UTC", () => {
  // 1 Jan 2026 00:30 local — a UTC-based conversion would slide to 31 Dec.
  assert.equal(localToday(new Date(2026, 0, 1, 0, 30)), "2026-01-01");
});

test("the phone number is required and sanity-checked", () => {
  assert.equal(buildEnquiry({ ...valid, phone: "" }, "2026-09-02").ok, false);
  assert.equal(buildEnquiry({ ...valid, phone: "12345" }, "2026-09-02").ok, false);
  assert.equal(buildEnquiry({ ...valid, phone: "1234567890123456" }, "2026-09-02").ok, false);
  // Real-world shapes people actually type.
  for (const phone of ["9901349272", "+91 99013 49272", "099013-49272", "+44 7700 900123"]) {
    assert.equal(buildEnquiry({ ...valid, phone }, "2026-09-02").ok, true, phone);
  }
});

test("the phone number reaches the message, so WhatsApp carries it too", () => {
  const r = buildEnquiry(valid, "2026-09-02");
  assert.ok(r.ok && r.message.includes("Phone: 9901349272"));
});

test("over-long fields are rejected rather than silently truncated", () => {
  assert.equal(buildEnquiry({ ...valid, name: "a".repeat(LIMITS.name + 1) }, "2026-09-02").ok, false);
  assert.equal(buildEnquiry({ ...valid, notes: "a".repeat(LIMITS.notes + 1) }, "2026-09-02").ok, false);
  assert.equal(buildEnquiry({ ...valid, area: "a".repeat(LIMITS.area + 1) }, "2026-09-02").ok, false);
});

test("a malformed date is rejected before it reaches Postgres", () => {
  for (const date of ["not-a-date", "2026-13-01x", "01/12/2026", "2026-1-1"]) {
    assert.equal(buildEnquiry({ ...valid, date }, "2026-09-02").ok, false, date);
  }
});

test("wa.me numbers get a country code only when one is missing", () => {
  assert.equal(waNumber("9901349272"), "919901349272", "bare 10-digit mobile");
  assert.equal(waNumber("099013 49272"), "919901349272", "leading trunk zero");
  assert.equal(waNumber("+91 99013 49272"), "919901349272", "already has +91");
  assert.equal(waNumber("+44 7700 900123"), "447700900123", "left alone");
});
