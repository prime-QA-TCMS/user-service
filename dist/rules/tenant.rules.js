import { TenantModel } from "../models/tenant.model.js";
import { UserModel } from "../models/user.model.js";
export const ensureTenantNameUnique = async (name) => {
    const existing = await TenantModel.findOne({ name, isDeleted: false });
    if (existing)
        throw new Error("Tenant name must be unique");
};
export const ensureTenantDeletable = async (tenantId) => {
    const count = await UserModel.countDocuments({ tenant: tenantId });
    if (count > 0)
        throw new Error("Cannot delete tenant with users");
};
