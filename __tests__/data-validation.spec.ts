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

describe("Data Validation - Email Field", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	describe("Positive Email Validation", () => {
		test("accepts standard email format", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user@example.com",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user@example.com");
		});

		test("accepts email with subdomain", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user@mail.example.com",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user@mail.example.com");
		});

		test("accepts email with plus sign", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user+tag@example.com",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user+tag@example.com");
		});

		test("accepts email with dots in local part", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "first.last@example.com",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("first.last@example.com");
		});

		test("accepts email with numbers", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user123@example456.com",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user123@example456.com");
		});

		test("accepts email with hyphen in domain", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user@my-company.com",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user@my-company.com");
		});
	});

	describe("Negative Email Validation", () => {
		test("rejects missing email", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			await request(app)
				.post("/auth/register")
				.send({
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(400);
		});

		test("rejects empty string email", async () => {
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

		test("rejects null email", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			await request(app)
				.post("/auth/register")
				.send({
					email: null,
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(400);
		});

		test("accepts email without @ symbol (validation gap)", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "notanemail",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("notanemail");
		});

		test("accepts email without domain (validation gap)", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user@",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user@");
		});

		test("accepts email without local part (validation gap)", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "@example.com",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("@example.com");
		});

		test("accepts whitespace-only email (validation gap)", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			await request(app)
				.post("/auth/register")
				.send({
					email: "   ",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(500);
		});

		test("accepts extremely long email (validation gap)", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const longEmail = "a".repeat(250) + "@example.com";

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

		test("accepts email with multiple @ symbols (validation gap)", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user@@example.com",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user@@example.com");
		});

		test("accepts email with special characters (validation gap)", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user!#$%&*@example.com",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user!#$%&*@example.com");
		});
	});
});

describe("Data Validation - Password Field", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	describe("Positive Password Validation", () => {
		test("accepts password with minimum requirements", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user@example.com",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user@example.com");
		});

		test("accepts long password", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user@example.com",
					password: "VeryLongPassword123!WithLotsOfCharacters",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user@example.com");
		});

		test("accepts password with special characters", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user@example.com",
					password: "P@ssw0rd!#$%^&*()",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user@example.com");
		});

		test("accepts password with unicode characters", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user@example.com",
					password: "Pássw0rd!日本語",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user@example.com");
		});
	});

	describe("Negative Password Validation", () => {
		test("rejects missing password", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			await request(app)
				.post("/auth/register")
				.send({
					email: "user@example.com",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(400);
		});

		test("rejects empty string password", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			await request(app)
				.post("/auth/register")
				.send({
					email: "user@example.com",
					password: "",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(400);
		});

		test("rejects null password", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			await request(app)
				.post("/auth/register")
				.send({
					email: "user@example.com",
					password: null,
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(400);
		});

		test("accepts very short password (validation gap)", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user@example.com",
					password: "1",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user@example.com");
		});

		test("accepts whitespace-only password (validation gap)", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user@example.com",
					password: "        ",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user@example.com");
		});

		test("accepts extremely long password (validation gap)", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const longPassword = "P@ssw0rd" + "a".repeat(10000);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "user@example.com",
					password: longPassword,
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.data.email).toBe("user@example.com");
		});
	});
});

