import jwt from "jsonwebtoken";
import * as AuthService from "../services/auth.service.js";
import { config } from "../config/index.js";
import { AppError, ErrorCode, success } from "prime-qa-api-common";
export const register = async (req, res, next) => {
    try {
        const { email, password, roleId, tenantId: tenantIdFromBody } = req.body;
        const allowTestRegister = process.env.ALLOW_TEST_REGISTER === "true" || process.env.NODE_ENV === "test";
        // Try to get tenant from request (set by middleware if authenticated)
        let resolvedTenantId = req.tenantId || (allowTestRegister ? tenantIdFromBody : undefined);
        if (!resolvedTenantId && allowTestRegister) {
            const bearer = req.headers.authorization;
            const token = bearer?.startsWith("Bearer ") ? bearer.split(" ")[1] : undefined;
            if (token) {
                try {
                    const decoded = jwt.verify(token, config.jwtSecret);
                    resolvedTenantId = decoded.tenantId || resolvedTenantId;
                }
                catch (_) {
                    /* ignore token decode errors */
                }
            }
        }
        if (!resolvedTenantId && allowTestRegister) {
            const existingTenant = await import("../models/tenant.model.js").then(m => m.TenantModel.findOne());
            resolvedTenantId = existingTenant?._id?.toString();
        }
        if (!email || !password || !roleId) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, "Email, password, and roleId are required", 400);
        }
        if (!resolvedTenantId) {
            throw new AppError(ErrorCode.FORBIDDEN, "Tenant context is required", 403);
        }
        const user = await AuthService.register(email, password, roleId, resolvedTenantId);
        res.status(201);
        return success(res, user, "User registered successfully");
    }
    catch (err) {
        console.error("[AuthController.register]", { name: err?.name, message: err?.message });
        if (err instanceof AppError)
            return next(err);
        if (err?.message === "User already exists") {
            return next(new AppError(ErrorCode.CONFLICT, err.message, 409));
        }
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Registration failed", 500, { error: err?.message }));
    }
};
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, "Email and password are required", 400);
        }
        const data = await AuthService.login(email, password);
        return success(res, data, "Login successful");
    }
    catch (err) {
        if (err instanceof AppError)
            return next(err);
        if (err.message === "Invalid credentials") {
            return next(new AppError(ErrorCode.UNAUTHORIZED, "Invalid email or password", 401));
        }
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Login failed", 500));
    }
};
export const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, "Refresh token is required", 400);
        }
        const data = await AuthService.refresh(refreshToken);
        return success(res, data, "Token refreshed successfully");
    }
    catch (err) {
        if (err instanceof AppError)
            return next(err);
        if (err.message.includes("Invalid refresh token") || err.message.includes("User not found")) {
            return next(new AppError(ErrorCode.UNAUTHORIZED, "Invalid or expired refresh token", 401));
        }
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Token refresh failed", 500));
    }
};
export const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, "Refresh token is required", 400);
        }
        await AuthService.logout(refreshToken);
        return success(res, null, "Logout successful");
    }
    catch (err) {
        if (err instanceof AppError)
            return next(err);
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Logout failed", 500));
    }
};
