export interface WelcomeEmailData {
  name: string;
  email: string;
  organizationName: string;
  loginUrl?: string;
}

export interface PasswordResetEmailData {
  name: string;
  resetLink: string;
  expiresIn?: string;
}

export interface TransferRequestEmailData {
  recipientName: string;
  senderName: string;
  senderOrganization: string;
  materialName: string;
  quantity: number;
  requestId: string;
  viewUrl?: string;
}

export interface TransferStatusEmailData {
  recipientName: string;
  materialName: string;
  quantity: number;
  status: 'APPROVED' | 'REJECTED';
  message?: string;
}

export interface NewUserEmailData {
  adminName: string;
  newUserName: string;
  newUserEmail: string;
  role: string;
  organizationName: string;
}

export class EmailTemplate {
  /**
   * Welcome email template
   */
  static welcome(data: WelcomeEmailData): { subject: string; html: string; text: string } {
    const subject = `Welcome to Inventory & Surplus Exchange Platform - ${data.organizationName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Our Platform!</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.name},</h2>
              <p>Welcome to the Inventory & Surplus Exchange Platform for <strong>${data.organizationName}</strong>!</p>
              <p>Your account has been successfully created. You can now:</p>
              <ul>
                <li>Manage your organization's inventory</li>
                <li>List surplus materials</li>
                <li>Request materials from other organizations</li>
                <li>Track transfers and transactions</li>
              </ul>
              ${data.loginUrl ? `<a href="${data.loginUrl}" class="button">Login to Your Account</a>` : ''}
              <p>If you have any questions, please don't hesitate to contact our support team.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Inventory & Surplus Exchange Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to Inventory & Surplus Exchange Platform!
      
      Hello ${data.name},
      
      Welcome to the Inventory & Surplus Exchange Platform for ${data.organizationName}!
      
      Your account has been successfully created with email: ${data.email}
      
      You can now manage your organization's inventory, list surplus materials, request materials from other organizations, and track transfers.
      
      ${data.loginUrl ? `Login here: ${data.loginUrl}` : ''}
      
      If you have any questions, please contact our support team.
    `;

    return { subject, html, text };
  }

  /**
   * Password reset email template
   */
  static passwordReset(data: PasswordResetEmailData): { subject: string; html: string; text: string } {
    const subject = 'Reset Your Password';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.name},</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <a href="${data.resetLink}" class="button">Reset Password</a>
              <div class="warning">
                <strong>Security Notice:</strong> This link will expire in ${data.expiresIn || '1 hour'}.
                If you didn't request this password reset, please ignore this email.
              </div>
              <p>For security reasons, never share this link with anyone.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Inventory & Surplus Exchange Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Password Reset Request
      
      Hello ${data.name},
      
      We received a request to reset your password. Click the link below to create a new password:
      
      ${data.resetLink}
      
      This link will expire in ${data.expiresIn || '1 hour'}.
      
      If you didn't request this password reset, please ignore this email.
    `;

    return { subject, html, text };
  }

  /**
   * Transfer request notification email
   */
  static transferRequest(data: TransferRequestEmailData): { subject: string; html: string; text: string } {
    const subject = `New Transfer Request for ${data.materialName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background-color: white; border: 1px solid #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 6px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Transfer Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.recipientName},</h2>
              <p>You have received a new transfer request:</p>
              <div class="info-box">
                <p><strong>From:</strong> ${data.senderName} (${data.senderOrganization})</p>
                <p><strong>Material:</strong> ${data.materialName}</p>
                <p><strong>Quantity:</strong> ${data.quantity}</p>
                <p><strong>Request ID:</strong> ${data.requestId}</p>
              </div>
              ${data.viewUrl ? `<a href="${data.viewUrl}" class="button">View Request</a>` : ''}
              <p>Please review and respond to this request at your earliest convenience.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Inventory & Surplus Exchange Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      New Transfer Request
      
      Hello ${data.recipientName},
      
      You have received a new transfer request:
      
      From: ${data.senderName} (${data.senderOrganization})
      Material: ${data.materialName}
      Quantity: ${data.quantity}
      Request ID: ${data.requestId}
      
      ${data.viewUrl ? `View Request: ${data.viewUrl}` : ''}
      
      Please review and respond to this request at your earliest convenience.
    `;

    return { subject, html, text };
  }

  /**
   * Transfer status update email
   */
  static transferStatus(data: TransferStatusEmailData): { subject: string; html: string; text: string } {
    const subject = `Transfer Request ${data.status === 'APPROVED' ? 'Approved' : 'Rejected'} - ${data.materialName}`;
    const statusColor = data.status === 'APPROVED' ? '#10b981' : '#ef4444';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background-color: white; border: 1px solid #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 6px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Transfer Request ${data.status === 'APPROVED' ? 'Approved' : 'Rejected'}</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.recipientName},</h2>
              <p>Your transfer request has been <strong>${data.status.toLowerCase()}</strong>:</p>
              <div class="info-box">
                <p><strong>Material:</strong> ${data.materialName}</p>
                <p><strong>Quantity:</strong> ${data.quantity}</p>
                <p><strong>Status:</strong> ${data.status}</p>
                ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
              </div>
              ${data.status === 'APPROVED' ? '<p>The transfer will be processed shortly. You will receive further updates on the delivery.</p>' : '<p>If you have questions about this decision, please contact the sender organization.</p>'}
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Inventory & Surplus Exchange Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Transfer Request ${data.status === 'APPROVED' ? 'Approved' : 'Rejected'}
      
      Hello ${data.recipientName},
      
      Your transfer request has been ${data.status.toLowerCase()}:
      
      Material: ${data.materialName}
      Quantity: ${data.quantity}
      Status: ${data.status}
      ${data.message ? `Message: ${data.message}` : ''}
      
      ${data.status === 'APPROVED' ? 'The transfer will be processed shortly.' : 'If you have questions, please contact the sender organization.'}
    `;

    return { subject, html, text };
  }

  /**
   * New user created notification email
   */
  static newUser(data: NewUserEmailData): { subject: string; html: string; text: string } {
    const subject = `New User Added - ${data.newUserName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background-color: white; border: 1px solid #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 6px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New User Added</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.adminName},</h2>
              <p>A new user has been added to <strong>${data.organizationName}</strong>:</p>
              <div class="info-box">
                <p><strong>Name:</strong> ${data.newUserName}</p>
                <p><strong>Email:</strong> ${data.newUserEmail}</p>
                <p><strong>Role:</strong> ${data.role}</p>
              </div>
              <p>The user can now access the platform with their credentials.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Inventory & Surplus Exchange Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      New User Added
      
      Hello ${data.adminName},
      
      A new user has been added to ${data.organizationName}:
      
      Name: ${data.newUserName}
      Email: ${data.newUserEmail}
      Role: ${data.role}
      
      The user can now access the platform with their credentials.
    `;

    return { subject, html, text };
  }
}
