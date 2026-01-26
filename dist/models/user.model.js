import mongoose, { Schema } from "mongoose";
const UserSchema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date }
}, { timestamps: true });
export const UserModel = mongoose.model("User", UserSchema);
