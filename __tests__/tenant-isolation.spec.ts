import request from "supertest";
import { app, basePermissions, seedPermissions, seedRole, seedTenant, seedUser, toId } from "./setup.js";
import { UserModel } from "../src/models/user.model.js";
import { setupDatabase, teardownDatabase, clearDatabase } from "./setup.js";

describe("Tenant Isolation", () => {
	beforeAll(async () => {
		await setupDatabase();
	});

	afterAll(async () => {
		await teardownDatabase();
	});

	afterEach(async () => {
		await clearDatabase();
	});

	describe("User Access", () => {
		test("user cannot list users from another tenant", async () => {
			await seedPermissions(basePermissions);
			const tenantA = await seedTenant("tenant-a");
			const tenantB = await seedTenant("tenant-b");
			const role = await seedRole("admin", basePermissions);
			await seedUser("a@example.com", "Pass123!", toId(role._id), toId(tenantA._id));
			await seedUser("b@example.com", "Pass123!", toId(role._id), toId(tenantB._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "a@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const res = await request(app)
				.get("/users")
				.set("Authorization", `Bearer ${token}`)
				.expect(200);

			// Should only see users from tenant A
			expect(res.body.data.items.length).toBe(1);
		});

		test("user cannot create user with different tenantId", async () => {
			await seedPermissions(basePermissions);
			const tenantA = await seedTenant("tenant-a");
			const tenantB = await seedTenant("tenant-b");
			const role = await seedRole("admin", basePermissions);
			await seedUser("a@example.com", "Pass123!", toId(role._id), toId(tenantA._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "a@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			// Attempt to create user with tenant B's ID - enforceTenantOnBody will overwrite it
			// So the user gets created under tenant A (correct behavior per spec)
			const res = await request(app)
				.post("/users")
				.set("Authorization", `Bearer ${token}`)
				.send({
					email: "new@example.com",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenantB._id).toString()
				})
				.expect(201);

			// Verify user was created under tenant A, not tenant B
			const createdUser = await UserModel.findOne({ email: "new@example.com" });
			expect(createdUser?.tenant?.toString()).toBe(toId(tenantA._id).toString());
		});

		test("user cannot update user from another tenant", async () => {
			await seedPermissions(basePermissions);
			const tenantA = await seedTenant("tenant-a");
			const tenantB = await seedTenant("tenant-b");
			const role = await seedRole("admin", basePermissions);
			await seedUser("a@example.com", "Pass123!", toId(role._id), toId(tenantA._id));
			const userB = await seedUser("b@example.com", "Pass123!", toId(role._id), toId(tenantB._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "a@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.put(`/users/${userB._id}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ email: "hacked@example.com" })
				.expect(404); // Consistent 404 for cross-tenant access
		});

		test("user cannot deactivate user from another tenant", async () => {
			await seedPermissions(basePermissions);
			const tenantA = await seedTenant("tenant-a");
			const tenantB = await seedTenant("tenant-b");
			const role = await seedRole("admin", basePermissions);
			await seedUser("a@example.com", "Pass123!", toId(role._id), toId(tenantA._id));
			const userB = await seedUser("b@example.com", "Pass123!", toId(role._id), toId(tenantB._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "a@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/users/${userB._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(404);
		});

		test("tenant isolation blocks cross-tenant access", async () => {
			await seedPermissions(basePermissions);
			const tenantA = await seedTenant("tenant-a");
			const tenantB = await seedTenant("tenant-b");
			const role = await seedRole("admin", basePermissions);
			await seedUser("a@example.com", "Pass123!", toId(role._id), toId(tenantA._id));
			const userB = await seedUser("b@example.com", "Pass123!", toId(role._id), toId(tenantB._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "a@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.get(`/users/${userB._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(404);
		});
	});
});
