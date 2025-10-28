"use client";

import MainLayout from "@/components/common/layout";
import Dashboard from "@/components/features/dashboard";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import React from "react";

const DashboardPage = () => {
  return (
    <ProtectedRoute
      requiredRoles={[
        "admin",
        "customer service",
        "sales representative",
        "home owner",
        "collection",
      ]}
    >
      <MainLayout currentPageName="Dashboard">
        <Dashboard />
      </MainLayout>
    </ProtectedRoute>
  );
};

export default DashboardPage;
