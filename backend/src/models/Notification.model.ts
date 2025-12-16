import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 'info' | 'warning' | 'success' | 'error';
export type NotificationPriority = 'low' | 'medium' | 'high';

export interface NotificationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  deleted: boolean;
  relatedEntityType?: 'transfer' | 'material' | 'user';
  relatedEntityId?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['info', 'warning', 'success', 'error'], 
      default: 'info',
      required: true 
    },
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      default: 'medium',
      required: true 
    },
    read: { type: Boolean, default: false, index: true },
    deleted: { type: Boolean, default: false, index: true },
    relatedEntityType: { 
      type: String, 
      enum: ['transfer', 'material', 'user'],
      required: false
    },
    relatedEntityId: { type: Schema.Types.ObjectId, required: false },
    metadata: { type: Schema.Types.Mixed, required: false }
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
NotificationSchema.index({ userId: 1, deleted: 1, createdAt: -1 });
NotificationSchema.index({ organizationId: 1, deleted: 1, read: 1 });
NotificationSchema.index({ userId: 1, read: 1, deleted: 1 });

export const Notification = mongoose.model<NotificationDocument>('Notification', NotificationSchema);
