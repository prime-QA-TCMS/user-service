import mongoose, { Schema, Document } from "mongoose";
import type { IPermission } from "./permission.model.js";

export interface IRole extends Document {
  name: string;
  description?: string;
  permissions: mongoose.Types.ObjectId[] | IPermission[];
  tenant: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true
    },
    description: { type: String },
    permissions: [{ type: Schema.Types.ObjectId, ref: "Permission" }],
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const RoleModel = mongoose.model<IRole>("Role", RoleSchema);