describe("Data Validation - Role Name Field", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	describe("Positive Role Name Validation", () => {
		test("accepts standard role name", async () => {
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
				.send({ name: "editor", description: "Editor role" })
				.expect(201);

			expect(res.body.data.name).toBe("editor");
		});

		test("accepts role name with hyphens", async () => {
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
				.send({ name: "content-editor", description: "Content Editor" })
				.expect(201);

			expect(res.body.data.name).toBe("content-editor");
		});

		test("accepts role name with underscores", async () => {
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
				.send({ name: "content_editor", description: "Content Editor" })
				.expect(201);

			expect(res.body.data.name).toBe("content_editor");
		});

		test("accepts role name with numbers", async () => {
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
				.send({ name: "level2-editor", description: "Level 2 Editor" })
				.expect(201);

			expect(res.body.data.name).toBe("level2-editor");
		});

		test("accepts uppercase role names", async () => {
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
				.send({ name: "EDITOR", description: "Editor Role" })
				.expect(201);

			expect(res.body.data.name).toBe("EDITOR");
		});

		test("accepts mixed case role names", async () => {
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
				.send({ name: "ContentEditor", description: "Content Editor" })
				.expect(201);

			expect(res.body.data.name).toBe("ContentEditor");
		});
	});

	describe("Negative Role Name Validation", () => {
		test("rejects missing role name", async () => {
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
				.send({ description: "No name" })
				.expect(400);
		});

		test("rejects empty string role name", async () => {
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

		test("rejects null role name", async () => {
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
				.send({ name: null, description: "Null name" })
				.expect(400);
		});

		test("accepts whitespace-only role name (validation gap)", async () => {
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
				.send({ name: "     ", description: "Whitespace name" })
				.expect(201);

			expect(res.body.data.name).toBe("     ");
		});

		test("accepts extremely long role name (validation gap)", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("admin", basePermissions);
			await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const longName = "role-" + "a".repeat(500);

			const res = await request(app)
				.post("/roles")
				.set("Authorization", `Bearer ${token}`)
				.send({ name: longName, description: "Long name" })
				.expect(201);

			expect(res.body.data.name).toBe(longName);
		});

		test("accepts role name with special characters (validation gap)", async () => {
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
				.send({ name: "role!@#$%", description: "Special chars" })
				.expect(201);

			expect(res.body.data.name).toBe("role!@#$%");
		});

		test("accepts role name with unicode characters (validation gap)", async () => {
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
				.send({ name: "rôle-日本語", description: "Unicode name" })
				.expect(201);

			expect(res.body.data.name).toBe("rôle-日本語");
		});
	});
});

describe("Data Validation - Tenant Name Field", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	describe("Positive Tenant Name Validation", () => {
		test("accepts standard tenant name", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("super-admin", basePermissions);
			await seedUser("super@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "super@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const res = await request(app)
				.post("/tenants")
				.set("Authorization", `Bearer ${token}`)
				.send({ name: "acme-corp", domain: "acme.example.com" })
				.expect(201);

			expect(res.body.data.name).toBe("acme-corp");
		});

		test("accepts tenant name with hyphens", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("super-admin", basePermissions);
			await seedUser("super@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "super@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const res = await request(app)
				.post("/tenants")
				.set("Authorization", `Bearer ${token}`)
				.send({ name: "acme-corp-inc", domain: "acme.example.com" })
				.expect(201);

			expect(res.body.data.name).toBe("acme-corp-inc");
		});

		test("accepts tenant name with underscores", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("super-admin", basePermissions);
			await seedUser("super@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "super@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const res = await request(app)
				.post("/tenants")
				.set("Authorization", `Bearer ${token}`)
				.send({ name: "acme_corp", domain: "acme.example.com" })
				.expect(201);

			expect(res.body.data.name).toBe("acme_corp");
		});

		test("accepts tenant name with numbers", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("super-admin", basePermissions);
			await seedUser("super@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "super@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const res = await request(app)
				.post("/tenants")
				.set("Authorization", `Bearer ${token}`)
				.send({ name: "acme2024", domain: "acme.example.com" })
				.expect(201);

			expect(res.body.data.name).toBe("acme2024");
		});
	});

	describe("Negative Tenant Name Validation", () => {
		test("rejects missing tenant name", async () => {
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
				.send({ domain: "example.com" })
				.expect(400);
		});

		test("rejects empty string tenant name", async () => {
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
				.send({ name: "", domain: "example.com" })
				.expect(400);
		});

		test("rejects null tenant name", async () => {
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
				.send({ name: null, domain: "example.com" })
				.expect(400);
		});

		test("accepts whitespace-only tenant name (validation gap)", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("super-admin", basePermissions);
			await seedUser("super@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "super@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const res = await request(app)
				.post("/tenants")
				.set("Authorization", `Bearer ${token}`)
				.send({ name: "     ", domain: "example.com" })
				.expect(201);

			expect(res.body.data.name).toBe("     ");
		});

		test("accepts extremely long tenant name (validation gap)", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("super-admin", basePermissions);
			await seedUser("super@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "super@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const longName = "tenant-" + "a".repeat(500);

			const res = await request(app)
				.post("/tenants")
				.set("Authorization", `Bearer ${token}`)
				.send({ name: longName, domain: "example.com" })
				.expect(201);

			expect(res.body.data.name).toBe(longName);
		});
	});
});

