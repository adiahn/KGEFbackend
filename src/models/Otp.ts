import { Schema, model, Document } from "mongoose";

export interface IOtp extends Document {
  applicationNumber: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
}

const otpSchema = new Schema<IOtp>({
  applicationNumber: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, required: true },
});

// TTL index: Mongo automatically deletes the document once expiresAt passes,
// so stale/expired OTPs never linger.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = model<IOtp>("Otp", otpSchema);
