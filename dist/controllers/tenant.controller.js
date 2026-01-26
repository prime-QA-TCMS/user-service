import * as TenantService from "../services/tenant.service.js";
import { AppError, ErrorCode, success } from "prime-qa-api-common";
export const list = async (_req, res, next) => {
    try {
        const items = await TenantService.listTenants();
        return success(res, items, "Tenants retrieved successfully");
    }
    catch (err) {
        console.error("[TenantController.list]", { name: err?.name, message: err?.message, code: err?.code });
        if (err instanceof AppError)
            return next(err);
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Failed to retrieve tenants", 500, { error: err?.message }));
    }
};
export const create = async (req, res, next) => {
    try {
        const { name, domain } = req.body;
        if (!name) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, "Tenant name is required", 400);
        }
        const t = await TenantService.createTenant(name, domain);
        res.status(201);
        return success(res, t, "Tenant created successfully");
    }
    catch (err) {
        if (err instanceof AppError)
            return next(err);
        if (err.message.includes("already exists") || err.code === 11000) {
            return next(new AppError(ErrorCode.CONFLICT, "Tenant already exists", 409));
        }
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Tenant creation failed", 500));
    }
};
export const update = async (req, res, next) => {
    try {
        const recordId = req.params.id;
        if (!recordId) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, "Missing tenant ID in request params", 400);
        }
        const t = await TenantService.updateTenant(recordId, req.body);
        return success(res, t, "Tenant updated successfully");
    }
    catch (err) {
        console.error("[TenantController.update]", { name: err?.name, message: err?.message, code: err?.code });
        if (err instanceof AppError)
            return next(err);
        if (err?.message?.includes("not found")) {
            return next(new AppError(ErrorCode.NOT_FOUND, "Tenant not found", 404));
        }
        if (err?.code === 11000 || err?.message?.includes("duplicate key")) {
            return next(new AppError(ErrorCode.CONFLICT, "Tenant name already exists", 409, { error: err?.message }));
        }
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Tenant update failed", 500, { error: err?.message }));
    }
};
export const remove = async (req, res, next) => {
    try {
        const recordId = req.params.id;
        if (!recordId) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, "Missing tenant ID in request params", 400);
        }
        await TenantService.deleteTenant(recordId);
        return success(res, null, "Tenant deleted successfully");
    }
    catch (err) {
        if (err instanceof AppError)
            return next(err);
        if (err.message.includes("not found")) {
            return next(new AppError(ErrorCode.NOT_FOUND, "Tenant not found", 404));
        }
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Tenant deletion failed", 500));
    }
};
