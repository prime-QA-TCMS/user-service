import { TenantModel } from "../models/tenant.model.js";
import { ensureTenantNameUnique, ensureTenantDeletable } from "../rules/tenant.rules.js";
export const listTenants = () => TenantModel.find({ isDeleted: false });
export const createTenant = async (name, domain) => {
    await ensureTenantNameUnique(name);
    return TenantModel.create({ name, domain });
};
export const updateTenant = async (id, payload) => {
    const t = await TenantModel.findOneAndUpdate({ _id: id, isDeleted: false }, payload, { new: true });
    if (!t)
        throw new Error("Tenant not found");
    return t;
};
export const deleteTenant = async (id) => {
    await ensureTenantDeletable(id);
    await TenantModel.findByIdAndUpdate(id, { isDeleted: true, isActive: false });
};
