import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { NotificationChannel } from "@prisma/client";

// Only initialize Resend if API key is provided
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface NotificationData {
  userId: string;
  type: string;
  channel: NotificationChannel;
  subject?: string;
  template: string;
  data: Record<string, any>;
}

export interface Notifier {
  send(notification: NotificationData): Promise<boolean>;
}

export class EmailNotifier implements Notifier {
  async send(notification: NotificationData): Promise<boolean> {
    try {
      if (!resend) {
        console.warn(
          "Resend API key not configured, skipping email notification",
        );
        return false;
      }

      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { email: true, name: true },
      });

      if (!user) return false;

      const { data, error } = await resend.emails.send({
        from: "Farm2Home <noreply@farm2home.com>",
        to: [user.email],
        subject: notification.subject || "Notification from Farm2Home",
        html: this.renderTemplate(notification.template, {
          ...notification.data,
          userName: user.name,
        }),
      });

      if (error) {
        console.error("Email sending error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Email notification error:", error);
      return false;
    }
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    // Simple template rendering - in production, use a proper template engine
    let html = template;
    Object.entries(data).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, "g"), String(value));
    });
    return html;
  }
}

export class InAppNotifier implements Notifier {
  async send(notification: NotificationData): Promise<boolean> {
    try {
      await prisma.notification.create({
        data: {
          userId: notification.userId,
          type: notification.type,
          channel: notification.channel,
          payload: notification.data,
        },
      });
      return true;
    } catch (error) {
      console.error("In-app notification error:", error);
      return false;
    }
  }
}

export class NotificationService {
  private notifiers: Notifier[];

  constructor() {
    this.notifiers = [new EmailNotifier(), new InAppNotifier()];
  }

  async send(notification: NotificationData): Promise<boolean> {
    const results = await Promise.allSettled(
      this.notifiers.map((notifier) => notifier.send(notification)),
    );

    return results.some(
      (result) => result.status === "fulfilled" && result.value === true,
    );
  }

  async sendToMultipleUsers(
    userIds: string[],
    type: string,
    channel: NotificationChannel,
    subject: string,
    template: string,
    data: Record<string, any>,
  ): Promise<number> {
    const notifications = userIds.map((userId) => ({
      userId,
      type,
      channel,
      subject,
      template,
      data,
    }));

    const results = await Promise.allSettled(
      notifications.map((notification) => this.send(notification)),
    );

    return results.filter(
      (result) => result.status === "fulfilled" && result.value === true,
    ).length;
  }
}

export const notificationService = new NotificationService();

// Template definitions
export const NOTIFICATION_TEMPLATES = {
  ORDER_PLACED: {
    subject: "New Order Placed",
    template: `
      <h2>New Order Placed</h2>
      <p>Hello {{userName}},</p>
      <p>A new order has been placed with order ID: {{orderId}}</p>
      <p>Total Amount: ₹{{totalAmount}}</p>
      <p>Thank you for using Farm2Home!</p>
    `,
  },
  ORDER_PAID: {
    subject: "Payment Received",
    template: `
      <h2>Payment Received</h2>
      <p>Hello {{userName}},</p>
      <p>Payment has been received for order {{orderId}}</p>
      <p>Amount: ₹{{amount}}</p>
      <p>Your order is now being processed.</p>
    `,
  },
  PRODUCT_APPROVED: {
    subject: "Product Approved",
    template: `
      <h2>Product Approved</h2>
      <p>Hello {{userName}},</p>
      <p>Your product "{{productName}}" has been approved and is now live!</p>
      <p>You can view it in your dashboard.</p>
    `,
  },
  PRODUCT_REJECTED: {
    subject: "Product Rejected",
    template: `
      <h2>Product Rejected</h2>
      <p>Hello {{userName}},</p>
      <p>Your product "{{productName}}" has been rejected.</p>
      <p>Reason: {{reason}}</p>
      <p>Please make the necessary changes and resubmit.</p>
    `,
  },
  PICKUP_ASSIGNED: {
    subject: "Pickup Job Assigned",
    template: `
      <h2>New Pickup Job</h2>
      <p>Hello {{userName}},</p>
      <p>You have been assigned a new pickup job for order {{orderId}}</p>
      <p>Pickup location: {{pickupLocation}}</p>
      <p>Please check your dashboard for details.</p>
    `,
  },
  DELIVERY_ASSIGNED: {
    subject: "Delivery Assigned",
    template: `
      <h2>New Delivery Job</h2>
      <p>Hello {{userName}},</p>
      <p>You have been assigned a new delivery for order {{orderId}}</p>
      <p>Delivery location: {{deliveryLocation}}</p>
      <p>Please check your dashboard for details.</p>
    `,
  },
};
