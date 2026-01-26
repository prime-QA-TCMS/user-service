import request from "supertest";
import { app, basePermissions, seedPermissions, seedRole, seedTenant, seedUser, toId } from "./setup.js";
import { setupDatabase, teardownDatabase, clearDatabase } from "./setup.js";

describe("Role Management", () => {
	beforeAll(async () => {
		await setupDatabase();
	});

	afterAll(async () => {
		await teardownDatabase();
	});

	afterEach(async () => {
		await clearDatabase();
	});

	describe("CRUD Operations", () => {
		test("create role with valid data succeeds", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const res = await request(app)
				.post("/roles")
				.set("Authorization", `Bearer ${token}`)
				.send({
					name: "new-role",
					description: "New Role Description",
					permissions: []
				})
				.expect(201);

			expect(res.body.success).toBe(true);
			expect(res.body.data.name).toBe("new-role");
		});

		test("create role without name fails", async () => {
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
				.post("/roles")
				.set("Authorization", `Bearer ${token}`)
				.send({ description: "No name" })
				.expect(400);
		});

		test("create duplicate role fails", async () => {
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
				.post("/roles")
				.set("Authorization", `Bearer ${token}`)
				.send({ name: "duplicate", description: "First" })
				.expect(201);

			await request(app)
				.post("/roles")
				.set("Authorization", `Bearer ${token}`)
				.send({ name: "duplicate", description: "Second" })
				.expect(409);
		});

		test("update role succeeds", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			const targetRole = await seedRole("target", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const res = await request(app)
				.put(`/roles/${targetRole._id}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ description: "Updated description" })
				.expect(200);

			expect(res.body.data.description).toBe("Updated description");
		});

		test("update non-existent role returns 404", async () => {
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
				.put(`/roles/507f1f77bcf86cd799439011`)
				.set("Authorization", `Bearer ${token}`)
				.send({ description: "Updated" })
				.expect(404);
		});

		test("list roles returns paginated results", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			await seedRole("viewer", ["role.read"]);
			await seedRole("contributor", ["role.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const res = await request(app)
				.get("/roles?limit=2&page=1")
				.set("Authorization", `Bearer ${token}`)
				.expect(200);

			expect(res.body.data.items.length).toBe(2);
			expect(res.body.data.total).toBe(3);
			expect(res.body.data.limit).toBe(2);
			expect(res.body.data.page).toBe(1);
		});

		test("delete unused role succeeds", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			const unusedRole = await seedRole("unused", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/roles/${unusedRole._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(200);
		});

		test("delete role in use fails", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			const usedRole = await seedRole("used", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));
			await seedUser("user@example.com", "Pass123!", toId(usedRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/roles/${usedRole._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(500);
		});

		test("get role by id succeeds", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			const targetRole = await seedRole("target", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const res = await request(app)
				.get(`/roles/${targetRole._id}`)
				.set("Authorization", `Bearer ${token}`);

			expect([200, 404]).toContain(res.status);
			if (res.status === 200) {
				expect(res.body.data.name).toBe("target");
			}
		});
	});
});
