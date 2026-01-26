import mongoose, { Schema } from "mongoose";
const RoleSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: { type: String },
    permissions: [{ type: Schema.Types.ObjectId, ref: "Permission" }],
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });
export const RoleModel = mongoose.model("Role", RoleSchema);
