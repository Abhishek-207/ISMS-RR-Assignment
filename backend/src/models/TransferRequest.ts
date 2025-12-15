import mongoose, { Schema, Document, Model } from 'mongoose';

export interface TransferRequestDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  fromOrganizationId: mongoose.Types.ObjectId;
  toOrganizationId: mongoose.Types.ObjectId;
  quantityRequested: number;
  purpose: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  comments: {
    comment: string;
    createdAt: Date;
    createdBy: mongoose.Types.ObjectId;
    type: 'REQUEST' | 'APPROVAL' | 'REJECTION' | 'COMPLETION' | 'CANCELLATION';
  }[];
  requestedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransferRequestSchema = new Schema<TransferRequestDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true, required: true },
    materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
    fromOrganizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    toOrganizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    quantityRequested: { type: Number, required: true, min: 0 },
    purpose: { type: String, required: true, minlength: 10 },
    status: { 
      type: String, 
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'], 
      default: 'PENDING' 
    },
    comments: [
      {
        comment: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        type: { 
          type: String, 
          enum: ['REQUEST', 'APPROVAL', 'REJECTION', 'COMPLETION', 'CANCELLATION'], 
          required: true 
        }
      }
    ],
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

TransferRequestSchema.index({ organizationId: 1, materialId: 1 });
TransferRequestSchema.index({ organizationId: 1, fromOrganizationId: 1 });
TransferRequestSchema.index({ organizationId: 1, toOrganizationId: 1 });
TransferRequestSchema.index({ organizationId: 1, status: 1 });
TransferRequestSchema.index({ organizationId: 1, requestedBy: 1 });
TransferRequestSchema.index({ organizationId: 1, approvedBy: 1 });
TransferRequestSchema.index({ organizationId: 1, createdAt: 1 });

export const TransferRequest: Model<TransferRequestDocument> = mongoose.models.TransferRequest || mongoose.model<TransferRequestDocument>('TransferRequest', TransferRequestSchema);
