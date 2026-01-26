import mongoose, { Schema, Document } from "mongoose";

export interface ITenant extends Document {
  name: string;
  domain?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, unique: true },
    domain: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const TenantModel = mongoose.model<ITenant>("Tenant", TenantSchema);
