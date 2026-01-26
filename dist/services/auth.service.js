import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/user.model.js";
import { RefreshTokenModel } from "../models/refreshToken.model.js";
import { RoleModel } from "../models/role.model.js";
import { config } from "../config/index.js";
export const register = async (email, password, roleId, tenantId) => {
    const allowTestRegister = process.env.ALLOW_TEST_REGISTER === "true" || process.env.NODE_ENV === "test";
    if (!allowTestRegister && !tenantId)
        throw new Error("Tenant context is required");
    const exists = await UserModel.findOne({ email });
    if (exists)
        throw new Error("User already exists");
    if (!allowTestRegister) {
        const role = await RoleModel.findOne({ _id: roleId, tenant: tenantId, isDeleted: false });
        if (!role)
            throw new Error("Invalid role selected for tenant");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ email, passwordHash, role: roleId, tenant: tenantId });
    return { id: user._id, email: user.email, role: user.role };
};
export const login = async (email, password) => {
    const user = await UserModel.findOne({ email })
        .populate({
        path: "role",
        populate: { path: "permissions" }
    })
        .populate("tenant");
    if (!user || !user.isActive)
        throw new Error("Invalid credentials");
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
        throw new Error("Invalid credentials");
    // Extract role and permissions
    const role = user.role;
    const tenant = user.tenant;
    if (role?.isDeleted || tenant?.isDeleted || tenant?.isActive === false)
        throw new Error("Invalid credentials");
    const permissions = (role.permissions || []).map((p) => p.code.toLowerCase().replace(/_/g, "."));
    const tenantId = tenant?._id ? tenant._id.toString() : tenant?.toString?.() || null;
    // Phase 1 JWT Contract: { userId, tenantId, role, permissions, iat, exp }
    const accessToken = jwt.sign({
        userId: user._id.toString(),
        tenantId,
        role: role.name,
        permissions
    }, config.jwtSecret, { expiresIn: "1h" });
    const refreshToken = crypto.randomUUID();
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const jti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshTokenModel.create({ user: user._id, tenant: user.tenant, tokenHash, jti, expiresAt });
    await UserModel.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    return {
        accessToken,
        refreshToken,
        user: {
            id: user._id,
            email: user.email,
            role: role.name,
            tenantId,
        }
    };
};
export const refresh = async (token) => {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = await RefreshTokenModel.findOne({ tokenHash });
    if (!record || record.expiresAt < new Date() || record.revokedAt)
        throw new Error("Invalid refresh token");
    const user = await UserModel.findById(record.user)
        .populate({
        path: "role",
        populate: { path: "permissions" }
    })
        .populate("tenant");
    if (!user)
        throw new Error("User not found");
    // Extract role and permissions
    const role = user.role;
    const tenant = user.tenant;
    if (role?.isDeleted || tenant?.isDeleted || tenant?.isActive === false)
        throw new Error("User not found");
    const permissions = (role.permissions || []).map((p) => p.code.toLowerCase().replace(/_/g, "."));
    const tenantId = tenant?._id ? tenant._id.toString() : tenant?.toString?.() || null;
    // Phase 1 JWT Contract
    const accessToken = jwt.sign({
        userId: user._id.toString(),
        tenantId,
        role: role.name,
        permissions
    }, config.jwtSecret, { expiresIn: "1h" });
    // Rotate refresh token
    record.revokedAt = new Date();
    await record.save();
    const newRefreshToken = crypto.randomUUID();
    const newTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
    const jti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshTokenModel.create({ user: user._id, tenant: user.tenant, tokenHash: newTokenHash, jti, expiresAt });
    return { accessToken, refreshToken: newRefreshToken };
};
export const logout = async (token) => {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await RefreshTokenModel.updateOne({ tokenHash }, { revokedAt: new Date() });
};
