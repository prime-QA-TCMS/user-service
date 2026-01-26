import request from "supertest";
import { app, basePermissions, seedPermissions, seedRole, seedTenant, seedUser, toId } from "./setup.js";
import { UserModel } from "../src/models/user.model.js";
import { setupDatabase, teardownDatabase, clearDatabase } from "./setup.js";

describe("RBAC", () => {
	beforeAll(async () => {
		await setupDatabase();
	});

	afterAll(async () => {
		await teardownDatabase();
	});

	afterEach(async () => {
		await clearDatabase();
	});

	describe("Permission Enforcement", () => {
		test("user without user.read cannot list users", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const limitedRole = await seedRole("limited", ["role.read"]);
			await seedUser("limited@example.com", "Pass123!", toId(limitedRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "limited@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.get("/users")
				.set("Authorization", `Bearer ${token}`)
				.expect(403);
		});

		test("user without user.create cannot create users", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const limitedRole = await seedRole("viewer", ["user.read"]);
			const targetRole = await seedRole("target", ["user.read"]);
			await seedUser("viewer@example.com", "Pass123!", toId(limitedRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "viewer@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.post("/users")
				.set("Authorization", `Bearer ${token}`)
				.send({
					email: "new@example.com",
					password: "Pass123!",
					roleId: toId(targetRole._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(403);
		});

		test("user without user.delete cannot deactivate users", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const limitedRole = await seedRole("limited", ["user.read", "user.update"]);
			const targetRole = await seedRole("target", ["user.read"]);
			const limitedUser = await seedUser("limited@example.com", "Pass123!", toId(limitedRole._id), toId(tenant._id));
			const targetUser = await seedUser("target@example.com", "Pass123!", toId(targetRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "limited@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/users/${targetUser._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(403);
		});

		test("user without role.read cannot list roles", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const limitedRole = await seedRole("limited", ["user.read"]);
			await seedUser("limited@example.com", "Pass123!", toId(limitedRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "limited@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.get("/roles")
				.set("Authorization", `Bearer ${token}`)
				.expect(403);
		});

		test("user without role.create cannot create roles", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const limitedRole = await seedRole("limited", ["role.read"]);
			await seedUser("limited@example.com", "Pass123!", toId(limitedRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "limited@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.post("/roles")
				.set("Authorization", `Bearer ${token}`)
				.send({ name: "new-role", description: "New Role" })
				.expect(403);
		});

		test("user without role.delete cannot delete roles", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const limitedRole = await seedRole("limited", ["role.read", "role.update"]);
			const targetRole = await seedRole("target", ["user.read"]);
			await seedUser("limited@example.com", "Pass123!", toId(limitedRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "limited@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/roles/${targetRole._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(403);
		});
	});

	describe("Self-Update Restrictions", () => {
		test("user can update own email without user.update permission", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const limitedRole = await seedRole("limited", []);
			const user = await seedUser("me@example.com", "Pass123!", toId(limitedRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "me@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.put(`/users/${user._id}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ email: "newemail@example.com" })
				.expect(200);
		});

		test("user cannot change own role via self-update", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const limitedRole = await seedRole("limited", []);
			const adminRole = await seedRole("admin", basePermissions);
			const user = await seedUser("me@example.com", "Pass123!", toId(limitedRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "me@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.put(`/users/${user._id}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ roleId: toId(adminRole._id).toString() })
				.expect(200);

			// Verify role wasn't changed
			const updated = await UserModel.findById(user._id);
			expect(updated?.role.toString()).toBe(toId(limitedRole._id).toString());
		});

		test("user cannot change own isActive via self-update", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", []);
			const user = await seedUser("me@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "me@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.put(`/users/${user._id}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ isActive: false })
				.expect(200);

			// Verify isActive wasn't changed
			const updated = await UserModel.findById(user._id);
			expect(updated?.isActive).toBe(true);
		});

		test("user cannot change own tenant via self-update", async () => {
			await seedPermissions();
			const tenantA = await seedTenant("tenant-a");
			const tenantB = await seedTenant("tenant-b");
			const role = await seedRole("user", []);
			const user = await seedUser("me@example.com", "Pass123!", toId(role._id), toId(tenantA._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "me@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.put(`/users/${user._id}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ tenantId: toId(tenantB._id).toString() })
				.expect(200);

			// Verify tenant wasn't changed
			const updated = await UserModel.findById(user._id);
			expect(updated?.tenant?.toString()).toBe(toId(tenantA._id).toString());
		});
	});

	describe("Protected Roles", () => {
		test("cannot delete admin role", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			const superRole = await seedRole("super-admin", basePermissions);
			await seedUser("super@example.com", "Pass123!", toId(superRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "super@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/roles/${adminRole._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(403);
		});

		test("cannot delete super-admin role", async () => {
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
				.delete(`/roles/${superRole._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(403);
		});

		test("can delete custom roles", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			const customRole = await seedRole("custom", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/roles/${customRole._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(200);
		});
	});
});
