import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { config } from "../src/config/index.js";
import { PermissionModel } from "../src/models/permission.model.js";
import { RoleModel } from "../src/models/role.model.js";
import { TenantModel } from "../src/models/tenant.model.js";
import { UserModel } from "../src/models/user.model.js";
import { RefreshTokenModel } from "../src/models/refreshToken.model.js";

export const app = createApp();

export let mongo: MongoMemoryServer;

export const toId = (id: any) => id as mongoose.Types.ObjectId;

export const basePermissions = [
	"user.create",
	"user.read",
	"user.update",
	"user.delete",
	"role.read",
	"role.create",
	"role.update",
	"role.delete",
	"tenant.read",
	"tenant.create",
	"tenant.update",
	"tenant.delete"
];

export async function seedPermissions(codes: string[] = basePermissions) {
	const docs = codes.map(code => ({ code, description: code }));
	return PermissionModel.insertMany(docs);
}

export async function seedRole(name: string, permissionCodes: string[], tenantId?: mongoose.Types.ObjectId) {
	const perms = await PermissionModel.find({ code: { $in: permissionCodes } });

	let resolvedTenant = tenantId;
	if (!resolvedTenant) {
		const existingTenant = await TenantModel.findOne();
		resolvedTenant = (existingTenant?._id as mongoose.Types.ObjectId) || undefined;
		if (!resolvedTenant) {
			const t = await TenantModel.create({ name: "default-seed-tenant", domain: "default.example.com", isActive: true });
			resolvedTenant = t._id as mongoose.Types.ObjectId;
		}
	}

	return RoleModel.create({ name, permissions: perms.map(p => p._id), tenant: resolvedTenant });
}

export async function seedTenant(name: string) {
	return TenantModel.create({ name, domain: `${name}.example.com`, isActive: true });
}

export async function seedUser(
	email: string,
	password: string,
	roleId: mongoose.Types.ObjectId,
	tenantId?: mongoose.Types.ObjectId
) {
	const passwordHash = await bcrypt.hash(password, 10);
	let resolvedTenant = tenantId;
	const role = await RoleModel.findById(roleId);

	if (!resolvedTenant) {
		resolvedTenant = (role?.tenant as mongoose.Types.ObjectId) || undefined;
	}
	if (!resolvedTenant) {
		const existingTenant = await TenantModel.findOne();
		resolvedTenant = (existingTenant?._id as mongoose.Types.ObjectId) || undefined;
	}
	if (!resolvedTenant) {
		const t = await TenantModel.create({ name: "default-seed-tenant", domain: "default.example.com", isActive: true });
		resolvedTenant = t._id as mongoose.Types.ObjectId;
	}

	// Keep role and user tenant aligned to avoid auth failures in tests
	if (role && role.tenant?.toString() !== resolvedTenant.toString()) {
		role.tenant = resolvedTenant;
		await role.save();
	}

	return UserModel.create({ email, passwordHash, role: roleId, tenant: resolvedTenant, isActive: true });
}

export async function setupDatabase() {
	process.env.JWT_SECRET = "test-secret";
	process.env.ALLOW_TEST_REGISTER = "true";
	mongo = await MongoMemoryServer.create();
	await mongoose.connect(mongo.getUri());
}

export async function teardownDatabase() {
	await mongoose.disconnect();
	if (mongo) await mongo.stop();
}

export async function clearDatabase() {
	await Promise.all([
		PermissionModel.deleteMany({}),
		RoleModel.deleteMany({}),
		UserModel.deleteMany({}),
		TenantModel.deleteMany({}),
		RefreshTokenModel.deleteMany({})
	]);
}
