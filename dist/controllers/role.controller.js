import * as RoleService from "../services/role.service.js";
import { AppError, ErrorCode, success, getUserContext } from "prime-qa-api-common";
// Prefer tenant from middleware to avoid strict getUserContext() throws
const getTenantId = (req) => req.tenantId || getUserContext(req).tenantId;
// Build safe, structured error details for responses
const buildErrorDetails = (err, extras) => {
    const details = {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        keyPattern: err?.keyPattern,
        keyValue: err?.keyValue
    };
    if (err?.errors && typeof err.errors === "object") {
        details.validation = Object.values(err.errors).map((e) => ({ path: e?.path, message: e?.message }));
    }
    if (extras)
        Object.assign(details, extras);
    return details;
};
export const list = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        if (!tenantId)
            throw new AppError(ErrorCode.FORBIDDEN, "Tenant context is required", 403);
        const page = parseInt(req.query.page || "1", 10);
        const limit = parseInt(req.query.limit || "20", 10);
        const roles = await RoleService.listRoles(tenantId, page, limit);
        return success(res, roles, "Roles retrieved successfully");
    }
    catch (err) {
        if (err instanceof AppError)
            return next(err);
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Failed to retrieve roles", 500));
    }
};
export const create = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        if (!tenantId)
            throw new AppError(ErrorCode.FORBIDDEN, "Tenant context is required", 403);
        const { name, description, permissions = [] } = req.body;
        if (!name) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, "Role name is required", 400);
        }
        const role = await RoleService.createRole(tenantId, name, description, permissions);
        res.status(201);
        return success(res, role, "Role created successfully");
    }
    catch (err) {
        if (err instanceof AppError)
            return next(err);
        if (err?.message?.includes("unique") || err?.message?.includes("already exists") || err?.code === 11000) {
            return next(new AppError(ErrorCode.CONFLICT, "Role already exists", 409, buildErrorDetails(err)));
        }
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Role creation failed", 500, buildErrorDetails(err, { operation: "createRole" })));
    }
};
export const update = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        if (!tenantId)
            throw new AppError(ErrorCode.FORBIDDEN, "Tenant context is required", 403);
        const recordId = req.params.id;
        if (!recordId) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, "Missing role ID in request params", 400);
        }
        const role = await RoleService.updateRole(recordId, tenantId, req.body);
        return success(res, role, "Role updated successfully");
    }
    catch (err) {
        if (err instanceof AppError)
            return next(err);
        if (err?.message?.includes("not found")) {
            return next(new AppError(ErrorCode.NOT_FOUND, "Role not found", 404));
        }
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Role update failed", 500, buildErrorDetails(err, { operation: "updateRole", roleId: req.params?.id })));
    }
};
export const remove = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        if (!tenantId)
            throw new AppError(ErrorCode.FORBIDDEN, "Tenant context is required", 403);
        const recordId = req.params.id;
        if (!recordId) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, "Missing role ID in request params", 400);
        }
        await RoleService.deleteRole(recordId, tenantId);
        return success(res, null, "Role deleted successfully");
    }
    catch (err) {
        if (err instanceof AppError)
            return next(err);
        if (err?.message?.includes("not found")) {
            return next(new AppError(ErrorCode.NOT_FOUND, "Role not found", 404));
        }
        if (err?.message?.includes("protected") || err?.message?.includes("system role")) {
            return next(new AppError(ErrorCode.FORBIDDEN, "Cannot delete system role", 403));
        }
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Role deletion failed", 500, buildErrorDetails(err, { operation: "deleteRole", roleId: req.params?.id })));
    }
};
