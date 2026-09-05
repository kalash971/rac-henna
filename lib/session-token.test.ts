import assert from "node:assert/strict";
import test from "node:test";
import { createToken, passwordMatches, verifyToken } from "./session-token.ts";

const SECRET = "a-long-random-string-for-tests";
const NOW = Date.UTC(2026, 8, 3, 12, 0, 0);

test("a fresh token verifies with the secret that signed it", () => {
  const { token, expiresAt } = createToken(SECRET, NOW);
  assert.equal(verifyToken(token, SECRET, NOW), true);
  assert.ok(expiresAt.getTime() > NOW, "the cookie expiry must be in the future");
});

test("a token stops working once it expires", () => {
  const { token, expiresAt } = createToken(SECRET, NOW);
  assert.equal(verifyToken(token, SECRET, expiresAt.getTime() - 1), true);
  assert.equal(verifyToken(token, SECRET, expiresAt.getTime()), false, "expiry is exclusive");
  assert.equal(verifyToken(token, SECRET, expiresAt.getTime() + 60_000), false);
});

test("another secret cannot sign a session", () => {
  const { token } = createToken("someone-elses-secret", NOW);
  assert.equal(verifyToken(token, SECRET, NOW), false);
  assert.equal(verifyToken(token, "", NOW), false, "an unset secret must never validate");
});

test("the expiry is inside the signature, so it cannot be extended", () => {
  const { token } = createToken(SECRET, NOW);
  const signature = token.slice(token.indexOf(".") + 1);
  const forged = `${NOW + 10 * 365 * 86_400_000}.${signature}`;
  assert.equal(verifyToken(forged, SECRET, NOW), false);
});

test("a tampered signature is rejected", () => {
  const { token } = createToken(SECRET, NOW);
  const [expiry, signature] = token.split(".");
  // Flip one character, keeping the length identical.
  const flipped = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
  assert.equal(verifyToken(`${expiry}.${flipped}`, SECRET, NOW), false);
  assert.equal(verifyToken(`${expiry}.${signature}x`, SECRET, NOW), false, "longer");
  assert.equal(verifyToken(`${expiry}.`, SECRET, NOW), false, "empty");
});

test("malformed cookies are rejected rather than throwing", () => {
  for (const value of [
    undefined,
    "",
    ".",
    "nodot",
    ".onlysig",
    "abc.def",
    "NaN.x",
    "1e999.x",
    "-1.x",
    `${NOW + 1000}`,
  ]) {
    assert.equal(verifyToken(value, SECRET, NOW), false, JSON.stringify(value));
  }
});

test("the password check accepts only the configured password", () => {
  assert.equal(passwordMatches("hunter2", "hunter2"), true);
  assert.equal(passwordMatches("hunter3", "hunter2"), false);
  assert.equal(passwordMatches("", "hunter2"), false);
  // A password shorter or longer than the real one must not throw — hashing
  // both sides first is what keeps the comparison constant-time.
  assert.equal(passwordMatches("h", "hunter2"), false);
  assert.equal(passwordMatches("hunter2-and-more", "hunter2"), false);
});

test("an unconfigured password locks the door instead of opening it", () => {
  assert.equal(passwordMatches("", undefined), false);
  assert.equal(passwordMatches("anything", undefined), false);
  assert.equal(passwordMatches("anything", ""), false);
});
