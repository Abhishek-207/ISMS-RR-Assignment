import mongoose, { Schema, Document, Model } from 'mongoose';

export interface BaseMasterDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const baseFields = {
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true, required: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true }
};

const opts = { timestamps: true } as const;

const MaterialCategorySchema = new Schema<BaseMasterDocument>(baseFields, opts);

export const MaterialCategory: Model<BaseMasterDocument> = mongoose.models.MaterialCategory || mongoose.model<BaseMasterDocument>('MaterialCategory', MaterialCategorySchema);
