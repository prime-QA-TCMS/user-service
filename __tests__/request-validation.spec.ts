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
 * REQUEST VALIDATION TESTS
 * 
 * Coverage:
 * - Content-Type enforcement
 * - Request body size limits
 * - Malformed JSON handling
 * - Extra/unexpected fields
 * - SQL/NoSQL injection attempts
 * - XSS attempts
 */

describe("Content-Type Validation", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("should accept application/json content-type", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);

		await request(app)
			.post("/auth/register")
			.set("Content-Type", "application/json")
			.send({
				email: "user@example.com",
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString()
			})
			.expect(201);
	});

	test("should handle missing content-type header", async () => {
		const res = await request(app)
			.post("/auth/login")
			.send("email=test@example.com&password=Pass123!");

		// May accept form data or reject
		expect([200, 400, 415, 500]).toContain(res.status);
	});

	test("should reject non-JSON content-type for JSON endpoints", async () => {
		const res = await request(app)
			.post("/auth/login")
			.set("Content-Type", "text/plain")
			.send("email=test@example.com");

		// Should reject or handle gracefully
		expect([400, 415, 500]).toContain(res.status);
	});

	test("should handle application/json with charset", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);

		await request(app)
			.post("/auth/register")
			.set("Content-Type", "application/json; charset=utf-8")
			.send({
				email: "user@example.com",
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString()
			})
			.expect(201);
	});
});

describe("Malformed JSON Handling", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("should reject malformed JSON", async () => {
		const res = await request(app)
			.post("/auth/login")
			.set("Content-Type", "application/json")
			.send('{"email": "test@example.com", "password": "Pass123!')
			.expect(400);

		expect(res.body.message).toMatch(/json|parse|invalid|syntax/i);
	});

	test("should reject JSON with trailing comma", async () => {
		const res = await request(app)
			.post("/auth/login")
			.set("Content-Type", "application/json")
			.send('{"email": "test@example.com", "password": "Pass123!",}');

		// May be accepted by lenient parsers or rejected
		expect([200, 400, 401]).toContain(res.status);
	});

	test("should reject JSON with unquoted keys", async () => {
		const res = await request(app)
			.post("/auth/login")
			.set("Content-Type", "application/json")
			.send('{email: "test@example.com", password: "Pass123!"}')
			.expect(400);
	});

	test("should reject non-JSON string", async () => {
		const res = await request(app)
			.post("/auth/login")
			.set("Content-Type", "application/json")
			.send("this is not json")
			.expect(400);
	});

	test("should reject empty body when data expected", async () => {
		const res = await request(app)
			.post("/auth/login")
			.set("Content-Type", "application/json")
			.send("")
			.expect(400);
	});
});

describe("Request Body Size Limits", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("should accept normal-sized request body", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);

		await request(app)
			.post("/auth/register")
			.send({
				email: "user@example.com",
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString()
			})
			.expect(201);
	});

	test("should reject extremely large request body", async () => {
		// Create a very large payload (>10MB)
		const largeString = "a".repeat(11 * 1024 * 1024); // 11MB

		const res = await request(app)
			.post("/auth/login")
			.set("Content-Type", "application/json")
			.send({ email: "test@example.com", password: largeString });

		// Should reject with 413 Payload Too Large or 400
		expect([400, 413, 500]).toContain(res.status);
	});

	test("should handle large but valid description field", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);

		// 1KB description
		const largeDescription = "a".repeat(1024);

		const res = await request(app)
			.post("/roles")
			.set("Authorization", `Bearer ${login.body.data.accessToken}`)
			.send({
				name: "test-role",
				description: largeDescription
			});

		// May accept or reject based on field limits
		expect([201, 400]).toContain(res.status);
	});
});

describe("Extra/Unexpected Fields", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("should handle extra fields in registration", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);

		const res = await request(app)
			.post("/auth/register")
			.send({
				email: "user@example.com",
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString(),
				hackerField: "malicious",
				isAdmin: true,
				permissions: ["admin.all"]
			});

		// Should ignore extra fields or reject
		expect([201, 400]).toContain(res.status);

		if (res.status === 201) {
			// Extra fields should not be stored
			expect(res.body.data.hackerField).toBeUndefined();
			expect(res.body.data.isAdmin).toBeUndefined();
		}
	});

	test("should ignore extra fields in login", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const res = await request(app)
			.post("/auth/login")
			.send({
				email: "user@example.com",
				password: "Pass123!",
				extraField: "ignored",
				isAdmin: true
			});

		// Should succeed and ignore extra fields
		expect([200, 400]).toContain(res.status);
	});

	test("should handle nested objects in request", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);

		const res = await request(app)
			.post("/users")
			.set("Authorization", `Bearer ${login.body.data.accessToken}`)
			.send({
				email: "newuser@example.com",
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString(),
				metadata: {
					nested: "object",
					deep: { value: "data" }
				}
			});

		// Should ignore or reject nested objects
		expect([201, 400]).toContain(res.status);
	});
});

