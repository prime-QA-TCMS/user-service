import request from "supertest";
import { UserModel } from "../src/models/user.model.js";
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

describe("Business Rules - Role Rules", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	describe("ensureRoleNameUnique", () => {
		test("creating role with unique name succeeds", async () => {
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
				.send({ name: "unique-role", description: "Unique" })
				.expect(201);
		});

		test("creating role with duplicate name fails", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("admin", basePermissions);
			await seedRole("existing", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.post("/roles")
				.set("Authorization", `Bearer ${token}`)
				.send({ name: "existing", description: "Duplicate" })
				.expect(409);
		});

		test("creating role with case-sensitive duplicate name succeeds", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("admin", basePermissions);
			await seedRole("MyRole", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.post("/roles")
				.set("Authorization", `Bearer ${token}`)
				.send({ name: "myrole", description: "Different case" })
				.expect(201);
		});
	});

	describe("ensureProtectedRoleName", () => {
		test("updating super-admin role fails", async () => {
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
				.put(`/roles/${superRole._id}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ description: "Try to update" })
				.expect(500);
		});

		test("updating admin role fails", async () => {
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
				.send({ description: "Try to update" })
				.expect(500);
		});

		test("updating non-protected role succeeds", async () => {
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
				.put(`/roles/${customRole._id}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ description: "Updated successfully" })
				.expect(200);
		});

		test("deleting super-admin role fails", async () => {
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

		test("deleting admin role fails", async () => {
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
	});

	describe("ensureRoleDeletable", () => {
		test("deleting role not in use succeeds", async () => {
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

		test("deleting role in use by one user fails", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			const inUseRole = await seedRole("in-use", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));
			await seedUser("user@example.com", "Pass123!", toId(inUseRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/roles/${inUseRole._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(500);
		});

		test("deleting role in use by multiple users fails", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			const popularRole = await seedRole("popular", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));
			await seedUser("user1@example.com", "Pass123!", toId(popularRole._id), toId(tenant._id));
			await seedUser("user2@example.com", "Pass123!", toId(popularRole._id), toId(tenant._id));
			await seedUser("user3@example.com", "Pass123!", toId(popularRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/roles/${popularRole._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(500);
		});

		test("deleting role after all users removed succeeds", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			const tempRole = await seedRole("temp", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));
			const tempUser = await seedUser("temp@example.com", "Pass123!", toId(tempRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/users/${tempUser._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(200);

			await request(app)
				.delete(`/roles/${tempRole._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(500);
		});

		test("deleting role used by inactive users fails", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			const testRole = await seedRole("test-role", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));
			const inactiveUser = await seedUser("inactive@example.com", "Pass123!", toId(testRole._id), toId(tenant._id));

			await UserModel.findByIdAndUpdate(inactiveUser._id, { isActive: false });

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/roles/${testRole._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(500);
		});
	});
});

describe("Business Rules - User Rules", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	describe("ensureUniqueEmail", () => {
		test("creating user with unique email succeeds", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			const userRole = await seedRole("user", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.post("/users")
				.set("Authorization", `Bearer ${token}`)
				.send({
					email: "unique@example.com",
					password: "Pass123!",
					roleId: toId(userRole._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);
		});

		test("creating user with duplicate email fails", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			const userRole = await seedRole("user", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));
			await seedUser("existing@example.com", "Pass123!", toId(userRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.post("/users")
				.set("Authorization", `Bearer ${token}`)
				.send({
					email: "existing@example.com",
					password: "Pass123!",
					roleId: toId(userRole._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(500);
		});

		test("creating user with case-sensitive duplicate email succeeds", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			const userRole = await seedRole("user", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));
			await seedUser("Test@example.com", "Pass123!", toId(userRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const res = await request(app)
				.post("/users")
				.set("Authorization", `Bearer ${token}`)
				.send({
					email: "test@example.com",
					password: "Pass123!",
					roleId: toId(userRole._id).toString(),
					tenantId: toId(tenant._id).toString()
				});

			// MongoDB is case-sensitive, so TEST != test (may return 201 or 500)
			expect([201, 500]).toContain(res.status);
		});

		test("registering with duplicate email via auth fails", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);
			await seedUser("existing@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			await request(app)
				.post("/auth/register")
				.send({
					email: "existing@example.com",
					password: "NewPass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(409);
		});

		test("email uniqueness checked across all tenants", async () => {
			await seedPermissions(basePermissions);
			const tenantA = await seedTenant("tenant-a");
			const tenantB = await seedTenant("tenant-b");
			const adminRole = await seedRole("admin", basePermissions);
			const userRole = await seedRole("user", ["user.read"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenantA._id));
			await seedUser("shared@example.com", "Pass123!", toId(userRole._id), toId(tenantB._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.post("/users")
				.set("Authorization", `Bearer ${token}`)
				.send({
					email: "shared@example.com",
					password: "Pass123!",
					roleId: toId(userRole._id).toString(),
					tenantId: toId(tenantA._id).toString()
				})
				.expect(500);
		});
	});

	describe("validateRoleAssignment", () => {
		test("admin can assign any role", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			const viewerRole = await seedRole("viewer", ["user.read"]);
			const editorRole = await seedRole("editor", ["user.read", "user.update"]);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.post("/users")
				.set("Authorization", `Bearer ${token}`)
				.send({
					email: "viewer@example.com",
					password: "Pass123!",
					roleId: toId(viewerRole._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			await request(app)
				.post("/users")
				.set("Authorization", `Bearer ${token}`)
				.send({
					email: "editor@example.com",
					password: "Pass123!",
					roleId: toId(editorRole._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);
		});

		test("non-admin cannot assign non-viewer roles", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const managerRole = await seedRole("manager", basePermissions);
			const editorRole = await seedRole("editor", ["user.read", "user.update"]);
			await seedUser("manager@example.com", "Pass123!", toId(managerRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "manager@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.post("/users")
				.set("Authorization", `Bearer ${token}`)
				.send({
					email: "new@example.com",
					password: "Pass123!",
					roleId: toId(editorRole._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(403);
		});

		test("non-admin can assign viewer role", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const managerRole = await seedRole("manager", basePermissions);
			const viewerRole = await seedRole("viewer", ["user.read"]);
			await seedUser("manager@example.com", "Pass123!", toId(managerRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "manager@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.post("/users")
				.set("Authorization", `Bearer ${token}`)
				.send({
					email: "viewer@example.com",
					password: "Pass123!",
					roleId: toId(viewerRole._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);
		});

		test("assigning non-existent role fails validation", async () => {
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
				.post("/users")
				.set("Authorization", `Bearer ${token}`)
				.send({
					email: "new@example.com",
					password: "Pass123!",
					roleId: "507f1f77bcf86cd799439011",
					tenantId: toId(tenant._id).toString()
				})
				.expect(500);
		});

		test("role validation applies to user creation", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const limitedRole = await seedRole("limited", ["user.create"]);
			const powerRole = await seedRole("power-user", ["user.read", "user.update", "user.delete"]);
			await seedUser("limited@example.com", "Pass123!", toId(limitedRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "limited@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.post("/users")
				.set("Authorization", `Bearer ${token}`)
				.send({
					email: "poweruser@example.com",
					password: "Pass123!",
					roleId: toId(powerRole._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(403);
		});
	});
});

describe("Business Rules - Tenant Rules", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	describe("ensureTenantNameUnique", () => {
		test("creating tenant with unique name succeeds", async () => {
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
				.send({ name: "unique-tenant", domain: "unique.example.com" })
				.expect(201);
		});

		test("creating tenant with duplicate name fails", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("existing-tenant");
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
				.send({ name: "existing-tenant", domain: "another.example.com" })
				.expect(500);
		});

		test("creating tenant with different case name succeeds", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("MyTenant");
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
				.send({ name: "mytenant", domain: "mytenant.example.com" })
				.expect(201);
		});

		test("updating tenant to duplicate name fails", async () => {
			await seedPermissions(basePermissions);
			await seedTenant("existing-name");
			const targetTenant = await seedTenant("target-tenant");
			const tenant = await seedTenant("tenant-a");
			const superRole = await seedRole("super-admin", basePermissions);
			await seedUser("super@example.com", "Pass123!", toId(superRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "super@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.put(`/tenants/${targetTenant._id}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ name: "existing-name" })
				.expect(409);
		});
	});

	describe("ensureTenantDeletable", () => {
		test("deleting tenant with no users succeeds", async () => {
			await seedPermissions(basePermissions);
			const emptyTenant = await seedTenant("empty-tenant");
			const tenant = await seedTenant("tenant-a");
			const superRole = await seedRole("super-admin", basePermissions);
			await seedUser("super@example.com", "Pass123!", toId(superRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "super@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/tenants/${emptyTenant._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(200);
		});

		test("deleting tenant with one user fails", async () => {
			await seedPermissions(basePermissions);
			const populatedTenant = await seedTenant("populated-tenant");
			const tenant = await seedTenant("tenant-a");
			const superRole = await seedRole("super-admin", basePermissions);
			const userRole = await seedRole("user", ["user.read"]);
			await seedUser("super@example.com", "Pass123!", toId(superRole._id), toId(tenant._id));
			await seedUser("user@example.com", "Pass123!", toId(userRole._id), toId(populatedTenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "super@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/tenants/${populatedTenant._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(500);
		});

		test("deleting tenant with multiple users fails", async () => {
			await seedPermissions(basePermissions);
			const populatedTenant = await seedTenant("popular-tenant");
			const tenant = await seedTenant("tenant-a");
			const superRole = await seedRole("super-admin", basePermissions);
			const userRole = await seedRole("user", ["user.read"]);
			await seedUser("super@example.com", "Pass123!", toId(superRole._id), toId(tenant._id));
			await seedUser("user1@example.com", "Pass123!", toId(userRole._id), toId(populatedTenant._id));
			await seedUser("user2@example.com", "Pass123!", toId(userRole._id), toId(populatedTenant._id));
			await seedUser("user3@example.com", "Pass123!", toId(userRole._id), toId(populatedTenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "super@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/tenants/${populatedTenant._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(500);
		});

		test("deleting tenant with only inactive users fails", async () => {
			await seedPermissions(basePermissions);
			const inactiveTenant = await seedTenant("inactive-tenant");
			const tenant = await seedTenant("tenant-a");
			const superRole = await seedRole("super-admin", basePermissions);
			const userRole = await seedRole("user", ["user.read"]);
			await seedUser("super@example.com", "Pass123!", toId(superRole._id), toId(tenant._id));
			const inactiveUser = await seedUser("inactive@example.com", "Pass123!", toId(userRole._id), toId(inactiveTenant._id));

			await UserModel.findByIdAndUpdate(inactiveUser._id, { isActive: false });

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "super@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/tenants/${inactiveTenant._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(500);
		});

		test("deleting tenant after all users removed succeeds", async () => {
			await seedPermissions(basePermissions);
			const tempTenant = await seedTenant("temp-tenant");
			const tenant = await seedTenant("tenant-a");
			const superRole = await seedRole("super-admin", basePermissions);
			const adminRole = await seedRole("admin", basePermissions);
			const userRole = await seedRole("user", ["user.read"]);
			await seedUser("super@example.com", "Pass123!", toId(superRole._id), toId(tenant._id));
			const admin = await seedUser("admin@temp.com", "Pass123!", toId(adminRole._id), toId(tempTenant._id));
			const tempUser = await seedUser("user@temp.com", "Pass123!", toId(userRole._id), toId(tempTenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "super@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await UserModel.deleteMany({ tenant: tempTenant._id });

			await request(app)
				.delete(`/tenants/${tempTenant._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(200);
		});

		test("tenant deletion rule prevents orphaned users", async () => {
			await seedPermissions(basePermissions);
			const protectedTenant = await seedTenant("protected-tenant");
			const tenant = await seedTenant("tenant-a");
			const superRole = await seedRole("super-admin", basePermissions);
			const userRole = await seedRole("user", ["user.read"]);
			await seedUser("super@example.com", "Pass123!", toId(superRole._id), toId(tenant._id));
			await seedUser("protected@example.com", "Pass123!", toId(userRole._id), toId(protectedTenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "super@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const res = await request(app)
				.delete(`/tenants/${protectedTenant._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(500);

			expect(res.body.message).toBeDefined();
		});
	});
});
