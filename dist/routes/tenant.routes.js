import { Router } from "express";
import * as TenantController from "../controllers/tenant.controller.js";
import { authenticate, requirePermission, AppError, ErrorCode } from "prime-qa-api-common";
const router = Router();
// All tenant routes require authentication
// Note: Tenant routes do NOT use requireTenant middleware as they manage tenants
router.use(authenticate);
const requireTenantManager = (req, _res, next) => {
    try {
        const user = req.user; // Directly access user from middleware (authenticate already ran)
        if (!user?.role) {
            return next(new AppError(ErrorCode.UNAUTHORIZED, "User role is required", 401));
        }
        if (user.role !== "super-admin" && user.role !== "admin") {
            return next(new AppError(ErrorCode.FORBIDDEN, "Super admin or admin only", 403));
        }
        return next();
    }
    catch (err) {
        return next(new AppError(ErrorCode.UNAUTHORIZED, "Unauthorized", 401));
    }
};
// Only super-admin can manage tenants
/**
 * @openapi
 * /tenants:
 *   get:
 *     tags:
 *       - Tenants
 *     summary: List all tenants
 *     description: Retrieves all tenants. Only accessible by super-admin or admin roles.
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
 *         description: Tenants retrieved successfully
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
 *                     tenants:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tenant'
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
 *         description: Forbidden - super-admin or admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", requirePermission("tenant.read"), requireTenantManager, TenantController.list);
/**
 * @openapi
 * /tenants:
 *   post:
 *     tags:
 *       - Tenants
 *     summary: Create a new tenant
 *     description: Creates a new tenant organization. Only accessible by super-admin or admin roles.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Acme Corporation
 *               domain:
 *                 type: string
 *                 example: acme.com
 *               settings:
 *                 type: object
 *                 properties:
 *                   maxUsers:
 *                     type: integer
 *                     example: 100
 *                   features:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["advanced-reporting", "api-access"]
 *     responses:
 *       201:
 *         description: Tenant created successfully
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
 *                   $ref: '#/components/schemas/Tenant'
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
 *         description: Forbidden - super-admin or admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Tenant name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", requirePermission("tenant.create"), requireTenantManager, TenantController.create);
/**
 * @openapi
 * /tenants/{id}:
 *   put:
 *     tags:
 *       - Tenants
 *     summary: Update tenant
 *     description: Updates tenant information. Only accessible by super-admin or admin roles.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *         example: 6977c5e4ea7e71a947e74e78
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Acme Corp Updated
 *               domain:
 *                 type: string
 *                 example: acmecorp.com
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Tenant updated successfully
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
 *                   $ref: '#/components/schemas/Tenant'
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
 *         description: Forbidden - super-admin or admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tenant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Tenant name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/:id", requirePermission("tenant.update"), requireTenantManager, TenantController.update);
/**
 * @openapi
 * /tenants/{id}:
 *   delete:
 *     tags:
 *       - Tenants
 *     summary: Delete tenant
 *     description: Soft deletes a tenant by setting isDeleted flag. Only accessible by super-admin or admin roles.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *         example: 6977c5e4ea7e71a947e74e78
 *     responses:
 *       200:
 *         description: Tenant deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Tenant deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - super-admin or admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tenant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", requirePermission("tenant.delete"), requireTenantManager, TenantController.remove);
export default router;
