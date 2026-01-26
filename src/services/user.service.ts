import bcrypt from "bcryptjs";
import { UserModel, type IUser } from "../models/user.model.js";
import { ensureUniqueEmail, validateRoleAssignment } from "../rules/user.rules.js";

export const listUsers = async (tenantId: string, page = 1, limit = 20) => {
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

export const getUser = (id: string, tenantId: string, requesterId?: string) =>
    UserModel.findOne({ _id: id, tenant: tenantId }).select(requesterId === id ? "-passwordHash" : "-passwordHash");

export const createUser = async (data: {
    email: string;
    password: string;
    roleId: string;
    tenantId: string;
    actorRole: string;
}): Promise<IUser> => {
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

export const updateUser = async (
    userId: string,
    payload: Partial<IUser>,
    options: { tenantId?: string; actorId?: string; allowRoleChange: boolean }
) => {
    if ((payload as any).password) {
        (payload as any).passwordHash = await bcrypt.hash((payload as any).password, 10);
        delete (payload as any).password;
    }

    // Never allow tenant changes
    delete (payload as any).tenant;
    delete (payload as any).tenantId;

    if (!options.allowRoleChange) {
        delete (payload as any).role;
        delete (payload as any).roleId;
    }

    const query: any = { _id: userId };
    if (options.tenantId) {
        query.tenant = options.tenantId;
    }

    const user = await UserModel.findOneAndUpdate(query, payload, { new: true });
    if (!user) throw new Error("User not found");
    return user;
};

export const deactivateUser = async (userId: string, tenantId: string) => {
    const user = await UserModel.findOneAndUpdate(
        { _id: userId, tenant: tenantId },
        { isActive: false },
        { new: true }
    );
    if (!user) throw new Error("User not found");
    return user;
};
