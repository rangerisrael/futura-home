"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Home,
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  DollarSign,
  FileText,
  Search,
  Download,
  Clock,
  CreditCard,
  Receipt,
  TrendingUp,
  FileSignature,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { createClient } from "@supabase/supabase-js";
import WalkInPaymentModal from "./WalkInPaymentModal";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CertifiedHomeOwner() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedContract, setSelectedContract] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedContracts, setExpandedContracts] = useState([]);
  const contractRefs = React.useRef({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [paymentContract, setPaymentContract] = useState(null);

  useEffect(() => {
    loadContracts();
  }, []);

  // Close accordion when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside all expanded contracts
      let clickedInside = false;

      expandedContracts.forEach((contractId) => {
        const contractElement = contractRefs.current[contractId];
        if (contractElement && contractElement.contains(event.target)) {
          clickedInside = true;
        }
      });

      // If clicked outside, close all expanded contracts
      if (!clickedInside && expandedContracts.length > 0) {
        setExpandedContracts([]);
      }
    };

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expandedContracts]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, contracts]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/contracts");
      const result = await response.json();

      console.log("Contracts result:", result);

      if (result.success) {
        setContracts(result.data);
        setFilteredContracts(result.data);
      } else {
        toast.error(result.message || "Failed to load contracts");
      }
    } catch (error) {
      console.error("Error loading contracts:", error);
      toast.error("Error loading contracts");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...contracts];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.contract_status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((c) => {
        return (
          c.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.property_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.client_phone?.includes(searchTerm)
        );
      });
    }

    setFilteredContracts(filtered);
  };

  const formatCurrency = (amount) => {
    if (!amount) return "₱0.00";
    return `₱${parseFloat(amount).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: "bg-green-100 text-green-800", label: "Active" },
      completed: { color: "bg-blue-100 text-blue-800", label: "Completed" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
      defaulted: { color: "bg-orange-100 text-orange-800", label: "Defaulted" },
      transferred: {
        color: "bg-purple-100 text-purple-800",
        label: "Transferred",
      },
    };

    const config = statusConfig[status] || {
      color: "bg-gray-100 text-gray-800",
      label: status,
    };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getDownpaymentStatusBadge = (status) => {
    const statusConfig = {
      in_progress: {
        color: "bg-yellow-100 text-yellow-800",
        label: "In Progress",
      },
      completed: { color: "bg-green-100 text-green-800", label: "Completed" },
      overdue: { color: "bg-red-100 text-red-800", label: "Overdue" },
      defaulted: { color: "bg-orange-100 text-orange-800", label: "Defaulted" },
    };

    const config = statusConfig[status] || {
      color: "bg-gray-100 text-gray-800",
      label: status,
    };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const handleViewDetails = (contract) => {
    setSelectedContract(contract);
    setShowDetailModal(true);
  };

  const toggleContract = (contractId) => {
    setExpandedContracts((prev) =>
      prev.includes(contractId)
        ? prev.filter((id) => id !== contractId)
        : [...prev, contractId]
    );
  };

  const handleWalkInPayment = (schedule, contract) => {
    console.log("Opening payment modal for:", {
      contractNumber: contract.contract_number,
      scheduleId: schedule.schedule_id,
      installmentNumber: schedule.installment_number,
      amount: schedule.remaining_amount,
    });

    setSelectedSchedule(schedule);
    setPaymentContract(contract);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (paymentData) => {
    console.log("Payment successful:", paymentData);

    toast.success(
      `Payment processed successfully! Receipt: ${
        paymentData.transaction?.receipt_number || "Pending"
      }`
    );

    // Reload contracts to get updated data
    loadContracts();

    // Close modals
    setShowPaymentModal(false);
    setShowDetailModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-blue-600" />
          Certified Home Owner
        </h1>
        <p className="text-gray-600">
          View and manage all property purchase contracts
        </p>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by contract number, client name, email, phone, or property..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                onClick={() => setStatusFilter("active")}
                size="sm"
              >
                Active
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                onClick={() => setStatusFilter("completed")}
                size="sm"
              >
                Completed
              </Button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600 font-semibold">
                Total Contracts
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {contracts.length}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-green-600 font-semibold">Active</p>
              <p className="text-2xl font-bold text-green-900">
                {contracts.filter((c) => c.contract_status === "active").length}
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-xs text-purple-600 font-semibold">Completed</p>
              <p className="text-2xl font-bold text-purple-900">
                {
                  contracts.filter((c) => c.contract_status === "completed")
                    .length
                }
              </p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <p className="text-xs text-amber-600 font-semibold">
                In Progress
              </p>
              <p className="text-2xl font-bold text-amber-900">
                {
                  contracts.filter(
                    (c) => c.downpayment_status === "in_progress"
                  ).length
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading contracts...</span>
        </div>
      ) : filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No contracts found</p>
            <p className="text-gray-400 text-sm">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Contracts will appear here once created"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredContracts.map((contract) => {
            const isExpanded = expandedContracts.includes(contract.contract_id);

            return (
              <motion.div
                key={contract.contract_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                ref={(el) => (contractRefs.current[contract.contract_id] = el)}
              >
                <Card className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500 overflow-hidden">
                  {/* Header - Always Visible */}
                  <CardContent className="p-6">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleContract(contract.contract_id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-3 bg-blue-100 rounded-xl">
                          <FileSignature className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            Contract Number
                          </p>
                          <h3 className="text-xl font-bold text-blue-900 mb-2">
                            {contract.contract_number}
                          </h3>
                          <div className="flex gap-2 items-center flex-wrap">
                            {getStatusBadge(contract.contract_status)}
                            {getDownpaymentStatusBadge(
                              contract.downpayment_status
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Info - Visible when collapsed */}
                      {!isExpanded && (
                        <div className="hidden lg:flex items-center gap-6 mr-6">
                          <div className="text-right">
                            <p className="text-xs text-gray-500 font-medium">
                              Client
                            </p>
                            <p className="font-semibold text-gray-900">
                              {contract.client_name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 font-medium">
                              Property
                            </p>
                            <p className="font-semibold text-gray-900">
                              {contract.property_title}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 font-medium">
                              Balance
                            </p>
                            <p className="font-bold text-red-600">
                              {formatCurrency(contract.remaining_balance)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Toggle Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleContract(contract.contract_id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </Button>
                    </div>
                  </CardContent>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <CardContent className="pt-0 px-8 pb-8">
                          <div className="flex flex-col lg:flex-row gap-8 pt-6 border-t border-gray-200">
                            {/* Left: Contract Info */}
                            <div className="flex-1 space-y-6">
                              {/* Client Info Section */}
                              <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
                                <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-blue-600" />
                                  Client Information
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      Full Name
                                    </p>
                                    <p className="font-semibold text-gray-900 text-base">
                                      {contract.client_name}
                                    </p>
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      Email Address
                                    </p>
                                    <p className="font-medium text-gray-700">
                                      {contract.client_email}
                                    </p>
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      Phone Number
                                    </p>
                                    <p className="font-medium text-gray-700">
                                      {contract.client_phone}
                                    </p>
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      Property
                                    </p>
                                    <p className="font-semibold text-gray-900">
                                      {contract.property_title}
                                    </p>
                                  </div>
                                  {contract.client_address && (
                                    <div className="space-y-1.5 md:col-span-2">
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Address
                                      </p>
                                      <p className="font-medium text-gray-700 leading-relaxed">
                                        {contract.client_address}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Contract Dates Section */}
                              <div className="bg-teal-50/50 rounded-xl p-5 border border-teal-100">
                                <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-teal-600" />
                                  Important Dates
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      Contract Signed
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {formatDate(
                                        contract.contract_signed_date
                                      )}
                                    </p>
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      First Installment
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {formatDate(
                                        contract.first_installment_date
                                      )}
                                    </p>
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      Final Installment
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {formatDate(
                                        contract.final_installment_date
                                      )}
                                    </p>
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      Created Date
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {formatDate(contract.created_at)}
                                    </p>
                                  </div>
                                  {contract.contract_completion_date && (
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Completion Date
                                      </p>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {formatDate(
                                          contract.contract_completion_date
                                        )}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Bank Financing Section */}
                              {contract.bank_financing_amount > 0 && (
                                <div className="bg-purple-50/50 rounded-xl p-5 border border-purple-100">
                                  <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-purple-600" />
                                    Bank Financing Details (90%)
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Financing Amount
                                      </p>
                                      <p className="font-bold text-purple-900 text-lg">
                                        {formatCurrency(
                                          contract.bank_financing_amount
                                        )}
                                      </p>
                                    </div>
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Status
                                      </p>
                                      <Badge className="bg-purple-200 text-purple-900 font-medium">
                                        {contract.bank_financing_status ||
                                          "Pending"}
                                      </Badge>
                                    </div>
                                    {contract.bank_name && (
                                      <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                          Bank Name
                                        </p>
                                        <p className="font-medium text-gray-900">
                                          {contract.bank_name}
                                        </p>
                                      </div>
                                    )}
                                    {contract.bank_loan_number && (
                                      <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                          Loan Number
                                        </p>
                                        <p className="font-medium text-gray-900">
                                          {contract.bank_loan_number}
                                        </p>
                                      </div>
                                    )}
                                    {contract.bank_approval_date && (
                                      <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                          Approval Date
                                        </p>
                                        <p className="font-medium text-gray-900">
                                          {formatDate(
                                            contract.bank_approval_date
                                          )}
                                        </p>
                                      </div>
                                    )}
                                    {contract.bank_release_date && (
                                      <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                          Release Date
                                        </p>
                                        <p className="font-medium text-gray-900">
                                          {formatDate(
                                            contract.bank_release_date
                                          )}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Special Terms & Notes */}
                              {(contract.special_terms || contract.notes) && (
                                <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100">
                                  <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-amber-600" />
                                    Additional Information
                                  </h5>
                                  {contract.special_terms && (
                                    <div className="space-y-1.5 mb-3">
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Special Terms
                                      </p>
                                      <p className="font-medium text-gray-700 leading-relaxed">
                                        {contract.special_terms}
                                      </p>
                                    </div>
                                  )}
                                  {contract.notes && (
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Notes
                                      </p>
                                      <p className="font-medium text-gray-700 leading-relaxed">
                                        {contract.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right: Payment Info */}
                            <div className="lg:w-96 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 shadow-sm border border-blue-100">
                              <h4 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                  <DollarSign className="w-5 h-5 text-blue-600" />
                                </div>
                                Payment Information
                              </h4>

                              <div className="space-y-4 mb-6">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    Property Price
                                  </span>
                                  <span className="font-bold text-gray-900 text-lg">
                                    {formatCurrency(contract.property_price)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    Downpayment (10%)
                                  </span>
                                  <span className="font-bold text-blue-700 text-lg">
                                    {formatCurrency(contract.downpayment_total)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    Reservation Fee
                                  </span>
                                  <span className="font-semibold text-green-600">
                                    {formatCurrency(
                                      contract.reservation_fee_paid
                                    )}
                                  </span>
                                </div>
                                <div className="border-t-2 border-blue-200 pt-4 mt-4">
                                  <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm font-semibold text-gray-700">
                                      Remaining Balance
                                    </span>
                                    <span className="font-bold text-red-600 text-xl">
                                      {formatCurrency(
                                        contract.remaining_balance
                                      )}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center bg-white/60 backdrop-blur-sm p-3 rounded-lg">
                                  <span className="text-sm font-medium text-gray-600">
                                    Payment Plan
                                  </span>
                                  <span className="font-bold text-blue-700">
                                    {contract.payment_plan_months} months
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-white/60 backdrop-blur-sm p-3 rounded-lg">
                                  <span className="text-sm font-medium text-gray-600">
                                    Monthly Payment
                                  </span>
                                  <span className="font-bold text-blue-900 text-lg">
                                    {formatCurrency(
                                      contract.monthly_installment
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Payment Progress */}
                              {contract.statistics && (
                                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 mb-4">
                                  <div className="flex justify-between text-sm text-gray-700 mb-3 font-medium">
                                    <span>Payment Progress</span>
                                    <span className="font-bold text-blue-600">
                                      {
                                        contract.statistics
                                          .payment_progress_percent
                                      }
                                      %
                                    </span>
                                  </div>
                                  <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                                    <div
                                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                                      style={{
                                        width: `${contract.statistics.payment_progress_percent}%`,
                                      }}
                                    ></div>
                                  </div>
                                  <div className="flex justify-between text-sm text-gray-600 mt-3">
                                    <span className="font-medium">
                                      {contract.statistics.paid_installments} of{" "}
                                      {contract.statistics.total_installments}{" "}
                                      paid
                                    </span>
                                    {contract.statistics.overdue_installments >
                                      0 && (
                                      <span className="text-red-600 font-bold">
                                        {
                                          contract.statistics
                                            .overdue_installments
                                        }{" "}
                                        overdue
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* View Details Button */}
                              <Button
                                onClick={() => handleViewDetails(contract)}
                                className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                                variant="default"
                              >
                                <FileText className="w-5 h-5 mr-2" />
                                View Full Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedContract && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b sticky top-0 bg-white z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Contract Details
                    </h2>
                    <p className="text-3xl font-bold text-blue-600">
                      {selectedContract.contract_number}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetailModal(false)}
                  >
                    <XCircle className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="p-6">
                {/* Contract Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Client Information */}
                  <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        Client Information
                      </h3>
                      <div className="space-y-4">
                        <div className="pb-3 border-b border-gray-100">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Full Name
                          </span>
                          <p className="font-semibold text-gray-900 mt-1.5 text-base">
                            {selectedContract.client_name}
                          </p>
                        </div>
                        <div className="pb-3 border-b border-gray-100">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Email Address
                          </span>
                          <p className="font-medium text-gray-700 mt-1.5">
                            {selectedContract.client_email}
                          </p>
                        </div>
                        <div className="pb-3 border-b border-gray-100">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Phone Number
                          </span>
                          <p className="font-medium text-gray-700 mt-1.5">
                            {selectedContract.client_phone}
                          </p>
                        </div>
                        <div className="pt-1">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Address
                          </span>
                          <p className="font-medium text-gray-700 mt-1.5 leading-relaxed">
                            {selectedContract.client_address}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Property Information */}
                  <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Home className="w-5 h-5 text-green-600" />
                        </div>
                        Property Information
                      </h3>
                      <div className="space-y-4">
                        <div className="pb-3 border-b border-gray-100">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Property Name
                          </span>
                          <p className="font-semibold text-gray-900 mt-1.5 text-base">
                            {selectedContract.property_title}
                          </p>
                        </div>
                        <div className="pt-1">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Total Price
                          </span>
                          <p className="font-bold text-green-600 text-2xl mt-2">
                            {formatCurrency(selectedContract.property_price)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Structure */}
                <Card className="mb-8 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <CreditCard className="w-5 h-5 text-indigo-600" />
                      </div>
                      Payment Structure
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                            Downpayment (10%)
                          </p>
                        </div>
                        <p className="text-3xl font-bold text-blue-900 mb-4">
                          {formatCurrency(selectedContract.downpayment_total)}
                        </p>
                        <div className="space-y-3 pt-3 border-t border-blue-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Reservation Fee
                            </span>
                            <span className="text-sm text-green-600 font-bold">
                              {formatCurrency(
                                selectedContract.reservation_fee_paid
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Remaining Balance
                            </span>
                            <span className="text-sm text-red-600 font-bold">
                              {formatCurrency(
                                selectedContract.remaining_downpayment
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-6 rounded-xl border border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-4 h-4 text-green-600" />
                          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                            Payment Plan
                          </p>
                        </div>
                        <p className="text-3xl font-bold text-green-900 mb-4">
                          {selectedContract.payment_plan_months} months
                        </p>
                        <div className="pt-3 border-t border-green-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Monthly Payment
                            </span>
                            <span className="text-base text-green-700 font-bold">
                              {formatCurrency(
                                selectedContract.monthly_installment
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 rounded-xl border border-purple-200">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-purple-600" />
                          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                            Bank Financing (90%)
                          </p>
                        </div>
                        <p className="text-3xl font-bold text-purple-900 mb-4">
                          {formatCurrency(
                            selectedContract.bank_financing_amount
                          )}
                        </p>
                        <div className="pt-3 border-t border-purple-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Status
                            </span>
                            <Badge className="bg-purple-200 text-purple-900 font-medium px-3 py-1">
                              {selectedContract.bank_financing_status ||
                                "Pending"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Schedule */}
                {selectedContract.payment_schedules &&
                  selectedContract.payment_schedules.length > 0 && (
                    <Card className="shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <Receipt className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">
                                Payment Schedule
                              </h3>
                              <p className="text-xs text-gray-600 mt-1">
                                Process walk-in payments directly from this
                                table
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-amber-100 text-amber-800">
                            {selectedContract.payment_schedules.length}{" "}
                            Installments
                          </Badge>
                        </div>

                        {/* Walk-in Payment Info Banner */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                          <div className="p-1.5 bg-green-100 rounded-lg mt-0.5">
                            <CreditCard className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-green-900 mb-1">
                              Walk-in Payment Available
                            </h4>
                            <p className="text-xs text-green-700 leading-relaxed">
                              Click the <strong>"Pay"</strong> button on any
                              pending installment to process walk-in payments
                              for clients who visit in person.
                            </p>
                          </div>
                        </div>

                        <div className="overflow-x-auto -mx-2">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b-2 border-gray-200">
                                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  #
                                </th>
                                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Description
                                </th>
                                <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Due Date
                                </th>
                                <th className="text-right px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Amount
                                </th>
                                <th className="text-right px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Paid
                                </th>
                                <th className="text-right px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Remaining
                                </th>
                                <th className="text-center px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="text-center px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {selectedContract.payment_schedules.map(
                                (schedule) => (
                                  <tr
                                    key={schedule.schedule_id}
                                    className="hover:bg-gray-50 transition-colors"
                                  >
                                    <td className="px-4 py-4">
                                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold text-sm">
                                        {schedule.installment_number}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 font-medium text-gray-900">
                                      {schedule.installment_description}
                                    </td>
                                    <td className="px-4 py-4 text-gray-700">
                                      {formatDate(schedule.due_date)}
                                    </td>
                                    <td className="px-4 py-4 text-right font-semibold text-gray-900">
                                      {formatCurrency(
                                        schedule.scheduled_amount
                                      )}
                                    </td>
                                    <td className="px-4 py-4 text-right text-green-600 font-semibold">
                                      {formatCurrency(schedule.paid_amount)}
                                    </td>
                                    <td className="px-4 py-4 text-right text-red-600 font-semibold">
                                      {formatCurrency(
                                        schedule.remaining_amount
                                      )}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      <Badge
                                        className={
                                          schedule.payment_status === "paid"
                                            ? "bg-green-100 text-green-800 font-medium px-3 py-1"
                                            : schedule.is_overdue
                                            ? "bg-red-100 text-red-800 font-medium px-3 py-1"
                                            : "bg-yellow-100 text-yellow-800 font-medium px-3 py-1"
                                        }
                                      >
                                        {schedule.payment_status}
                                      </Badge>
                                    </td>
                                    {/* <td className="px-4 py-4 text-center">
                                      {schedule.payment_status !== "paid" &&
                                      schedule.remaining_amount > 0 ? (
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            handleWalkInPayment(
                                              schedule,
                                              selectedContract
                                            )
                                          }
                                          className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 shadow-sm"
                                        >
                                          <CreditCard className="w-4 h-4 mr-1.5" />
                                          Pay
                                        </Button>
                                      ) : (
                                        <span className="text-xs text-gray-400 font-medium">
                                          —
                                        </span>
                                      )}
                                    </td> */}
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Contract Dates */}
                <Card className="mt-8 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-teal-600" />
                      </div>
                      Important Dates
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-gradient-to-br from-teal-50 to-teal-100/30 p-4 rounded-lg border border-teal-200">
                        <p className="text-xs font-semibold text-teal-600 mb-2 uppercase tracking-wide">
                          Contract Signed
                        </p>
                        <p className="font-bold text-gray-900 text-lg">
                          {formatDate(selectedContract.contract_signed_date)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 p-4 rounded-lg border border-blue-200">
                        <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">
                          First Installment
                        </p>
                        <p className="font-bold text-gray-900 text-lg">
                          {formatDate(selectedContract.first_installment_date)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100/30 p-4 rounded-lg border border-orange-200">
                        <p className="text-xs font-semibold text-orange-600 mb-2 uppercase tracking-wide">
                          Final Installment
                        </p>
                        <p className="font-bold text-gray-900 text-lg">
                          {formatDate(selectedContract.final_installment_date)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100/30 p-4 rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                          Created Date
                        </p>
                        <p className="font-bold text-gray-900 text-lg">
                          {formatDate(selectedContract.created_at)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Walk-in Payment Modal */}
      <WalkInPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        schedule={selectedSchedule}
        contract={paymentContract}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
