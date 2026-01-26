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

describe("Tenant Management - CRUD Operations", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("list tenants succeeds for super-admin", async () => {
		await seedPermissions(basePermissions);
		await seedTenant("tenant-a");
		await seedTenant("tenant-b");
		const tenant = await seedTenant("tenant-c");
		const superRole = await seedRole("super-admin", basePermissions);
		await seedUser("super@example.com", "Pass123!", toId(superRole._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "super@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		const res = await request(app)
			.get("/tenants")
			.set("Authorization", `Bearer ${token}`)
			.expect(200);

		expect(res.body.data.length).toBeGreaterThanOrEqual(3);
	});

	test("create tenant with valid data succeeds", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const superRole = await seedRole("super-admin", basePermissions);
		await seedUser("super@example.com", "Pass123!", toId(superRole._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "super@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		const res = await request(app)
			.post("/tenants")
			.set("Authorization", `Bearer ${token}`)
			.send({ name: "new-tenant", domain: "new.example.com" })
			.expect(201);

		expect(res.body.success).toBe(true);
		expect(res.body.data.name).toBe("new-tenant");
	});

	test("create tenant without name fails", async () => {
		await seedPermissions(basePermissions);
		const tenant = await seedTenant("tenant-a");
		const superRole = await seedRole("super-admin", basePermissions);
		await seedUser("super@example.com", "Pass123!", toId(superRole._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "super@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.post("/tenants")
			.set("Authorization", `Bearer ${token}`)
			.send({ domain: "example.com" })
			.expect(400);
	});

	test("update tenant succeeds", async () => {
		await seedPermissions(basePermissions);
		const targetTenant = await seedTenant("target");
		const tenant = await seedTenant("tenant-a");
		const superRole = await seedRole("super-admin", basePermissions);
		await seedUser("super@example.com", "Pass123!", toId(superRole._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "super@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		const res = await request(app)
			.put(`/tenants/${targetTenant._id}`)
			.set("Authorization", `Bearer ${token}`)
			.send({ domain: "updated.example.com" })
			.expect(200);

		expect(res.body.data.domain).toBe("updated.example.com");
	});

	test("delete tenant succeeds", async () => {
		await seedPermissions(basePermissions);
		const targetTenant = await seedTenant("target");
		const tenant = await seedTenant("tenant-a");
		const superRole = await seedRole("super-admin", basePermissions);
		await seedUser("super@example.com", "Pass123!", toId(superRole._id), toId(tenant._id));

		const login = await request(app)
			.post("/auth/login")
			.send({ email: "super@example.com", password: "Pass123!" })
			.expect(200);
		const token = login.body.data.accessToken as string;

		await request(app)
			.delete(`/tenants/${targetTenant._id}`)
			.set("Authorization", `Bearer ${token}`)
			.expect(200);
	});
});
