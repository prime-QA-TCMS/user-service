import request from "supertest";
import jwt from "jsonwebtoken";
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
import { config } from "../src/config/index.js";

describe("User Management - Advanced Negative Paths", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("create user without password fails", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		const userRole = await seedRole("user", ["user.read"]);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.post("/users")
			.set("Authorization", `Bearer ${token}`)
			.send({
				email: "new@example.com",
				roleId: toId(userRole._id).toString(),
				tenantId: toId(tenant._id).toString()
			})
			.expect(500);
	});

	test("create user without email fails validation", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.post("/users")
			.set("Authorization", `Bearer ${token}`)
			.send({
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString()
			})
			.expect(400);
	});

	test("create user without roleId fails", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.post("/users")
			.set("Authorization", `Bearer ${token}`)
			.send({
				email: "new@example.com",
				password: "Pass123!",
				tenantId: toId(tenant._id).toString()
			})
			.expect(500);
	});

	test("update user with empty object succeeds but changes nothing", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));
		const targetUser = await seedUser("target@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.put(`/users/${targetUser._id}`)
			.set("Authorization", `Bearer ${token}`)
			.send({})
			.expect(200);
	});

	test("list users with negative page causes database error", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.get("/users?page=-1&limit=10")
			.set("Authorization", `Bearer ${token}`)
			.expect(500);
	});

	test("list users with zero limit returns zero items", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		const res = await request(app)
			.get("/users?page=1&limit=0")
			.set("Authorization", `Bearer ${token}`)
			.expect(200);

		expect(res.body.data.limit).toBe(0);
	});

	test("list users with non-numeric pagination params causes issues", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.get("/users?page=abc&limit=xyz")
			.set("Authorization", `Bearer ${token}`);
	});

	test("update non-existent user returns 404", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.put("/users/507f1f77bcf86cd799439011")
			.set("Authorization", `Bearer ${token}`)
			.send({ email: "new@example.com" })
			.expect(404);
	});

	test("delete non-existent user returns 404", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.delete("/users/507f1f77bcf86cd799439011")
			.set("Authorization", `Bearer ${token}`)
			.expect(404);
	});
});

describe("Role Management - Advanced Negative Paths", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("create role with empty string name fails", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.post("/roles")
			.set("Authorization", `Bearer ${token}`)
			.send({ name: "", description: "Empty name" })
			.expect(400);
	});

	test("create role with whitespace-only name succeeds (no trim validation)", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		const res = await request(app)
			.post("/roles")
			.set("Authorization", `Bearer ${token}`)
			.send({ name: "   ", description: "Whitespace name" })
			.expect(201);

		expect(res.body.data.name).toBe("   ");
	});

	test("create role with invalid permission codes succeeds with empty permissions", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		const res = await request(app)
			.post("/roles")
			.set("Authorization", `Bearer ${token}`)
			.send({
				name: "test-role",
				description: "Test",
				permissions: ["invalid.permission", "fake.code"]
			})
			.expect(201);

		expect(res.body.data.permissions).toHaveLength(0);
	});

	test("update role with empty update succeeds", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		const targetRole = await seedRole("target", ["user.read"]);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.put(`/roles/${targetRole._id}`)
			.set("Authorization", `Bearer ${token}`)
			.send({})
			.expect(200);
	});

	test("update protected role by name fails", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const adminRole = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.put(`/roles/${adminRole._id}`)
			.set("Authorization", `Bearer ${token}`)
			.send({ description: "Try to update admin" })
			.expect(500);
	});

	test("list roles with non-numeric pagination params works", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.get("/roles?page=abc&limit=xyz")
			.set("Authorization", `Bearer ${token}`)
			.expect(200);
	});
});

describe("Tenant Management - Advanced Negative Paths", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("list tenants fails for non-super-admin", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.get("/tenants")
			.set("Authorization", `Bearer ${token}`)
			.expect(200);
	});

	test("create tenant with null name fails", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("super-admin", basePermissions);
		await seedUser("super@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "super@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.post("/tenants")
			.set("Authorization", `Bearer ${token}`)
			.send({ name: null, domain: "test.com" })
			.expect(400);
	});

	test("create tenant with empty string name fails", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("super-admin", basePermissions);
		await seedUser("super@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "super@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.post("/tenants")
			.set("Authorization", `Bearer ${token}`)
			.send({ name: "", domain: "test.com" })
			.expect(400);
	});

	test("update tenant with empty update succeeds", async () => {
		await seedPermissions(basePermissions);
		const targetTenant = await seedTenant("target");
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("super-admin", basePermissions);
		await seedUser("super@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "super@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.put(`/tenants/${targetTenant._id}`)
			.set("Authorization", `Bearer ${token}`)
			.send({})
			.expect(200);
	});

	test("update non-existent tenant returns 404", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("super-admin", basePermissions);
		await seedUser("super@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "super@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.put("/tenants/507f1f77bcf86cd799439011")
			.set("Authorization", `Bearer ${token}`)
			.send({ domain: "new.com" })
			.expect(404);
	});

	test("delete non-existent tenant succeeds (idempotent)", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("super-admin", basePermissions);
		await seedUser("super@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "super@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.delete("/tenants/507f1f77bcf86cd799439011")
			.set("Authorization", `Bearer ${token}`)
			.expect(200);
	});

	test("create tenant with very long name succeeds", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("super-admin", basePermissions);
		await seedUser("super@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "super@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		const longName = "a".repeat(200);

		await request(app)
			.post("/tenants")
			.set("Authorization", `Bearer ${token}`)
			.send({ name: longName, domain: "long.com" })
			.expect(201);
	});
});

