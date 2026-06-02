/**
 * Database Seeding Script
 * Creates initial roles, permissions, and admin user
 * Run with: node seed-db.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from './dist/config/index.js';
import { RoleModel } from './dist/models/role.model.js';
import { UserModel } from './dist/models/user.model.js';
import { PermissionModel } from './dist/models/permission.model.js';
import { TenantModel } from './dist/models/tenant.model.js';

const permissions = [
	{ code: 'user.create', description: 'Create users' },
	{ code: 'user.read', description: 'Read user data' },
	{ code: 'user.update', description: 'Update users' },
	{ code: 'user.delete', description: 'Delete users' },
	{ code: 'role.create', description: 'Create roles' },
	{ code: 'role.read', description: 'Read role data' },
	{ code: 'role.update', description: 'Update roles' },
	{ code: 'role.delete', description: 'Delete roles' },
	{ code: 'tenant.create', description: 'Create tenants' },
	{ code: 'tenant.read', description: 'Read tenant data' },
	{ code: 'tenant.update', description: 'Update tenants' },
	{ code: 'tenant.delete', description: 'Delete tenants' },
	{ code: 'project.create', description: 'Create projects' },
	{ code: 'project.read', description: 'Read project data' },
	{ code: 'project.update', description: 'Update projects' },
	{ code: 'project.delete', description: 'Delete projects' },
	{ code: 'testcase.create', description: 'Create test cases' },
	{ code: 'testcase.read', description: 'Read test cases' },
	{ code: 'testcase.update', description: 'Update test cases' },
	{ code: 'testcase.delete', description: 'Delete test cases' },
	{ code: 'test.execute', description: 'Execute tests' },
	// Configuration Service permissions
	{ code: 'environment.create', description: 'Create environments' },
	{ code: 'environment.read', description: 'Read environments' },
	{ code: 'environment.update', description: 'Update environments' },
	{ code: 'environment.delete', description: 'Delete environments' },
	{ code: 'integration.create', description: 'Create integrations' },
	{ code: 'integration.read', description: 'Read integrations' },
	{ code: 'integration.update', description: 'Update integrations' },
	{ code: 'integration.delete', description: 'Delete integrations' },
	{ code: 'parameter.create', description: 'Create parameters' },
	{ code: 'parameter.read', description: 'Read parameters' },
	{ code: 'parameter.update', description: 'Update parameters' },
	{ code: 'parameter.delete', description: 'Delete parameters' },
];

const roles = [
	{
		name: 'super-admin',
		description: 'Platform super admin with full access',
		permissionCodes: permissions.map(p => p.code),
	},
	{
		name: 'admin',
		description: 'Tenant admin with user management access',
		permissionCodes: [
			'user.read', 'user.create', 'user.update', 'user.delete',
			'role.read',
		],
	},
	{
		name: 'project-owner',
		description: 'Project owner with read access to users and roles',
		permissionCodes: ['user.read', 'role.read'],
	},
	{
		name: 'contributor',
		description: 'Contributor with limited role visibility',
		permissionCodes: ['role.read'],
	},
	{
		name: 'viewer',
		description: 'Read-only access',
		permissionCodes: ['role.read'],
	},
];

async function seedDatabase() {
	try {
		console.log('🔗 Connecting to database...');
		await mongoose.connect(config.mongoUri);
		console.log('✅ Connected to database');

		// Clear existing data
		console.log('\n🧹 Clearing existing data...');
		await PermissionModel.deleteMany({});
		await RoleModel.deleteMany({});
		await UserModel.deleteMany({});
		await TenantModel.deleteMany({});
		console.log('✅ Existing data cleared');

		// Create default tenant (optional)
		console.log('\n🏢 Creating default tenant...');
		const defaultTenant = await TenantModel.create({
			name: 'Default Tenant',
			domain: 'default.tcms.local',
			isActive: true,
		});
		console.log(`✅ Created tenant: ${defaultTenant.name}`);

		// Create permissions
		console.log('\n📝 Creating permissions...');
		const createdPermissions = await PermissionModel.insertMany(permissions);
		console.log(`✅ Created ${createdPermissions.length} permissions`);

		// Create roles (tenant-scoped)
		console.log('\n👥 Creating roles...');
		const createdRoles = [];
		for (const roleData of roles) {
			// Normalize permission codes to uppercase for matching (schema stores uppercase)
			const normalizedCodes = roleData.permissionCodes.map(code => code.toUpperCase());
			const rolePermissions = createdPermissions.filter(p =>
				normalizedCodes.includes(p.code)
			);

			const role = await RoleModel.create({
				name: roleData.name,
				description: roleData.description,
				permissions: rolePermissions.map(p => p._id),
				tenant: defaultTenant._id,
			});

			createdRoles.push(role);
			console.log(`  ✓ Created role: ${role.name} (${rolePermissions.length} permissions)`);
		}

		// Create admin user
		console.log('\n👤 Creating admin user...');
		const adminRole = createdRoles.find(r => r.name === 'admin');
		const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
		const adminEmail = process.env.ADMIN_EMAIL || 'admin@tcms.local';

		const passwordHash = await bcrypt.hash(adminPassword, 10);
		const adminUser = await UserModel.create({
			email: adminEmail,
			passwordHash,
			role: adminRole._id,
			tenant: defaultTenant._id,
			isActive: true,
		});

		console.log(`✅ Created admin user: ${adminUser.email}`);
		console.log(`   Password: ${adminPassword}`);

		// Create a test user
		console.log('\n👤 Creating test user...');
		const testerRole = createdRoles.find(r => r.name === 'viewer') || createdRoles[0];
		const testPassword = 'Test123!@#';
		const testEmail = 'testuser@example.com';

		const testPasswordHash = await bcrypt.hash(testPassword, 10);
		const testUser = await UserModel.create({
			email: testEmail,
			passwordHash: testPasswordHash,
			role: testerRole._id,
			tenant: defaultTenant._id,
			isActive: true,
		});

		console.log(`✅ Created test user: ${testUser.email}`);
		console.log(`   Password: ${testPassword}`);

		// Summary
		console.log('\n╔════════════════════════════════════════╗');
		console.log('║     Database Seeding Complete!        ║');
		console.log('╚════════════════════════════════════════╝\n');
		console.log('📊 Summary:');
		console.log(`   Permissions: ${createdPermissions.length}`);
		console.log(`   Roles: ${createdRoles.length}`);
		console.log(`   Tenants: 1`);
		console.log(`   Users: 2`);
		console.log('\n🔑 Login Credentials:');
		console.log(`   Admin: ${adminEmail} / ${adminPassword}`);
		console.log(`   Test User: ${testEmail} / ${testPassword}`);
		console.log('\n✨ You can now test the API!');

	} catch (error) {
		console.error('❌ Error seeding database:', error);
		process.exit(1);
	} finally {
		await mongoose.connection.close();
		console.log('\n🔒 Database connection closed');
		process.exit(0);
	}
}

seedDatabase();
