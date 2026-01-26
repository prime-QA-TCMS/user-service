import { RoleModel } from "../models/role.model.js";
import { UserModel } from "../models/user.model.js";
const PROTECTED_ROLES = ["super-admin", "admin"];
export const ensureRoleNameUnique = async (name, tenantId) => {
    const existing = await RoleModel.findOne({ name, tenant: tenantId, isDeleted: false });
    if (existing)
        throw new Error("Role name must be unique per tenant");
};
export const ensureProtectedRoleName = async (roleId) => {
    const role = await RoleModel.findById(roleId);
    if (role && PROTECTED_ROLES.includes(role.name)) {
        throw new Error("Cannot modify protected role");
    }
};
export const ensureRoleDeletable = async (roleId) => {
    await ensureProtectedRoleName(roleId);
    const count = await UserModel.countDocuments({ role: roleId });
    if (count > 0)
        throw new Error("Cannot delete role in use by users");
};
