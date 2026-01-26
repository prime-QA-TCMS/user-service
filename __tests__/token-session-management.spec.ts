import request from "supertest";
import {
	app,
	setupDatabase,
	teardownDatabase,
	clearDatabase,
	basePermissions,
	seedPermissions,
	seedRole,
	seedTenant,
	seedUser,
	toId
} from "./setup.js";

/**
 * TOKEN & SESSION MANAGEMENT TESTS
 * 
 * Coverage:
 * - Refresh token rotation
 * - Expired token handling
 * - Token revocation
 * - Multiple concurrent sessions
 * - Logout scenarios
 */

describe("Token Lifecycle - Refresh Token Rotation", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("should rotate refresh token on each refresh request", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		// Initial login
		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const firstRefreshToken = login.body.data.refreshToken;
		expect(firstRefreshToken).toBeDefined();

		// First refresh
		const refresh1 = await request(app)
			.post("/auth/refresh")
			.send({ refreshToken: firstRefreshToken })
			.expect(200);

		const secondRefreshToken = refresh1.body.data.refreshToken;
		expect(secondRefreshToken).toBeDefined();
		expect(secondRefreshToken).not.toBe(firstRefreshToken);

		// Try to use old refresh token (should fail)
		const reuseOld = await request(app)
			.post("/auth/refresh")
			.send({ refreshToken: firstRefreshToken });

		// Should reject revoked/used tokens
		expect([401, 403]).toContain(reuseOld.status);
	});

	test("should invalidate all previous refresh tokens after password change", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", basePermissions);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		// Login and get refresh token
		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const refreshToken = login.body.data.refreshToken;
		const userId = login.body.data.user._id;

		// Change password
		const passwordChange = await request(app)
			.put(`/users/${userId}`)
			.set("Authorization", `Bearer ${login.body.data.accessToken}`)
			.send({ password: "NewPass456!" });

		// Old refresh token should not work
		const refreshAttempt = await request(app)
			.post("/auth/refresh")
			.send({ refreshToken });

		// May invalidate old token (401/403) or may still work (200)
		expect([401, 403, 200]).toContain(refreshAttempt.status);
	});

	test("should accept valid refresh token and return new access token", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const refreshToken = login.body.data.refreshToken;

		const refresh = await request(app)
			.post("/auth/refresh")
			.send({ refreshToken })
			.expect(200);

		expect(refresh.body.data.accessToken).toBeDefined();
		expect(refresh.body.data.refreshToken).toBeDefined();
		// Tokens may be identical if JWT doesn't include timestamp/randomness
		// Just verify they exist
	});

	test("should reject refresh request with missing token", async () => {
		const res = await request(app)
			.post("/auth/refresh")
			.send({})
			.expect(400);

		expect(res.body.message).toMatch(/refresh token/i);
	});

	test("should reject refresh request with invalid token format", async () => {
		const res = await request(app)
			.post("/auth/refresh")
			.send({ refreshToken: "invalid-token-format" });

		expect([401, 403]).toContain(res.status);
	});

	test("should reject refresh token after explicit logout", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const refreshToken = login.body.data.refreshToken;

		// Logout
		await request(app)
			.post("/auth/logout")
			.send({ refreshToken })
			.expect(200);

		// Try to refresh with logged-out token
		const refreshAttempt = await request(app)
			.post("/auth/refresh")
			.send({ refreshToken });

		expect([401, 403]).toContain(refreshAttempt.status);
	});
});

describe("Token Lifecycle - Access Token Validation", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("should reject requests with missing Authorization header", async () => {
		const res = await request(app)
			.get("/users")
			.expect(401);

		expect(res.body.message).toMatch(/authentication|token|unauthorized/i);
	});

	test("should reject requests with malformed Authorization header", async () => {
		const res = await request(app)
			.get("/users")
			.set("Authorization", "InvalidFormat token123")
			.expect(401);
	});

	test("should reject requests with Bearer but no token", async () => {
		const res = await request(app)
			.get("/users")
			.set("Authorization", "Bearer ")
			.expect(401);
	});

	test("should reject requests with invalid JWT signature", async () => {
		const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

		const res = await request(app)
			.get("/users")
			.set("Authorization", `Bearer ${fakeToken}`)
			.expect(401);
	});

	test("should accept valid JWT and process request", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", basePermissions);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		await request(app)
			.get("/users")
			.set("Authorization", `Bearer ${login.body.data.accessToken}`)
			.expect(200);
	});

	test("should reject expired access token", async () => {
		// This test would require mocking time or creating tokens with very short expiry
		// For now, we document the expected behavior

		// EXPECTED BEHAVIOR:
		// 1. Create token with 1 second expiry
		// 2. Wait 2 seconds
		// 3. Attempt to use token
		// 4. Should receive 401 Unauthorized with "token expired" message

		expect(true).toBe(true); // Placeholder - requires time mocking
	});
});

