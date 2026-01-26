import mongoose, { Schema } from "mongoose";
const TenantSchema = new Schema({
    name: { type: String, required: true, unique: true },
    domain: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });
export const TenantModel = mongoose.model("Tenant", TenantSchema);
