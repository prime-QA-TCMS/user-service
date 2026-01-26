import request from "supertest";
import { app, basePermissions, seedPermissions, seedRole, seedTenant, seedUser, toId } from "./setup.js";
import { UserModel } from "../src/models/user.model.js";
import { setupDatabase, teardownDatabase, clearDatabase } from "./setup.js";

describe("User Management", () => {
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
		test("create user with valid data succeeds", async () => {
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

			const res = await request(app)
				.post("/users")
				.set("Authorization", `Bearer ${token}`)
				.send({
					email: "newuser@example.com",
					password: "Pass123!",
					roleId: toId(userRole._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.success).toBe(true);
			expect(res.body.data.email).toBe("newuser@example.com");
		});

		test("list users returns paginated results", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("admin", basePermissions);
			await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));
			await seedUser("user1@example.com", "Pass123!", toId(role._id), toId(tenant._id));
			await seedUser("user2@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const res = await request(app)
				.get("/users?page=1&limit=2")
				.set("Authorization", `Bearer ${token}`)
				.expect(200);

			expect(res.body.data.items.length).toBe(2);
			expect(res.body.data.total).toBe(3);
			expect(res.body.data.page).toBe(1);
			expect(res.body.data.limit).toBe(2);
		});

		test("update user with valid data succeeds", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));
			const targetUser = await seedUser("target@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const res = await request(app)
				.put(`/users/${targetUser._id}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ email: "updated@example.com" })
				.expect(200);

			expect(res.body.data.email).toBe("updated@example.com");
		});

		test("deactivate user sets isActive to false", async () => {
			await seedPermissions(basePermissions);
			const tenant = await seedTenant("tenant-a");
			const adminRole = await seedRole("admin", basePermissions);
			await seedUser("admin@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));
			const targetUser = await seedUser("target@example.com", "Pass123!", toId(adminRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			await request(app)
				.delete(`/users/${targetUser._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(200);

			const updated = await UserModel.findById(targetUser._id);
			expect(updated?.isActive).toBe(false);
		});

		test("get user by id returns 404 for non-existent user", async () => {
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
				.get(`/users/507f1f77bcf86cd799439011`)
				.set("Authorization", `Bearer ${token}`)
				.expect(404);
		});

		test("self GET allowed without user.read, other user denied", async () => {
			await seedPermissions(["user.update"]);
			const tenant = await seedTenant("tenant-a");
			const selfRole = await seedRole("viewer", []);
			const otherRole = await seedRole("admin", ["user.read"]);
			const selfUser = await seedUser("me@example.com", "Pass123!", toId(selfRole._id), toId(tenant._id));
			const otherUser = await seedUser("other@example.com", "Pass123!", toId(otherRole._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "me@example.com", password: "Pass123!" })
				.expect(200);
			const token = login.body.data.accessToken as string;

			const selfRes = await request(app)
				.get(`/users/${selfUser._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(200);
			expect(selfRes.body.success).toBe(true);

			await request(app)
				.get(`/users/${otherUser._id}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(403);
		});
	});
});
