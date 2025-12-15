import mongoose, { Schema, Document, Model } from 'mongoose';

export interface FileDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

const FileSchema = new Schema<FileDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true, required: true },
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

// Indexes for performance
FileSchema.index({ organizationId: 1, uploadedBy: 1 });
FileSchema.index({ organizationId: 1, uploadedAt: 1 });

export const File: Model<FileDocument> = mongoose.models.File || mongoose.model<FileDocument>('File', FileSchema);
