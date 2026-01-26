import { RoleModel } from "../models/role.model.js";
import { PermissionModel } from "../models/permission.model.js";
import { ensureRoleNameUnique, ensureRoleDeletable, ensureProtectedRoleName } from "../rules/role.rules.js";
import { config } from "../config/index.js";
export const listRoles = async (tenantId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const baseFilter = { isDeleted: { $ne: true } };
    const filter = config.includeLegacyRoles
        ? { ...baseFilter, $or: [{ tenant: tenantId }, { tenant: { $exists: false } }] }
        : { ...baseFilter, tenant: tenantId };
    const [items, total] = await Promise.all([
        RoleModel.find(filter).populate("permissions").skip(skip).limit(limit),
        RoleModel.countDocuments(filter)
    ]);
    return { items, total, page, limit };
};
export const createRole = async (tenantId, name, description, permissionCodes) => {
    await ensureRoleNameUnique(name, tenantId);
    const perms = await PermissionModel.find({ code: { $in: permissionCodes } });
    const role = await RoleModel.create({ name, description, permissions: perms.map(p => p._id), tenant: tenantId });
    return role;
};
export const updateRole = async (id, tenantId, payload) => {
    await ensureProtectedRoleName(id);
    if (payload.name) {
        await ensureRoleNameUnique(payload.name, tenantId);
    }
    let update = { ...payload };
    if (payload.permissions) {
        const perms = await PermissionModel.find({ code: { $in: payload.permissions } });
        update.permissions = perms.map(p => p._id);
    }
    const role = await RoleModel.findOneAndUpdate({ _id: id, tenant: tenantId, isDeleted: false }, update, { new: true });
    if (!role)
        throw new Error("Role not found");
    return role;
};
export const deleteRole = async (id, tenantId) => {
    await ensureRoleDeletable(id);
    const result = await RoleModel.findOneAndUpdate({ _id: id, tenant: tenantId, isDeleted: false }, { isDeleted: true });
    if (!result)
        throw new Error("Role not found");
};
