import mongoose, { Schema, Document, Model } from 'mongoose';

export type InventoryStatus = 'AVAILABLE' | 'RESERVED' | 'TRANSFERRED' | 'ARCHIVED';

export interface MaterialDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  categoryId: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
  status: InventoryStatus;
  condition: 'NEW' | 'GOOD' | 'SLIGHTLY_DAMAGED' | 'NEEDS_REPAIR' | 'SCRAP';
  isSurplus: boolean;
  availableFrom: Date;
  availableUntil: Date;
  notes?: string;
  estimatedCost?: number;
  attachments: mongoose.Types.ObjectId[];
  allocationHistory: {
    procurementRequestId: mongoose.Types.ObjectId;
    quantityAllocated: number;
    allocatedAt: Date;
    allocatedBy: mongoose.Types.ObjectId;
    notes?: string;
  }[];
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema = new Schema<MaterialDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true, required: true },
    name: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'MaterialCategory', required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['AVAILABLE', 'RESERVED', 'TRANSFERRED', 'ARCHIVED'], 
      default: 'AVAILABLE',
      required: true 
    },
    condition: { 
      type: String, 
      enum: ['NEW', 'GOOD', 'SLIGHTLY_DAMAGED', 'NEEDS_REPAIR', 'SCRAP'], 
      required: true 
    },
    isSurplus: { type: Boolean, default: false, index: true },
    availableFrom: { type: Date, required: true },
    availableUntil: { type: Date, required: true },
    notes: { type: String },
    estimatedCost: { type: Number, min: 0 },
    attachments: [{ type: Schema.Types.ObjectId, ref: 'File' }],
    allocationHistory: [
      {
        procurementRequestId: { type: Schema.Types.ObjectId, ref: 'TransferRequest', required: true },
        quantityAllocated: { type: Number, required: true, min: 0 },
        allocatedAt: { type: Date, required: true },
        allocatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        notes: { type: String }
      }
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

MaterialSchema.pre('validate', function() {
  if (this.availableFrom && this.availableUntil && this.availableFrom > this.availableUntil) {
    throw new Error('Available From date cannot be after Available Until date');
  }
});

MaterialSchema.index({ organizationId: 1, categoryId: 1 });
MaterialSchema.index({ organizationId: 1, status: 1 });
MaterialSchema.index({ organizationId: 1, condition: 1 });
MaterialSchema.index({ organizationId: 1, isSurplus: 1 });
MaterialSchema.index({ organizationId: 1, createdBy: 1 });
MaterialSchema.index({ organizationId: 1, name: 1 });
MaterialSchema.index({ isSurplus: 1, status: 1 });

export const Material: Model<MaterialDocument> = mongoose.models.Material || mongoose.model<MaterialDocument>('Material', MaterialSchema);
