import type { Request, Response, NextFunction } from "express";
import * as UserService from "../services/user.service.js";
import { UserModel } from "../models/user.model.js";
import { AppError, ErrorCode, success, getUserContext } from "prime-qa-api-common";

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).tenantId; // From requireTenant middleware
    if (!tenantId) {
      throw new AppError(ErrorCode.FORBIDDEN, "Tenant context is required", 403);
    }
    const record = await UserModel.findOne({ _id: req.params.id, tenant: tenantId });
    if (!record) {
      throw new AppError(ErrorCode.NOT_FOUND, "User not found", 404);
    }
    return success(res, record, "User retrieved successfully");
  } catch (err: any) {
    console.error("[UserController.getById]", { name: err?.name, message: err?.message });
    if (err instanceof AppError) return next(err);
    next(new AppError(ErrorCode.INTERNAL_ERROR, "Error fetching user", 500, { error: err?.message }));
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actorRole = (req as any).user?.role || "viewer";
    const tenantId = (req as any).tenantId; // From requireTenant middleware
    if (!tenantId) {
      throw new AppError(ErrorCode.FORBIDDEN, "Tenant context is required", 403);
    }

    const { email, password, roleId } = req.body;
    if (!email) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "Email, password, and roleId are required", 400);
    }

    const user = await UserService.createUser({ email, password, roleId, actorRole, tenantId });
    res.status(201);
    return success(res, user, "User created successfully");
  } catch (err: any) {
    console.error("[UserController.createUser]", { name: err?.name, message: err?.message });
    if (err instanceof AppError) return next(err);
    if (err?.message?.includes("already exists") || err?.message?.includes("duplicate")) {
      return next(new AppError(ErrorCode.CONFLICT, err.message, 409));
    }
    if (err?.message?.includes("validation") || err?.message?.includes("required")) {
      return next(new AppError(ErrorCode.VALIDATION_ERROR, err.message, 400));
    }
    if (err?.message?.includes("Insufficient permissions") || err?.message?.includes("permission")) {
      return next(new AppError(ErrorCode.FORBIDDEN, err.message, 403));
    }
    next(new AppError(ErrorCode.INTERNAL_ERROR, "User creation failed", 500, { error: err?.message }));
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "Missing user ID in request params", 400);
    }

    const tenantId = (req as any).tenantId; // From requireTenant middleware
    const actorId = (req as any).user?.userId; // From authenticate middleware
    if (!tenantId) {
      throw new AppError(ErrorCode.FORBIDDEN, "Tenant context is required", 403);
    }
    const isSelf = actorId === userId;

    // When updating self, only allow safe fields
    const allowedSelfFields = ["email", "password"];
    const payload = Object.keys(req.body).reduce((acc: any, key) => {
      if (!isSelf || allowedSelfFields.includes(key)) {
        acc[key] = (req.body as any)[key];
      }
      return acc;
    }, {} as any);

    if (isSelf) {
      delete (payload as any).role;
      delete (payload as any).roleId;
      delete (payload as any).isActive;
      delete (payload as any).tenant;
      delete (payload as any).tenantId;
    }

    const updated = await UserService.updateUser(userId, payload, {
      tenantId,
      actorId: actorId || "",
      allowRoleChange: !isSelf
    });
    return success(res, updated, "User updated successfully");
  } catch (err: any) {
    console.error("[UserController.updateUser]", { name: err?.name, message: err?.message });
    if (err instanceof AppError) return next(err);
    if (err?.message?.includes("not found")) {
      return next(new AppError(ErrorCode.NOT_FOUND, "User not found", 404));
    }
    next(new AppError(ErrorCode.INTERNAL_ERROR, "User update failed", 500, { error: err?.message }));
  }
};

export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = (req.query.q as string) || "";

    if (!query.trim()) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "Search query is required (q)", 400);
    }

    // delegate actual DB logic to the service layer
    // const results = await UserService.searchUsers(query);
    // return success(res, results, "Search completed successfully");
    return success(res, [], "Search not yet implemented");
  } catch (err: any) {
    if (err instanceof AppError) return next(err);
    next(new AppError(ErrorCode.INTERNAL_ERROR, "Search failed", 500));
  }
};