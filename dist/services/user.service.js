import bcrypt from "bcryptjs";
import { UserModel } from "../models/user.model.js";
import { ensureUniqueEmail, validateRoleAssignment } from "../rules/user.rules.js";
export const listUsers = async (tenantId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        UserModel.find({ tenant: tenantId })
            .select("-passwordHash")
            .skip(skip)
            .limit(limit),
        UserModel.countDocuments({ tenant: tenantId })
    ]);
    return { items, total, page, limit };
};
export const getUser = (id, tenantId, requesterId) => UserModel.findOne({ _id: id, tenant: tenantId }).select(requesterId === id ? "-passwordHash" : "-passwordHash");
export const createUser = async (data) => {
    if (!data.tenantId) {
        throw new Error("Tenant context is required");
    }
    await ensureUniqueEmail(data.email);
    await validateRoleAssignment(data.roleId, data.actorRole, data.tenantId);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await UserModel.create({
        email: data.email,
        passwordHash,
        role: data.roleId,
        tenant: data.tenantId
    });
    return user;
};
export const updateUser = async (userId, payload, options) => {
    if (payload.password) {
        payload.passwordHash = await bcrypt.hash(payload.password, 10);
        delete payload.password;
    }
    // Never allow tenant changes
    delete payload.tenant;
    delete payload.tenantId;
    if (!options.allowRoleChange) {
        delete payload.role;
        delete payload.roleId;
    }
    const query = { _id: userId };
    if (options.tenantId) {
        query.tenant = options.tenantId;
    }
    const user = await UserModel.findOneAndUpdate(query, payload, { new: true });
    if (!user)
        throw new Error("User not found");
    return user;
};
export const deactivateUser = async (userId, tenantId) => {
    const user = await UserModel.findOneAndUpdate({ _id: userId, tenant: tenantId }, { isActive: false }, { new: true });
    if (!user)
        throw new Error("User not found");
    return user;
};
