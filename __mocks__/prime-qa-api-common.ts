import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export class AppError extends Error {
	code: string;
	status: number;
	constructor(code: string, message: string, status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

export enum ErrorCode {
	VALIDATION_ERROR = "VALIDATION_ERROR",
	UNAUTHORIZED = "UNAUTHORIZED",
	FORBIDDEN = "FORBIDDEN",
	NOT_FOUND = "NOT_FOUND",
	CONFLICT = "CONFLICT",
	INTERNAL_ERROR = "INTERNAL_ERROR"
}

export const secureHeaders = (_req: Request, _res: Response, next: NextFunction) => next();
export const requestContext = (req: Request, _res: Response, next: NextFunction) => {
	(req as any).context = { correlationId: "test-correlation" };
	next();
};
export const logger = (_req: Request, _res: Response, next: NextFunction) => next();
export const loginRateLimiter = (_req: Request, _res: Response, next: NextFunction) => next();
export const startCacheCleanup = (_interval: number) => { /* no-op */ };

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
	const header = req.headers.authorization;
	if (!header) return next(new AppError(ErrorCode.UNAUTHORIZED, "Missing token", 401));
	const token = header.replace(/Bearer\s+/i, "").trim();
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret") as any;
		(req as any).user = payload;
		next();
	} catch (err) {
		next(new AppError(ErrorCode.UNAUTHORIZED, "Invalid token", 401));
	}
};

export const requirePermission = (permission: string) => (req: Request, _res: Response, next: NextFunction) => {
	const perms: string[] = ((req as any).user?.permissions) || [];
	if (perms.includes(permission)) return next();
	return next(new AppError(ErrorCode.FORBIDDEN, "Insufficient permissions", 403));
};

export const requireTenant = (req: Request, _res: Response, next: NextFunction) => {
	const tenantId = (req as any).user?.tenantId;
	if (!tenantId && (req as any).user?.role !== "super-admin") {
		return next(new AppError(ErrorCode.FORBIDDEN, "Tenant required", 403));
	}
	(req as any).tenantId = tenantId;
	next();
};

export const enforceTenantOnBody = (field: string) => (req: Request, _res: Response, next: NextFunction) => {
	const tenantId = (req as any).user?.tenantId;
	req.body[field] = tenantId;
	next();
};

export const getUserContext = (req: Request) => {
	const user = (req as any).user || {};
	return {
		userId: user.sub || user.id || null,
		tenantId: user.tenantId || null,
		role: user.role || null,
		permissions: user.permissions || []
	};
};

export const success = <T>(res: Response, data: T, message = "") => {
	return res.json({ success: true, data, message });
};

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
	const status = err.status || 500;
	return res.status(status).json({ success: false, code: err.code || "INTERNAL_ERROR", message: err.message || "Internal error" });
};
