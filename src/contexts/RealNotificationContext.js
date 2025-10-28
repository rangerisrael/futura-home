"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const RealNotificationContext = createContext();

export const useRealNotifications = () => {
  const context = useContext(RealNotificationContext);
  if (!context) {
    // throw new Error(
    //   "useRealNotifications must be used within a RealNotificationProvider"
    // );

    return false;
  }
  return context;
};

export const RealNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load notifications from Supabase
  const loadNotifications = async () => {
    try {
      console.log("Loading notifications from Supabase...");

      const { data, error } = await supabase
        .from("notifications_tbl")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50); // Get last 50 notifications

      if (error) {
        console.error("Error loading notifications:", error);
        // If table doesn't exist, show helpful message
        if (
          error.message &&
          error.message.includes("relation") &&
          error.message.includes("does not exist")
        ) {
          console.warn(
            "Notifications table does not exist. Please run the notification-supabase.sql schema first."
          );
        }
        return;
      }

      console.log("Loaded notifications:", data?.length || 0);

      // Transform Supabase data to match our component format
      const transformedNotifications = (data || []).map((notification) => ({
        id: notification.id,
        type: notification.notification_type,
        table: notification.source_table,
        tableName: notification.source_table_display_name,
        data: notification.data,
        timestamp: notification.created_at,
        read: notification.status === "read",
        action: getActionFromUrl(notification.action_url),
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        icon: notification.icon,
      }));

      setNotifications(transformedNotifications);

      // Count unread notifications
      const unread = transformedNotifications.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert action URL to action text
  const getActionFromUrl = (actionUrl) => {
    if (!actionUrl) return "View Details";

    const actionMap = {
      "/properties": "View Properties",
      "/homeowners": "View Homeowners",
      "/service-requests": "View Requests",
      "/inquiries": "View Inquiries",
      "/complaints": "View Complaints",
      "/announcements": "View Announcements",
      "/reservations": "View Appointments",
      "/billing": "View Billing",
      "/transactions": "View Transactions",
      "/dashboard": "Go to Dashboard",
    };

    return actionMap[actionUrl] || "View Details";
  };

  // Set up real-time subscription
  useEffect(() => {
    // Initial load
    loadNotifications();

    // Set up real-time listener for new notifications
    const notificationSubscription = supabase
      .channel("notifications_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications_tbl",
        },
        (payload) => {
          console.log("New notification received:", payload);

          const newNotification = {
            id: payload.new.id,
            type: payload.new.notification_type,
            table: payload.new.source_table,
            tableName: payload.new.source_table_display_name,
            data: payload.new.data,
            timestamp: payload.new.created_at,
            read: false,
            action: getActionFromUrl(payload.new.action_url),
            priority: payload.new.priority,
            title: payload.new.title,
            message: payload.new.message,
            icon: payload.new.icon,
          };

          // Add to notifications list
          setNotifications((prev) => [newNotification, ...prev.slice(0, 49)]);
          setUnreadCount((prev) => prev + 1);

          // Show browser notification if permission granted
          if (Notification.permission === "granted") {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: "/favicon.ico",
              tag: `notification-${newNotification.id}`,
              requireInteraction: newNotification.priority === "urgent",
            });
          }

          // Play sound for high priority notifications
          if (
            newNotification.priority === "urgent" ||
            newNotification.priority === "high"
          ) {
            try {
              const audio = new Audio(
                "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFA=="
              );
              audio.volume = 0.3;
              audio.play().catch(() => {}); // Ignore errors if audio can't play
            } catch (error) {
              // Ignore audio errors
            }
          }
        }
      )
      .subscribe();

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(notificationSubscription);
    };
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications_tbl")
        .update({
          status: "read",
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

      if (error) {
        console.error("Error marking notification as read:", error);
        return;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications_tbl")
        .update({
          status: "read",
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("status", "unread");

      if (error) {
        console.error("Error marking all notifications as read:", error);
        return;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Clear all notifications (mark as archived)
  const clearNotifications = async () => {
    try {
      const { error } = await supabase
        .from("notifications_tbl")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .neq("status", "archived");

      if (error) {
        console.error("Error clearing notifications:", error);
        return;
      }

      // Update local state
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  // Create manual test notification (for testing purposes)
  const createTestNotification = async (type = "test") => {
    try {
      const testData = {
        property_tbl: {
          property_code: `TEST-${Date.now()}`,
          unit_number: `A${Math.floor(Math.random() * 100)}`,
          property_type: "townhouse",
        },
        homeowner_tbl: {
          full_name: `Test User ${Date.now()}`,
          email: `test${Date.now()}@example.com`,
          phone: "09123456789",
        },
        request_tbl: {
          request_type: "urgent",
          title: `Test Emergency Request ${Date.now()}`,
          priority: "urgent",
        },
        complaint_tbl: {
          complaint_type: "noise",
          subject: `Test Complaint ${Date.now()}`,
          priority: "high",
        },
      };

      const tableNames = Object.keys(testData);
      const selectedTable =
        type === "test"
          ? tableNames[Math.floor(Math.random() * tableNames.length)]
          : type;
      const data = testData[selectedTable] || testData.homeowner_tbl;

      // Call the Supabase function to create notification
      const { data: result, error } = await supabase.rpc("notifications_tbl", {
        p_source_table: selectedTable,
        p_source_table_display_name: selectedTable
          .replace("_tbl", "")
          .replace("_", " "),
        p_source_record_id: Math.floor(Math.random() * 1000),
        p_data: data,
        p_notification_type: "insert",
        p_priority: data.priority || "normal",
      });

      if (error) {
        console.error("Error creating test notification:", error);
      } else {
        console.log("✅ Test notification created:", result);
      }
    } catch (error) {
      console.error("Error creating test notification:", error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    createTestNotification,
    refreshNotifications: loadNotifications,
  };

  return (
    <RealNotificationContext.Provider value={value}>
      {children}
    </RealNotificationContext.Provider>
  );
};

export default RealNotificationContext;
