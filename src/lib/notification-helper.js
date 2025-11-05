/**
 * Notification Helper Utility
 * Creates notifications for various system events
 */

/**
 * Create a notification in the database
 * Supports single or multiple recipients
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Result with success status
 */
export async function createNotification(supabaseAdmin, notificationData) {
  try {
    const {
      type,
      title,
      message,
      icon = "📢",
      priority = "normal",
      recipientRole = "admin",
      recipientId = null, // Single recipient ID
      recipientIds = [], // Multiple recipient IDs
      data = {},
      actionUrl = null,
      sourceTable = "system",
      sourceTableDisplayName = "System",
    } = notificationData;

    // Determine which recipients to notify
    let notificationsToCreate = [];

    // If specific recipient IDs are provided, create one notification per recipient
    if (recipientIds && recipientIds.length > 0) {
      notificationsToCreate = recipientIds.map((userId) => ({
        notification_type: type,
        source_table: sourceTable,
        source_table_display_name: sourceTableDisplayName,
        source_record_id: null,
        title,
        message,
        icon,
        priority,
        status: "unread",
        recipient_role: recipientRole,
        recipient_id: userId,
        data: {
          ...data,
          created_at: new Date().toISOString(),
        },
        action_url: actionUrl,
      }));
    } else if (recipientId) {
      // Single specific recipient
      notificationsToCreate = [
        {
          notification_type: type,
          source_table: sourceTable,
          source_table_display_name: sourceTableDisplayName,
          source_record_id: null,
          title,
          message,
          icon,
          priority,
          status: "unread",
          recipient_role: recipientRole,
          recipient_id: recipientId,
          data: {
            ...data,
            created_at: new Date().toISOString(),
          },
          action_url: actionUrl,
        },
      ];
    } else {
      // No specific recipient - notify by role only
      notificationsToCreate = [
        {
          notification_type: type,
          source_table: sourceTable,
          source_table_display_name: sourceTableDisplayName,
          source_record_id: null,
          title,
          message,
          icon,
          priority,
          status: "unread",
          recipient_role: recipientRole,
          recipient_id: null,
          data: {
            ...data,
            created_at: new Date().toISOString(),
          },
          action_url: actionUrl,
        },
      ];
    }

    // Insert all notifications
    const { data: notifications, error } = await supabaseAdmin
      .from("notifications_tbl")
      .insert(notificationsToCreate)
      .select();

    if (error) {
      console.error("❌ Notification error:", error);
      return { success: false, error };
    }

    console.log(
      `✅ Notification created: "${title}" (${notifications.length} recipient${
        notifications.length > 1 ? "s" : ""
      })`
    );
    return { success: true, data: notifications };
  } catch (error) {
    console.error("❌ Notification exception:", error);
    return { success: false, error };
  }
}

/**
 * Get all users by role
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {string} role - Role name (admin, sales representative, etc.)
 * @returns {Promise<Array>} Array of user IDs
 */
export async function getUserIdsByRole(supabaseAdmin, role) {
  try {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("❌ Error fetching users:", error);
      return [];
    }

    // Filter users by role from user_metadata
    const userIds = users.users
      .filter((user) => {
        const userRole = user.user_metadata?.role?.toLowerCase();
        return userRole === role.toLowerCase();
      })
      .map((user) => user.id);

    console.log(`📋 Found ${userIds.length} users with role "${role}"`);
    return userIds;
  } catch (error) {
    console.error("❌ Exception fetching users by role:", error);
    return [];
  }
}

/**
 * Predefined notification templates
 */