describe("Data Validation - ObjectId Fields", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	describe("Positive ObjectId Validation", () => {
		test("accepts valid 24-character hex ObjectId", async () => {
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
				.get(`/roles/${toId(role._id).toString()}`)
				.set("Authorization", `Bearer ${token}`);

			expect([200, 404]).toContain(res.status);
		});
	});

	describe("Negative ObjectId Validation", () => {
		test("returns 500 for invalid ObjectId format", async () => {
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
				.get("/roles/invalid-id")
				.set("Authorization", `Bearer ${token}`);

			expect([404, 500]).toContain(res.status);
		});

		test("returns 500 for too short ObjectId", async () => {
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
				.get("/roles/12345")
				.set("Authorization", `Bearer ${token}`);

			expect([404, 500]).toContain(res.status);
		});

		test("returns 500 for ObjectId with non-hex characters", async () => {
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
				.get("/roles/507f1f77bcf86cd79943zzzz")
				.set("Authorization", `Bearer ${token}`);

			expect([404, 500]).toContain(res.status);
		});

		test("returns 404 for valid but non-existent ObjectId", async () => {
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
				.get("/roles/507f1f77bcf86cd799439011")
				.set("Authorization", `Bearer ${token}`)
				.expect(404);
		});
	});
});

describe("Data Validation - Type Coercion", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("coerces number to string for email", async () => {
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

	test("coerces boolean to string for email", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);

		const res = await request(app)
			.post("/auth/register")
			.send({
				email: true,
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString()
			})
			.expect(201);

		expect(res.body.data.email).toBe("true");
	});

	test("rejects array for string field", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);

		await request(app)
			.post("/auth/register")
			.send({
				email: ["user@example.com"],
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString()
			})
			.expect(500);
	});

	test("rejects object for string field", async () => {
		await seedPermissions();
		const tenant = await seedTenant("tenant-a");
		const role = await seedRole("user", ["user.read"]);

		await request(app)
			.post("/auth/register")
			.send({
				email: { value: "user@example.com" },
				password: "Pass123!",
				roleId: toId(role._id).toString(),
				tenantId: toId(tenant._id).toString()
			})
			.expect(500);
	});
});

describe("Data Validation - Boundary Values", () => {
	beforeAll(async () => await setupDatabase());
	afterAll(async () => await teardownDatabase());
	afterEach(async () => await clearDatabase());

	test("handles pagination with page=0", async () => {
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
			.get("/users?page=0&limit=10")
			.set("Authorization", `Bearer ${token}`)
			.expect([200, 500]);

		if (res.status === 200) {
			expect(res.body.data.page).toBe(0);
		}
	});

	test("handles pagination with limit=1", async () => {
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
			.get("/users?page=1&limit=1")
			.set("Authorization", `Bearer ${token}`)
			.expect(200);

		expect(res.body.data.limit).toBe(1);
	});

	test("handles pagination with very large limit", async () => {
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
			.get("/users?page=1&limit=10000")
			.set("Authorization", `Bearer ${token}`)
			.expect(200);

		expect(res.body.data.limit).toBe(10000);
	});

	test("handles pagination with negative page (causes error)", async () => {
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

	test("handles pagination with negative limit", async () => {
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
			.get("/users?page=1&limit=-10")
			.set("Authorization", `Bearer ${token}`)
			.expect([200, 500]);
	});
});