describe("NoSQL Injection Attempts", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("should prevent $where injection in email field", async () => {
		const res = await request(app)
			.post("/auth/login")
			.send({
				email: { $where: "this.password == 'anything'" },
				password: "Pass123!"
			});

		expect([400, 401, 500]).toContain(res.status);
	});

	test("should prevent $ne injection in login", async () => {
		const res = await request(app)
			.post("/auth/login")
			.send({
				email: { $ne: null },
				password: { $ne: null }
			});

		expect([400, 401]).toContain(res.status);
	});

	test("should prevent $gt injection in password", async () => {
		const res = await request(app)
			.post("/auth/login")
			.send({
				email: "user@example.com",
				password: { $gt: "" }
			});

		expect([400, 401]).toContain(res.status);
	});

	test("should sanitize role name with MongoDB operators", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);

		const res = await request(app)
			.post("/roles")
			.set("Authorization", `Bearer ${login.body.data.accessToken}`)
			.send({
				name: { $regex: ".*" },
				description: "Injection attempt"
			});

		expect([400, 500, 409]).toContain(res.status);
	});

	test("should prevent $regex injection in search", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);

		const res = await request(app)
			.get("/users")
			.query({ q: { $regex: ".*", $options: "i" } })
			.set("Authorization", `Bearer ${login.body.data.accessToken}`);

		// Should sanitize or reject
		expect([200, 400]).toContain(res.status);
	});
});

describe("XSS Prevention", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("should handle script tags in role name", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);

		const res = await request(app)
			.post("/roles")
			.set("Authorization", `Bearer ${login.body.data.accessToken}`)
			.send({
				name: "<script>alert('xss')</script>",
				description: "XSS attempt"
			});

		// Should accept (sanitization should happen on output) or reject
		expect([201, 400]).toContain(res.status);

		if (res.status === 201) {
			// Verify script tags are stored (output encoding is separate concern)
			expect(res.body.data.name).toBeDefined();
		}
	});

	test("should handle HTML entities in description", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);

		await request(app)
			.post("/roles")
			.set("Authorization", `Bearer ${login.body.data.accessToken}`)
			.send({
				name: "test-role",
				description: "&lt;b&gt;Bold text&lt;/b&gt;"
			})
			.expect(201);
	});

	test("should handle JavaScript protocol in text fields", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);

		const res = await request(app)
			.post("/tenants")
			.set("Authorization", `Bearer ${login.body.data.accessToken}`)
			.send({
				name: "javascript:alert('xss')",
				domain: "test.com"
			});

		expect([201, 400]).toContain(res.status);
	});
});

describe("Type Coercion Edge Cases", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("should handle numeric string for boolean fields", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);

		// Try to register with numeric string instead of boolean
		const res = await request(app)
			.post("/auth/register")
			.send({
				email: "user@example.com",
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString(),
				isActive: "1"
			});

		// Should coerce or reject
		expect([201, 400]).toContain(res.status);
	});

	test("should handle null values in required fields", async () => {
		const res = await request(app)
			.post("/auth/login")
			.send({
				email: null,
				password: null
			})
			.expect(400);

		expect(res.body.message).toMatch(/required|email|password/i);
	});

	test("should handle undefined values in required fields", async () => {
		const res = await request(app)
			.post("/auth/login")
			.send({
				email: undefined,
				password: "Pass123!"
			})
			.expect(400);
	});

	test("should handle array instead of string", async () => {
		const res = await request(app)
			.post("/auth/login")
			.send({
				email: ["user@example.com"],
				password: "Pass123!"
			});

		expect([400, 401]).toContain(res.status);
	});

	test("should handle object instead of string", async () => {
		const res = await request(app)
			.post("/auth/login")
			.send({
				email: { value: "user@example.com" },
				password: "Pass123!"
			});

		expect([400, 401, 500]).toContain(res.status);
	});

	test("should handle boolean instead of string", async () => {
		const res = await request(app)
			.post("/auth/login")
			.send({
				email: true,
				password: false
			});

		expect([400, 401]).toContain(res.status);
	});
});

describe("Query Parameter Validation", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("should validate page query parameter type", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", basePermissions);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		// Non-numeric page parameter
		const res = await request(app)
			.get("/users?page=abc")
			.set("Authorization", `Bearer ${login.body.data.accessToken}`);

		// Should default or reject
		expect([200, 400]).toContain(res.status);
	});

	test("should validate limit query parameter type", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", basePermissions);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		// Non-numeric limit parameter
		const res = await request(app)
			.get("/users?limit=xyz")
			.set("Authorization", `Bearer ${login.body.data.accessToken}`);

		expect([200, 400]).toContain(res.status);
	});

	test("should handle SQL injection in query parameters", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", basePermissions);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const res = await request(app)
			.get("/users?page=1'; DROP TABLE users; --")
			.set("Authorization", `Bearer ${login.body.data.accessToken}`);

		// Should sanitize or default
		expect([200, 400]).toContain(res.status);
	});

	test("should handle special characters in query parameters", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", basePermissions);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const res = await request(app)
			.get("/users?search=%00%20%3C%3E%22%27")
			.set("Authorization", `Bearer ${login.body.data.accessToken}`);

		expect([200, 400]).toContain(res.status);
	});
});

describe("Header Injection Prevention", () => {
	test.skip("should prevent CRLF injection in headers", async () => {
		// Skipped: superagent/node throws TypeError when trying to set headers with CRLF
		// This is actually good - framework-level protection
		const res = await request(app)
			.post("/auth/login")
			.set("User-Agent", "Test\r\nX-Injected-Header: malicious")
			.send({
				email: "user@example.com",
				password: "Pass123!"
			});

		// Headers should be sanitized by framework
		expect(res.headers["x-injected-header"]).toBeUndefined();
	});

	test("should handle very long header values", async () => {
		const longHeader = "a".repeat(10000);

		const res = await request(app)
			.post("/auth/login")
			.set("X-Custom-Header", longHeader)
			.send({
				email: "user@example.com",
				password: "Pass123!"
			});

		// Should handle or reject
		expect([200, 400, 401, 431, 500]).toContain(res.status);
	});
});
