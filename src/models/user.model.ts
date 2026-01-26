import mongoose, { Schema, Document } from "mongoose";
import type { IRole } from "./role.model.js";
import type { ITenant } from "./tenant.model.js";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: mongoose.Types.ObjectId | IRole;
  tenant: mongoose.Types.ObjectId | ITenant;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date }
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>("User", UserSchema);
