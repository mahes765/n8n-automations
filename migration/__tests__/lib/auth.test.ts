import {
    createLinkToken,
    hashPassword,
    verifyPassword,
} from "@/lib/auth";

describe("Auth Functions", () => {
  describe("Password hashing and verification", () => {
    it("should hash password correctly", async () => {
      const password = "password123";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe(password);
    });

    it("should verify correct password", async () => {
      const password = "password123";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "password123";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("wrongpassword", hash);
      expect(isValid).toBe(false);
    });

    it("should handle Laravel bcrypt format ($2y$)", async () => {
      // Laravel uses $2y$, bcryptjs expects $2a$ or $2b$
      const password = "testpass";
      const hash = await hashPassword(password);

      // Simulate Laravel hash format
      const laravelHash = hash.replace("$2a$", "$2y$");

      const isValid = await verifyPassword(password, laravelHash);
      expect(isValid).toBe(true);
    });

    it("should produce different hashes for same password", async () => {
      const password = "password123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Link token generation", () => {
    it("should generate a valid link token", () => {
      const token = createLinkToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBe(48); // 24 bytes * 2 for hex
      expect(/^[0-9a-f]+$/.test(token)).toBe(true); // Should be hex string
    });

    it("should generate unique tokens", () => {
      const token1 = createLinkToken();
      const token2 = createLinkToken();

      expect(token1).not.toBe(token2);
    });
  });
});
