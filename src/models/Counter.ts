import { Schema, model } from "mongoose";

interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = model<ICounter>("Counter", counterSchema);

export async function getNextApplicationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const counterId = `applicant-${year}`;

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );

  const seq = String(counter.seq).padStart(6, "0");
  return `KGEF-${year}-${seq}`;
}