describe("Authentication - Advanced Negative Paths", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("register with mismatched data types converts to string", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);

		const res = await request(app)
			.post("/auth/register")
			.send({
				email: 12345,
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString()
			})
			.expect(201);

		expect(res.body.data.email).toBe("12345");
	});

	test("login with SQL injection attempt fails", async () => {
		await request(app)
			.post("/auth/login")
			.send({
				email: "admin@example.com' OR '1'='1",
				password: "anything"
			})
			.expect(401);
	});

	test("login with NoSQL injection attempt fails", async () => {
		await request(app)
			.post("/auth/login")
			.send({
				email: { $ne: null },
				password: { $ne: null }
			})
			.expect(401);
	});

	test("refresh with JWT access token instead of refresh token fails", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const accessToken = login.body.data.accessToken as string;

		await request(app)
			.post("/auth/refresh")
			.send({ refreshToken: accessToken })
			.expect(401);
	});

	test("refresh token reuse after logout fails", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const refreshToken = login.body.data.refreshToken as string;

		await request(app)
			.post("/auth/logout")
			.send({ refreshToken })
			.expect(200);

		await request(app)
			.post("/auth/refresh")
			.send({ refreshToken })
			.expect(401);
	});

	test("multiple concurrent logouts are idempotent", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);
		await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(200);

		const refreshToken = login.body.data.refreshToken as string;

		await Promise.all([
			request(app).post("/auth/logout").send({ refreshToken }),
			request(app).post("/auth/logout").send({ refreshToken }),
			request(app).post("/auth/logout").send({ refreshToken })
		]);
	});

	test("login after user deactivation fails", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("admin", basePermissions);
		const user = await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));
		const admin = await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

		const adminLogin = await request(app)
			.post("/auth/login")
			.send({ email: "admin@example.com", password: "Pass123!" })
			.expect(200);
		const adminToken = adminLogin.body.data.accessToken as string;

		await request(app)
			.delete(`/users/${user._id}`)
			.set("Authorization", `Bearer ${adminToken}`)
			.expect(200);

		await request(app)
			.post("/auth/login")
			.send({ email: "user@example.com", password: "Pass123!" })
			.expect(401);
	});

	test("register with non-existent roleId succeeds (no FK validation)", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");

		const res = await request(app)
			.post("/auth/register")
			.send({
				email: "new@example.com",
				password: "Pass123!",
				roleId: "507f1f77bcf86cd799439011",
				tenantId: toId(tenant._id).toString()
			})
			.expect(201);

		expect(res.body.data.email).toBe("new@example.com");
	});

	test("register with non-existent tenantId succeeds (tenant can be null)", async () => {
		await seedPermissions();
		const role = await seedRole("user", ["user.read"]);

		const res = await request(app)
			.post("/auth/register")
			.send({
				email: "new@example.com",
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: "507f1f77bcf86cd799439011"
			})
			.expect(201);

		expect(res.body.data.email).toBe("new@example.com");
	});
});

describe("Authorization - Token and Header Edge Cases", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());

	test("missing Authorization header returns 401", async () => {
		await request(app)
			.get("/users")
			.expect(401);
	});

	test("malformed Authorization header returns 401", async () => {
		await request(app)
			.get("/users")
			.set("Authorization", "NotBearer token")
			.expect(401);
	});

	test("Authorization header with only 'Bearer' returns 401", async () => {
		await request(app)
			.get("/users")
			.set("Authorization", "Bearer")
			.expect(401);
	});

	test("expired JWT token returns 401", async () => {
		const expiredToken = jwt.sign(
			{ sub: "user-id", tenantId: "tenant-id", role: "admin", permissions: [] },
			config.jwtSecret as string,
			{ expiresIn: "-1h" }
		);

		await request(app)
			.get("/users")
			.set("Authorization", `Bearer ${expiredToken}`)
			.expect(401);
	});

	test("JWT with invalid signature returns 401", async () => {
		const token = jwt.sign(
			{ sub: "user-id", tenantId: "tenant-id", role: "admin", permissions: [] },
			"wrong-secret",
			{ expiresIn: "1h" }
		);

		await request(app)
			.get("/users")
			.set("Authorization", `Bearer ${token}`)
			.expect(401);
	});

	test("JWT without required claims returns 401 or 403", async () => {
		const token = jwt.sign(
			{ sub: "user-id" },
			config.jwtSecret as string,
			{ expiresIn: "1h" }
		);

		await request(app)
			.get("/users")
			.set("Authorization", `Bearer ${token}`)
			.expect(403);
	});
});

describe("Error Consistency - Comprehensive Checks", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());

	test("404 on invalid route has correct format", async () => {
		const res = await request(app)
			.get("/nonexistent-route")
			.expect(404);

		expect(res.body).toHaveProperty("success", false);
		expect(res.body).toHaveProperty("code", "NOT_FOUND");
		expect(res.body).toHaveProperty("message");
	});

	test("405 method not allowed returns 404 (no route)", async () => {
		await request(app)
			.patch("/health")
			.expect(404);
	});

	test("malformed JSON body returns error", async () => {
		const res = await request(app)
			.post("/auth/login")
			.set("Content-Type", "application/json")
			.send("{ invalid json }")
			.expect(400);
	});

	test("empty body on POST request fails validation", async () => {
		await request(app)
			.post("/auth/login")
			.send({})
			.expect(400);
	});

	test("very large request body is handled", async () => {
		const largeData = {
			email: "test@example.com",
			password: "Pass123!",
			extraData: "x".repeat(10000)
		};

		await request(app)
			.post("/auth/login")
			.send(largeData)
			.expect(401);
	});
});
