import mongoose, { Schema, Document, Model } from 'mongoose';

export interface AuditLogDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  entity: string;
  entityId: mongoose.Types.ObjectId;
  action: string;
  changedBy: mongoose.Types.ObjectId;
  changedAt: Date;
  before?: any;
  after?: any;
  ipAddress?: string;
  userAgent?: string;
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true, required: true },
    entity: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  { timestamps: false }
);

AuditLogSchema.index({ organizationId: 1, entity: 1 });
AuditLogSchema.index({ organizationId: 1, entityId: 1 });
AuditLogSchema.index({ organizationId: 1, changedBy: 1 });
AuditLogSchema.index({ organizationId: 1, changedAt: 1 });
AuditLogSchema.index({ organizationId: 1, action: 1 });

export const AuditLog: Model<AuditLogDocument> = mongoose.models.AuditLog || mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);
