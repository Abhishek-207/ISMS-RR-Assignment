import mongoose, { Schema, Document, Model } from 'mongoose';
import { OrganizationCategory } from './Organization.model.js';

export type UserRole = 'PLATFORM_ADMIN' | 'ORG_ADMIN' | 'ORG_USER';

export interface UserDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  organizationCategory: OrganizationCategory;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true, required: true },
    organizationCategory: { 
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
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    passwordHash: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['PLATFORM_ADMIN', 'ORG_ADMIN', 'ORG_USER'], 
      required: true 
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

UserSchema.index({ organizationId: 1, email: 1 }, { unique: true });
UserSchema.index({ organizationCategory: 1, isActive: 1 });
UserSchema.index({ role: 1 });

export const User: Model<UserDocument> = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);
