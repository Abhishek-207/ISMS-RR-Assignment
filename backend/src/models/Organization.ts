import mongoose, { Schema, Document, Model } from 'mongoose';

export type OrganizationCategory = 
  | 'ENTERPRISE'
  | 'MANUFACTURING_CLUSTER'
  | 'EDUCATIONAL_INSTITUTION'
  | 'HEALTHCARE_NETWORK'
  | 'INFRASTRUCTURE_CONSTRUCTION';

export interface OrganizationDocument extends Document {
  name: string;
  category: OrganizationCategory;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<OrganizationDocument>(
  {
    name: { type: String, required: true },
    category: { 
      type: String, 
      enum: [
        'ENTERPRISE',
        'MANUFACTURING_CLUSTER',
        'EDUCATIONAL_INSTITUTION',
        'HEALTHCARE_NETWORK',
        'INFRASTRUCTURE_CONSTRUCTION'
      ],
      required: true,
      index: true
    },
    description: { type: String },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Index for category-based filtering (critical for surplus visibility)
OrganizationSchema.index({ category: 1, isActive: 1 });
OrganizationSchema.index({ name: 1 });

export const Organization: Model<OrganizationDocument> = 
  mongoose.models.Organization || mongoose.model<OrganizationDocument>('Organization', OrganizationSchema);
