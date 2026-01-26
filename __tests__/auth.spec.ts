import request from "supertest";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { app, basePermissions, seedPermissions, seedRole, seedTenant, seedUser, toId } from "./setup.js";
import { config } from "../src/config/index.js";
import { UserModel } from "../src/models/user.model.js";
import { RefreshTokenModel } from "../src/models/refreshToken.model.js";
import { setupDatabase, teardownDatabase, clearDatabase } from "./setup.js";

describe("Authentication", () => {
	beforeAll(async () => {
		await setupDatabase();
	});

	afterAll(async () => {
		await teardownDatabase();
	});

	afterEach(async () => {
		await clearDatabase();
	});

	describe("Registration", () => {
		test("register fails without required fields", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			// Missing password
			await request(app)
				.post("/auth/register")
				.send({ email: "new@example.com", roleId: role._id })
				.expect(400);

			// Missing email
			await request(app)
				.post("/auth/register")
				.send({ password: "Pass123!", roleId: role._id })
				.expect(400);

			// Missing roleId
			await request(app)
				.post("/auth/register")
				.send({ email: "new@example.com", password: "Pass123!" })
				.expect(400);
		});

		test("register creates user with valid data", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);

			const res = await request(app)
				.post("/auth/register")
				.send({
					email: "new@example.com",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(201);

			expect(res.body.success).toBe(true);
			expect(res.body.data.email).toBe("new@example.com");
		});

		test("register rejects duplicate email", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);
			await seedUser("existing@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			await request(app)
				.post("/auth/register")
				.send({
					email: "existing@example.com",
					password: "Pass123!",
					roleId: toId(role._id).toString(),
					tenantId: toId(tenant._id).toString()
				})
				.expect(409);
		});
	});

	describe("Login", () => {
		test("login fails with missing email", async () => {
			await request(app)
				.post("/auth/login")
				.send({ password: "Pass123!" })
				.expect(400);
		});

		test("login fails with missing password", async () => {
			await request(app)
				.post("/auth/login")
				.send({ email: "user@example.com" })
				.expect(400);
		});

		test("login fails for non-existent user", async () => {
			await request(app)
				.post("/auth/login")
				.send({ email: "ghost@example.com", password: "Pass123!" })
				.expect(401);
		});

		test("login fails for inactive user", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);
			const user = await seedUser("inactive@example.com", "Pass123!", toId(role._id), toId(tenant._id));
			await UserModel.findByIdAndUpdate(user._id, { isActive: false });

			await request(app)
				.post("/auth/login")
				.send({ email: "inactive@example.com", password: "Pass123!" })
				.expect(401);
		});

		test("login updates lastLogin timestamp", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);
			const user = await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			await request(app)
				.post("/auth/login")
				.send({ email: "user@example.com", password: "Pass123!" })
				.expect(200);

			const updated = await UserModel.findById(user._id);
			expect(updated?.lastLogin).toBeInstanceOf(Date);
		});

		test("login succeeds and returns JWT with required claims", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("admin", basePermissions);
			await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const res = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);

			expect(res.body.success).toBe(true);
			expect(res.body.data.accessToken).toBeDefined();
			const payload = jwt.verify(res.body.data.accessToken, config.jwtSecret as string) as any;
			expect(payload.userId).toBeDefined();
			expect(payload.tenantId).toBe(toId(tenant._id).toString());
			expect(payload.role).toBe("admin");
			expect(payload.permissions).toContain("user.read");
		});

		test("login fails with invalid password", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("admin", basePermissions);
			await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const res = await request(app)
				.post("/auth/login")
				.send({ email: "user@example.com", password: "wrong" })
				.expect(401);

			expect(res.body.success).toBe(false);
			expect(res.body.code).toBe("UNAUTHORIZED");
		});
	});

	describe("Refresh Token", () => {
		test("refresh fails with missing token", async () => {
			await request(app)
				.post("/auth/refresh")
				.send({})
				.expect(400);
		});

		test("refresh fails with invalid token", async () => {
			await request(app)
				.post("/auth/refresh")
				.send({ refreshToken: "invalid-token-xyz" })
				.expect(401);
		});

		test("refresh fails with revoked token", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);
			await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "user@example.com", password: "Pass123!" })
				.expect(200);

			const refreshToken = login.body.data.refreshToken as string;

			// Revoke it
			await request(app)
				.post("/auth/logout")
				.send({ refreshToken })
				.expect(200);

			// Try to use it
			await request(app)
				.post("/auth/refresh")
				.send({ refreshToken })
				.expect(401);
		});

		test("refresh fails with expired token", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("user", ["user.read"]);
			const user = await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			// Create expired refresh token
			const token = crypto.randomUUID();
			const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
			await RefreshTokenModel.create({
				user: user._id,
				tenant: tenant._id,
				tokenHash,
				jti: crypto.randomUUID(),
				expiresAt: new Date(Date.now() - 1000) // expired
			});

			await request(app)
				.post("/auth/refresh")
				.send({ refreshToken: token })
				.expect(401);
		});

		test("refresh returns new JWT with same claims", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("admin", basePermissions);
			await seedUser("admin@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "admin@example.com", password: "Pass123!" })
				.expect(200);

			const oldToken = login.body.data.accessToken as string;
			const oldPayload = jwt.verify(oldToken, config.jwtSecret as string) as any;

			const refresh = await request(app)
				.post("/auth/refresh")
				.send({ refreshToken: login.body.data.refreshToken })
				.expect(200);

			const newToken = refresh.body.data.accessToken as string;
			const newPayload = jwt.verify(newToken, config.jwtSecret as string) as any;

			expect(newPayload.sub).toBe(oldPayload.sub);
			expect(newPayload.tenantId).toBe(oldPayload.tenantId);
			expect(newPayload.role).toBe(oldPayload.role);
			expect(newPayload.permissions).toEqual(oldPayload.permissions);
		});

		test("refresh rotates token and revokes old", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("admin", basePermissions);
			await seedUser("user@example.com", "Pass123!", toId(role._id), toId(tenant._id));

			const login = await request(app)
				.post("/auth/login")
				.send({ email: "user@example.com", password: "Pass123!" })
				.expect(200);

			const oldRefresh = login.body.data.refreshToken as string;

			const refreshRes = await request(app)
				.post("/auth/refresh")
				.send({ refreshToken: oldRefresh })
				.expect(200);

			const newRefresh = refreshRes.body.data.refreshToken as string;
			expect(newRefresh).toBeDefined();
			expect(newRefresh).not.toBe(oldRefresh);

			const oldHash = crypto.createHash("sha256").update(oldRefresh).digest("hex");
			const newHash = crypto.createHash("sha256").update(newRefresh).digest("hex");
			const oldRecord = await RefreshTokenModel.findOne({ tokenHash: oldHash });
			const newRecord = await RefreshTokenModel.findOne({ tokenHash: newHash });
			expect(oldRecord?.revokedAt).toBeInstanceOf(Date);
			expect(newRecord).toBeTruthy();
		});
	});

	describe("Logout", () => {
		test("logout fails with missing token", async () => {
			await request(app)
				.post("/auth/logout")
				.send({})
				.expect(400);
		});

		test("logout succeeds with invalid token (idempotent)", async () => {
			await request(app)
				.post("/auth/logout")
				.send({ refreshToken: "invalid-token" })
				.expect(200);
		});

		test("logout prevents subsequent refresh", async () => {
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

		test("logout revokes refresh token", async () => {
			await seedPermissions();
			const tenant = await seedTenant("tenant-a");
			const role = await seedRole("admin", basePermissions);
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

			const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
			const record = await RefreshTokenModel.findOne({ tokenHash: hash });
			expect(record?.revokedAt).toBeInstanceOf(Date);
		});
	});
});
