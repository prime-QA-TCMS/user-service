import { RoleModel } from "../models/role.model.js";
import { PermissionModel } from "../models/permission.model.js";
import { ensureRoleNameUnique, ensureRoleDeletable, ensureProtectedRoleName } from "../rules/role.rules.js";
import { config } from "../config/index.js";

export const listRoles = async (tenantId: string, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const baseFilter: any = { isDeleted: { $ne: true } };
    const filter: any = config.includeLegacyRoles
        ? { ...baseFilter, $or: [{ tenant: tenantId }, { tenant: { $exists: false } }] }
        : { ...baseFilter, tenant: tenantId };

    const [items, total] = await Promise.all([
        RoleModel.find(filter).populate("permissions").skip(skip).limit(limit),
        RoleModel.countDocuments(filter)
    ]);
    return { items, total, page, limit };
};

export const createRole = async (tenantId: string, name: string, description: string | undefined, permissionCodes: string[]) => {
    await ensureRoleNameUnique(name, tenantId);
    const perms = await PermissionModel.find({ code: { $in: permissionCodes } });
    const role = await RoleModel.create({ name, description, permissions: perms.map(p => p._id), tenant: tenantId });
    return role;
};

export const updateRole = async (id: string, tenantId: string, payload: { description?: string; permissions?: string[] }) => {
    await ensureProtectedRoleName(id);
    if ((payload as any).name) {
        await ensureRoleNameUnique((payload as any).name, tenantId);
    }
    let update: any = { ...payload };
    if (payload.permissions) {
        const perms = await PermissionModel.find({ code: { $in: payload.permissions } });
        update.permissions = perms.map(p => p._id);
    }
    const role = await RoleModel.findOneAndUpdate({ _id: id, tenant: tenantId, isDeleted: false }, update, { new: true });
    if (!role) throw new Error("Role not found");
    return role;
};

export const deleteRole = async (id: string, tenantId: string) => {
    await ensureRoleDeletable(id);
    const result = await RoleModel.findOneAndUpdate({ _id: id, tenant: tenantId, isDeleted: false }, { isDeleted: true });
    if (!result) throw new Error("Role not found");
};
