import mongoose, { Schema, Document } from "mongoose";

export interface IRefreshToken extends Document {
  user: mongoose.Types.ObjectId;
  tenant?: mongoose.Types.ObjectId | null;
  tokenHash: string;
  jti: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: false },
    tokenHash: { type: String, required: true, unique: true },
    jti: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, required: false }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const RefreshTokenModel = mongoose.model<IRefreshToken>(
  "RefreshToken",
  RefreshTokenSchema
);
