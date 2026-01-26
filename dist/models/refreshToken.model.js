import mongoose, { Schema } from "mongoose";
const RefreshTokenSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: false },
    tokenHash: { type: String, required: true, unique: true },
    jti: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, required: false }
}, { timestamps: { createdAt: true, updatedAt: false } });
export const RefreshTokenModel = mongoose.model("RefreshToken", RefreshTokenSchema);
