export const ErrorCodes = {
  // Authentication Errors (1000-1099)
  INVALID_CREDENTIALS: { code: 1000, message: 'Invalid credentials' },
  TOKEN_EXPIRED: { code: 1001, message: 'Token has expired' },
  TOKEN_INVALID: { code: 1002, message: 'Invalid token' },
  UNAUTHORIZED: { code: 1003, message: 'Unauthorized access' },
  FORBIDDEN: { code: 1004, message: 'Forbidden - Insufficient permissions' },
  ACCOUNT_INACTIVE: { code: 1005, message: 'Account is inactive' },
  
  // Validation Errors (1100-1199)
  VALIDATION_ERROR: { code: 1100, message: 'Validation error' },
  INVALID_INPUT: { code: 1101, message: 'Invalid input provided' },
  REQUIRED_FIELD: { code: 1102, message: 'Required field is missing' },
  INVALID_EMAIL: { code: 1103, message: 'Invalid email format' },
  INVALID_PASSWORD: { code: 1104, message: 'Password does not meet requirements' },
  
  // Resource Errors (1200-1299)
  RESOURCE_NOT_FOUND: { code: 1200, message: 'Resource not found' },
  RESOURCE_ALREADY_EXISTS: { code: 1201, message: 'Resource already exists' },
  RESOURCE_CONFLICT: { code: 1202, message: 'Resource conflict' },
  
  // User Errors (1300-1399)
  USER_NOT_FOUND: { code: 1300, message: 'User not found' },
  USER_ALREADY_EXISTS: { code: 1301, message: 'User already exists' },
  USER_INACTIVE: { code: 1302, message: 'User is inactive' },
  
  // Organization Errors (1400-1499)
  ORGANIZATION_NOT_FOUND: { code: 1400, message: 'Organization not found' },
  ORGANIZATION_ALREADY_EXISTS: { code: 1401, message: 'Organization already exists' },
  ORGANIZATION_INACTIVE: { code: 1402, message: 'Organization is inactive' },
  
  // Material/Inventory Errors (1500-1599)
  MATERIAL_NOT_FOUND: { code: 1500, message: 'Material not found' },
  INSUFFICIENT_QUANTITY: { code: 1501, message: 'Insufficient quantity available' },
  MATERIAL_UNAVAILABLE: { code: 1502, message: 'Material is not available' },
  
  // Transfer Errors (1600-1699)
  TRANSFER_NOT_FOUND: { code: 1600, message: 'Transfer request not found' },
  TRANSFER_ALREADY_PROCESSED: { code: 1601, message: 'Transfer request already processed' },
  INVALID_TRANSFER_STATUS: { code: 1602, message: 'Invalid transfer status transition' },
  
  // File Upload Errors (1700-1799)
  FILE_UPLOAD_ERROR: { code: 1700, message: 'File upload failed' },
  FILE_TOO_LARGE: { code: 1701, message: 'File size exceeds limit' },
  INVALID_FILE_TYPE: { code: 1702, message: 'Invalid file type' },
  FILE_NOT_FOUND: { code: 1703, message: 'File not found' },
  
  // Email Errors (1800-1899)
  EMAIL_SEND_ERROR: { code: 1800, message: 'Failed to send email' },
  INVALID_EMAIL_TEMPLATE: { code: 1801, message: 'Invalid email template' },
  
  // Database Errors (1900-1999)
  DATABASE_ERROR: { code: 1900, message: 'Database operation failed' },
  DUPLICATE_KEY_ERROR: { code: 1901, message: 'Duplicate key error' },
  
  // Server Errors (5000-5099)
  INTERNAL_SERVER_ERROR: { code: 5000, message: 'Internal server error' },
  SERVICE_UNAVAILABLE: { code: 5001, message: 'Service temporarily unavailable' },
  EXTERNAL_SERVICE_ERROR: { code: 5002, message: 'External service error' },
} as const;

export type ErrorCodeKey = keyof typeof ErrorCodes;
