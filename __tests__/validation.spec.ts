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

describe("Error Handling - Consistency", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("all errors return consistent format", async () => {
		const res = await request(app)
			.post("/auth/login")
			.send({ email: "test@example.com" }) // missing password
			.expect(400);

		expect(res.body).toHaveProperty("success");
		expect(res.body).toHaveProperty("message");
		expect(res.body).toHaveProperty("code");
		expect(res.body.success).toBe(false);
	});

	test("unauthenticated access returns 401", async () => {
		const res = await request(app)
			.get("/users")
			.expect(401);

		expect(res.body.code).toBe("UNAUTHORIZED");
	});

	test("invalid token returns 401", async () => {
		const res = await request(app)
			.get("/users")
			.set("Authorization", "Bearer invalid-token")
			.expect(401);

		expect(res.body.code).toBe("UNAUTHORIZED");
	});

	test("not found route returns 404", async () => {
		const res = await request(app)
			.get("/nonexistent")
			.expect(404);

		expect(res.body.code).toBe("NOT_FOUND");
	});
});

describe("Health Check", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());

	test("health endpoint returns 200 without authentication", async () => {
		const res = await request(app)
			.get("/health")
			.expect(200);

		expect(res.body.status).toBe("ok");
	});
});

describe("Validation - Input Edge Cases", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("register with empty string email fails", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);

		await request(app)
			.post("/auth/register")
			.send({
				email: "",
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString()
			})
			.expect(400);
	});

	test("register with whitespace-only email creates user (no validation)", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);

		// NOTE: Current implementation lacks email format validation
		await request(app)
			.post("/auth/register")
			.send({
				email: "   ",
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString()
			})
			.expect(500); // Mongoose validation may fail
	});

	test("register with invalid email format succeeds (no format validation)", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);

		// NOTE: Current implementation lacks email format validation - SECURITY GAP
		const invalidEmail = "notanemail";

		const res = await request(app)
			.post("/auth/register")
			.send({
				email: invalidEmail,
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString()
			})
			.expect(201);

		expect(res.body.data.email).toBe(invalidEmail);
	});

	test("register with very long email succeeds (no length validation)", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);

		// NOTE: Current implementation lacks email length validation
		const longEmail = "a".repeat(300) + "@example.com";

		const res = await request(app)
			.post("/auth/register")
			.send({
				email: longEmail,
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString()
			})
			.expect(201);

		expect(res.body.data.email).toBe(longEmail);
	});

	test("login with empty string credentials fails", async () => {
		await request(app)
			.post("/auth/login")
			.send({ email: "", password: "" })
			.expect(400);
	});

	test("login with null values fails", async () => {
		await request(app)
			.post("/auth/login")
			.send({ email: null, password: null })
			.expect(400);
	});

	test("refresh with empty string token fails", async () => {
		await request(app)
			.post("/auth/refresh")
			.send({ refreshToken: "" })
			.expect(400);
	});

	test("logout with empty string token fails validation", async () => {
		// Empty string is caught by validation
		await request(app)
			.post("/auth/logout")
			.send({ refreshToken: "" })
			.expect(400);
	});
});

describe("Validation - Invalid ObjectIds", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("get user with invalid ObjectId format returns 500", async () => {
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
			.get("/users/invalid-id")
			.set("Authorization", `Bearer ${token}`)
			.expect(500);
	});

	test("update user with invalid ObjectId format returns 500", async () => {
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
			.put("/users/not-a-valid-id")
			.set("Authorization", `Bearer ${token}`)
			.send({ email: "new@example.com" })
			.expect(500);
	});

	test("delete user with invalid ObjectId format returns 500", async () => {
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
			.delete("/users/invalid-id")
			.set("Authorization", `Bearer ${token}`)
			.expect(500);
	});

	test("create user with invalid roleId format fails", async () => {
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
				roleId: "invalid-role-id",
				tenantId: toId(tenant._id).toString()
			})
			.expect(500);
	});

	test("delete role with invalid ObjectId format returns 500", async () => {
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
			.delete("/roles/not-an-objectid")
			.set("Authorization", `Bearer ${token}`)
			.expect(500);
	});
});