export const NotificationTemplates = {
  // User & Authentication
  USER_REGISTERED: (userData) => ({
    type: "user_registration",
    title: "New User Registered",
    message: `${userData.fullName} (${userData.email}) has successfully registered for an account.`,
    icon: "👤",
    priority: "normal",
    recipientRole: "admin",
    sourceTable: "auth.users",
    sourceTableDisplayName: "User Registration",
    actionUrl: "/settings/users",
    data: userData,
  }),

  // Inquiries
  INQUIRY_RECEIVED: (inquiryData) => ({
    type: "inquiry_received",
    title: "New Property Inquiry",
    message: `${inquiryData.clientName} (${inquiryData.clientEmail}) sent an inquiry about ${inquiryData.propertyTitle || "a property"}.`,
    icon: "❓",
    priority: "normal",
    recipientRole: "sales representative",
    sourceTable: "client_inquiries",
    sourceTableDisplayName: "Client Inquiry",
    actionUrl: "/client-inquiries",
    data: inquiryData,
  }),

  // Reservations
  RESERVATION_SUBMITTED: (reservationData) => ({
    type: "reservation_submitted",
    title: "New Property Reservation",
    message: `${reservationData.clientName} submitted a reservation for ${reservationData.propertyTitle || "a property"}. Tracking: ${reservationData.trackingNumber}`,
    icon: "📅",
    priority: "high",
    recipientRole: "sales representative",
    sourceTable: "property_reservations",
    sourceTableDisplayName: "Property Reservation",
    actionUrl: "/client-reservation",
    data: reservationData,
  }),

  RESERVATION_APPROVED: (reservationData) => ({
    type: "reservation_approved",
    title: "🎉 Reservation Approved!",
    message: `Congratulations! Your reservation (${reservationData.trackingNumber}) for ${reservationData.propertyTitle} has been approved. Our team will contact you shortly with next steps.`,
    icon: "✅",
    priority: "urgent",
    recipientRole: "sales representative", // This can be overridden when calling
    sourceTable: "property_reservations",
    sourceTableDisplayName: "Property Reservation",
    actionUrl: "/client-bookings",
    data: reservationData,
  }),

  RESERVATION_REJECTED: (reservationData) => ({
    type: "reservation_rejected",
    title: "Reservation Update",
    message: `Your reservation (${reservationData.trackingNumber}) for ${reservationData.propertyTitle} was not approved. ${reservationData.notes ? 'Reason: ' + reservationData.notes : 'Please contact us for more information.'}`,
    icon: "❌",
    priority: "high",
    recipientRole: "sales representative", // This can be overridden when calling
    sourceTable: "property_reservations",
    sourceTableDisplayName: "Property Reservation",
    actionUrl: "/client-bookings",
    data: reservationData,
  }),

  RESERVATION_REVERTED: (reservationData) => ({
    type: "reservation_reverted",
    title: "🔄 Reservation Status Updated",
    message: `Your reservation (${reservationData.trackingNumber}) for ${reservationData.propertyTitle} has been reverted back to pending status. Our team will review it again and contact you shortly.`,
    icon: "🔄",
    priority: "high",
    recipientRole: "sales representative", // This can be overridden when calling
    sourceTable: "property_reservations",
    sourceTableDisplayName: "Property Reservation",
    actionUrl: "/client-bookings",
    data: reservationData,
  }),

  // Contracts
  CONTRACT_CREATED: (contractData) => ({
    type: "contract_created",
    title: "New Contract Created",
    message: `Contract ${contractData.contractNumber} has been created for ${contractData.clientName}.`,
    icon: "📄",
    priority: "high",
    recipientRole: "admin",
    sourceTable: "property_contracts",
    sourceTableDisplayName: "Property Contract",
    actionUrl: "/client-contract-to-sell",
    data: contractData,
  }),

  CONTRACT_TRANSFERRED: (contractData) => ({
    type: "contract_transferred",
    title: "Contract Transferred",
    message: `Contract ${contractData.contractNumber} has been transferred from ${contractData.fromName} to ${contractData.toName}.`,
    icon: "🔄",
    priority: "urgent",
    recipientRole: "admin",
    sourceTable: "property_contracts",
    sourceTableDisplayName: "Contract Transfer",
    actionUrl: "/client-contract-to-sell",
    data: contractData,
  }),

  // Payments
  PAYMENT_RECEIVED: (paymentData) => ({
    type: "payment_received",
    title: "Payment Received",
    message: `₱${parseFloat(paymentData.amount).toLocaleString()} payment received for ${paymentData.contractNumber}. OR#: ${paymentData.orNumber}`,
    icon: "💰",
    priority: "normal",
    recipientRole: "collection",
    sourceTable: "contract_payment_transactions",
    sourceTableDisplayName: "Payment Transaction",
    actionUrl: "/transactions",
    data: paymentData,
  }),

  // Tour Bookings
  TOUR_BOOKED: (tourData) => ({
    type: "tour_booked",
    title: "New Tour Booking",
    message: `${tourData.clientName} booked a tour for ${tourData.propertyTitle} on ${tourData.tourDate}.`,
    icon: "🏠",
    priority: "normal",
    recipientRole: "sales representative",
    sourceTable: "tour_bookings",
    sourceTableDisplayName: "Tour Booking",
    actionUrl: "/client-bookings",
    data: tourData,
  }),

  TOUR_APPROVED: (tourData) => ({
    type: "tour_approved",
    title: "Tour Approved",
    message: `Tour booking for ${tourData.propertyTitle} on ${tourData.tourDate} has been approved.`,
    icon: "✅",
    priority: "normal",
    recipientRole: "sales representative",
    sourceTable: "tour_bookings",
    sourceTableDisplayName: "Tour Booking",
    actionUrl: "/client-bookings",
    data: tourData,
  }),

  TOUR_REJECTED: (tourData) => ({
    type: "tour_rejected",
    title: "Tour Rejected",
    message: `Tour booking for ${tourData.propertyTitle} on ${tourData.tourDate} has been rejected.`,
    icon: "❌",
    priority: "normal",
    recipientRole: "sales representative",
    sourceTable: "tour_bookings",
    sourceTableDisplayName: "Tour Booking",
    actionUrl: "/client-bookings",
    data: tourData,
  }),

  // Announcements
  ANNOUNCEMENT_PUBLISHED: (announcementData) => ({
    type: "announcement_published",
    title: "New Announcement Published",
    message: `"${announcementData.title}" has been published to all homeowners.`,
    icon: "📢",
    priority: "normal",
    recipientRole: "admin",
    sourceTable: "homeowner_announcements",
    sourceTableDisplayName: "Announcement",
    actionUrl: "/homeowner-announcement",
    data: announcementData,
  }),

  // Generic
  SYSTEM_EVENT: (eventData) => ({
    type: "system_event",
    title: eventData.title,
    message: eventData.message,
    icon: eventData.icon || "ℹ️",
    priority: eventData.priority || "normal",
    recipientRole: eventData.recipientRole || "admin",
    sourceTable: eventData.sourceTable || "system",
    sourceTableDisplayName: eventData.sourceTableDisplayName || "System",
    actionUrl: eventData.actionUrl || null,
    data: eventData.data || {},
  }),
};