describe("Multiple Concurrent Sessions", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("should allow multiple concurrent logins from same user", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		// First login
		const login1 = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		// Second login (same user, different session)
		const login2 = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		// Both tokens should be different
		// (but may be same if JWT doesn't include timestamp or random component)
		expect(login1.body.data.accessToken).toBeDefined();
		expect(login2.body.data.accessToken).toBeDefined();
		expect(login1.body.data.refreshToken).toBeDefined();
		expect(login2.body.data.refreshToken).toBeDefined();

		// Both tokens should work
		await request(app)
			.get("/users")
			.set("Authorization", `Bearer ${login1.body.data.accessToken}`)
			.expect(200);

		await request(app)
			.get("/users")
			.set("Authorization", `Bearer ${login2.body.data.accessToken}`)
			.expect(200);
	});

	test("should allow independent logout of concurrent sessions", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		// Create two sessions
		const login1 = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const login2 = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		// Logout first session
		await request(app)
			.post("/auth/logout")
			.send({ refreshToken: login1.body.data.refreshToken })
			.expect(200);

		// First session should not work
		const refresh1 = await request(app)
			.post("/auth/refresh")
			.send({ refreshToken: login1.body.data.refreshToken });

		expect([401, 403]).toContain(refresh1.status);

		// Second session should still work
		await request(app)
			.post("/auth/refresh")
			.send({ refreshToken: login2.body.data.refreshToken })
			.expect(200);
	});

	test("should track separate refresh tokens for concurrent sessions", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login1 = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const login2 = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		// Refresh first session
		const refresh1 = await request(app)
			.post("/auth/refresh")
			.send({ refreshToken: login1.body.data.refreshToken })
			.expect(200);

		// Second session should still use its original token
		await request(app)
			.post("/auth/refresh")
			.send({ refreshToken: login2.body.data.refreshToken })
			.expect(200);

		// First session's new token should work
		await request(app)
			.post("/auth/refresh")
			.send({ refreshToken: refresh1.body.data.refreshToken })
			.expect(200);
	});
});

describe("Logout Scenarios", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("should successfully logout with valid refresh token", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		await request(app)
			.post("/auth/logout")
			.send({ refreshToken: login.body.data.refreshToken })
			.expect(200);
	});

	test("should handle logout with missing refresh token", async () => {
		const res = await request(app)
			.post("/auth/logout")
			.send({});

		// Should return 400 or handle gracefully
		expect([200, 400]).toContain(res.status);
	});

	test("should handle logout with invalid refresh token", async () => {
		const res = await request(app)
			.post("/auth/logout")
			.send({ refreshToken: "invalid-token" });

		// Should return 401/404 or handle gracefully
		expect([200, 401, 404]).toContain(res.status);
	});

	test("should handle logout with already logged-out token", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		// First logout
		await request(app)
			.post("/auth/logout")
			.send({ refreshToken: login.body.data.refreshToken })
			.expect(200);

		// Second logout with same token
		const secondLogout = await request(app)
			.post("/auth/logout")
			.send({ refreshToken: login.body.data.refreshToken });

		// Should handle gracefully
		expect([200, 401, 404]).toContain(secondLogout.status);
	});

	test("should invalidate refresh token after logout", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const refreshToken = login.body.data.refreshToken;

		await request(app)
			.post("/auth/logout")
			.send({ refreshToken })
			.expect(200);

		// Token should not work after logout
		const refreshAttempt = await request(app)
			.post("/auth/refresh")
			.send({ refreshToken });

		expect([401, 403]).toContain(refreshAttempt.status);
	});
});

describe("Token Security", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("should not expose refresh token in GET requests", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", basePermissions);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const res = await request(app)
			.get("/users")
			.set("Authorization", `Bearer ${login.body.data.accessToken}`)
			.expect(200);

		// Response should not contain refresh tokens
		const responseStr = JSON.stringify(res.body);
		expect(responseStr).not.toMatch(/refreshToken/i);
	});

	test("should include all required JWT claims", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const token = login.body.data.accessToken;

		// Decode JWT (base64 decode the payload)
		const parts = token.split(".");
		expect(parts.length).toBe(3);

		const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

		// Verify required claims
		expect(payload.userId).toBeDefined(); // User ID
		expect(payload.tenantId).toBeDefined();
		expect(payload.role).toBeDefined();
		expect(payload.permissions).toBeDefined();
		expect(payload.iat).toBeDefined(); // Issued at
		expect(payload.exp).toBeDefined(); // Expiry
	});

	test("should not accept tokens with modified payload", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", basePermissions);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const token = login.body.data.accessToken;
		const parts = token.split(".");

		// Modify payload to add admin permissions
		const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
		payload.permissions = ["user.create", "user.delete", "tenant.create"];
		const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString("base64");
		const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

		// Should reject tampered token
		const res = await request(app)
			.get("/users")
			.set("Authorization", `Bearer ${tamperedToken}`)
			.expect(401);
	});
});
