import { Router } from "express";
import * as UserController from "../controllers/user.controller.js";
import { authenticate, requirePermission, requireTenant, success, AppError, ErrorCode } from "prime-qa-api-common";
const router = Router();
const allowSelfOrPermission = (permission) => async (req, res, next) => {
    try {
        const user = req.user; // From authenticate middleware
        const userId = user?.userId;
        if (userId && req.params?.id === userId) {
            return next();
        }
        return requirePermission(permission)(req, res, next);
    }
    catch (err) {
        return next(new AppError(ErrorCode.UNAUTHORIZED, "Unauthorized", 401));
    }
};
// All user routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);
/**
 * @openapi
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: List all users
 *     description: Retrieves all users for the authenticated user's tenant with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - user.read permission required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", requirePermission("user.read"), async (req, res, next) => {
    try {
        const service = await import("../services/user.service.js");
        const tenantId = req.tenantId; // Set by requireTenant middleware
        if (!tenantId)
            throw new AppError(ErrorCode.FORBIDDEN, "Tenant context is required", 403);
        const page = parseInt(req.query.page || "1", 10);
        const limit = parseInt(req.query.limit || "20", 10);
        const result = await service.listUsers(tenantId, page, limit);
        return success(res, result, "Users retrieved successfully");
    }
    catch (err) {
        console.error("[UserRoutes.list]", { name: err?.name, message: err?.message });
        if (err instanceof AppError)
            return next(err);
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Failed to retrieve users", 500, { error: err?.message }));
    }
});
/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     description: Retrieves a specific user. Users can view their own profile or need user.read permission for others.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: 6977c5e4ea7e71a947e74e95
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - can only view own profile or need user.read permission
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", allowSelfOrPermission("user.read"), async (req, res, next) => {
    try {
        const service = await import("../services/user.service.js");
        const recordId = req.params.id;
        if (!recordId) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, "Missing user ID in request params", 400);
        }
        const tenantId = req.tenantId; // From requireTenant middleware
        const userId = req.user?.userId; // From authenticate middleware
        if (!tenantId)
            throw new AppError(ErrorCode.FORBIDDEN, "Tenant context is required", 403);
        const user = await service.getUser(recordId, tenantId, userId);
        if (!user)
            throw new AppError(ErrorCode.NOT_FOUND, "User not found", 404);
        return success(res, user, "User retrieved successfully");
    }
    catch (err) {
        console.error("[UserRoutes.getById]", { name: err?.name, message: err?.message });
        if (err instanceof AppError)
            return next(err);
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Failed to retrieve user", 500, { error: err?.message }));
    }
});
/**
 * @openapi
 * /users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a new user
 *     description: Creates a new user with specified role in the authenticated user's tenant
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - roleId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newuser@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *               roleId:
 *                 type: string
 *                 example: 6977c5e4ea7e71a947e74e93
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - user.create permission required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", requirePermission("user.create"), UserController.createUser);
/**
 * @openapi
 * /users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user
 *     description: Updates user information. Users can update their own profile or need user.update permission for others.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: 6977c5e4ea7e71a947e74e95
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               roleId:
 *                 type: string
 *                 description: Requires user.update permission
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - can only update own profile or need user.update permission
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/:id", allowSelfOrPermission("user.update"), UserController.updateUser);
/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Deactivate user
 *     description: Soft deletes a user by setting isActive to false. User can no longer login.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: 6977c5e4ea7e71a947e74e95
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: User deactivated successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - user.delete permission required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", requirePermission("user.delete"), async (req, res, next) => {
    try {
        const service = await import("../services/user.service.js");
        const recordId = req.params.id;
        if (!recordId) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, "Missing user ID in request params", 400);
        }
        const tenantId = req.tenantId; // From requireTenant middleware
        if (!tenantId)
            throw new AppError(ErrorCode.FORBIDDEN, "Tenant context is required", 403);
        const u = await service.deactivateUser(recordId, tenantId);
        return success(res, u, "User deactivated successfully");
    }
    catch (err) {
        console.error("[UserRoutes.delete]", { name: err?.name, message: err?.message });
        if (err instanceof AppError)
            return next(err);
        if (err?.message?.includes("not found")) {
            return next(new AppError(ErrorCode.NOT_FOUND, "User not found", 404));
        }
        next(new AppError(ErrorCode.INTERNAL_ERROR, "Failed to deactivate user", 500, { error: err?.message }));
    }
});
export default router;
