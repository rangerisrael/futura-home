"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  DollarSign,
  Receipt,
  CreditCard,
  Calendar,
  Filter,
  RefreshCw,
  Loader2,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Download,
  Printer,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  generateTransactionReceipt,
  generateDateRangeReceipt,
} from "@/lib/receipt-generator";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [contractId, setContractId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [
    transactions,
    startDate,
    endDate,
    paymentStatus,
    paymentMethod,
    contractId,
    searchTerm,
  ]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch contract payment transactions from API
      const response = await fetch("/api/contracts/payment/transactions");

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const result = await response.json();

      if (!result.success) {
        console.error("Error loading transactions:", result.error);
        toast.error(result.error || "Failed to load transactions");
        throw new Error(result.error);
      }

      setTransactions(result.data || []);
      console.log("✅ Loaded", result.data.length, "transactions");
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate >= new Date(startDate);
      });
    }

    if (endDate) {
      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate <= new Date(endDate);
      });
    }

    // Filter by payment status
    if (paymentStatus !== "all") {
      filtered = filtered.filter((t) => t.payment_status === paymentStatus);
    }

    // Filter by payment method
    if (paymentMethod !== "all") {
      filtered = filtered.filter((t) => t.payment_method === paymentMethod);
    }

    // Filter by contract ID
    if (contractId !== "all") {
      filtered = filtered.filter(
        (t) => t.contract_id?.toString() === contractId
      );
    }

    // Filter by search term (transaction_id, client_name, contract_id)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();

      // Debug: Log first transaction structure
      if (filtered.length > 0) {
        console.log("Sample transaction:", filtered[0]);
        console.log("Available fields:", Object.keys(filtered[0]));
      }

      filtered = filtered.filter((t) => {
        // Check transaction_id, client_name, and contract_id fields
        const transactionId = (
          t.transaction_id?.toString() || ""
        ).toLowerCase();

        const clientName = (
          t.property_contracts?.client_name || ""
        ).toLowerCase();
        const contractIdStr = (t.contract_id?.toString() || "").toLowerCase();

        const matches =
          transactionId.includes(searchLower) ||
          clientName.includes(searchLower) ||
          contractIdStr.includes(searchLower);

        // Debug: Log what we're comparing (only for long searches like UUIDs)
        if (searchLower.length > 10 && transactionId) {
          console.log("Searching for:", searchLower);
          console.log("Checking transaction_id:", transactionId);
          console.log("Checking client_name:", clientName);
          console.log("Checking contract_id:", contractIdStr);
          console.log("Match found:", matches);
        }

        return matches;
      });
    }

    setFilteredTransactions(filtered);
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setPaymentStatus("all");
    setPaymentMethod("all");
    setContractId("all");
    setSearchTerm("");
  };

  // Generate individual receipt
  const handleGenerateReceipt = async (transactionId, action = "download") => {
    try {
      toast.info("Generating receipt...");

      const response = await fetch(
        `/api/transactions/receipt?transaction_id=${transactionId}`
      );
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || "Failed to generate receipt");
        return;
      }

      // Generate PDF
      const doc = generateTransactionReceipt(result.data);

      if (action === "print") {
        // Open print dialog
        doc.autoPrint();
        window.open(doc.output("bloburl"), "_blank");
        toast.success("Opening print dialog...");
      } else {
        // Download PDF
        doc.save(`receipt-${transactionId}.pdf`);
        toast.success("Receipt downloaded successfully!");
      }
    } catch (error) {
      console.error("Error generating receipt:", error);
      toast.error("Failed to generate receipt");
    }
  };

  // Generate date range receipt
  const handleGenerateDateRangeReceipt = async (action = "download") => {
    try {
      if (!startDate && !endDate) {
        toast.error("Please select a date range first");
        return;
      }

      toast.info("Generating summary receipt...");

      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const response = await fetch(`/api/transactions/receipt?${params}`);
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || "Failed to generate receipt");
        return;
      }

      if (result.data.length === 0) {
        toast.error("No transactions found in the selected date range");
        return;
      }

      // Generate PDF
      const doc = generateDateRangeReceipt(
        result.data,
        result.startDate,
        result.endDate
      );

      if (action === "print") {
        // Open print dialog
        doc.autoPrint();
        window.open(doc.output("bloburl"), "_blank");
        toast.success("Opening print dialog...");
      } else {
        // Download PDF
        const filename = `transaction-summary-${startDate || "start"}-to-${
          endDate || "end"
        }.pdf`;
        doc.save(filename);
        toast.success("Summary receipt downloaded successfully!");
      }
    } catch (error) {
      console.error("Error generating date range receipt:", error);
      toast.error("Failed to generate summary receipt");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "failed":
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Calculate summary statistics
  const totalAmount = filteredTransactions.reduce(
    (sum, t) => sum + parseFloat(t.total_amount || 0),
    0
  );
  const totalPenalties = filteredTransactions.reduce(
    (sum, t) => sum + parseFloat(t.penalty_paid || 0),
    0
  );
  const completedCount = filteredTransactions.filter(
    (t) => t.payment_status === "completed"
  ).length;

  // Get unique payment methods for filter
  const uniquePaymentMethods = [
    ...new Set(transactions.map((t) => t.payment_method).filter(Boolean)),
  ];

  // Get unique contract IDs for filter
  const uniqueContractIds = [
    ...new Set(transactions.map((t) => t.contract_id).filter(Boolean)),
  ].sort((a, b) => a - b);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Contract Payment Transactions
            </h1>
            <p className="text-lg text-slate-600">
              Monitor and manage all payment transactions
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => handleGenerateDateRangeReceipt("print")}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Printer className="w-5 h-5 mr-2" /> Print Receipt
            </Button>
            <Button
              onClick={() => handleGenerateDateRangeReceipt("download")}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Download className="w-5 h-5 mr-2" /> Download Receipt
            </Button>
            <Button
              onClick={loadData}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <RefreshCw className="w-5 h-5 mr-2" /> Refresh
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-blue-700">
                      Total Transactions
                    </p>
                    <p className="text-3xl font-bold text-blue-900 mt-1">
                      {filteredTransactions.length}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {completedCount} completed
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-200/50">
                    <Receipt className="w-6 h-6 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-green-700">
                      Total Amount Paid
                    </p>
                    <p className="text-3xl font-bold text-green-900 mt-1">
                      ₱{totalAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      All transactions
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-200/50">
                    <DollarSign className="w-6 h-6 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-orange-700">
                      Total Penalties
                    </p>
                    <p className="text-3xl font-bold text-orange-900 mt-1">
                      ₱{totalPenalties.toLocaleString()}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Penalty charges
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-200/50">
                    <TrendingUp className="w-6 h-6 text-orange-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Filters Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Start Date Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* End Date Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    End Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Contract ID Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Contract ID
                  </label>
                  <Select value={contractId} onValueChange={setContractId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Contracts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Contracts</SelectItem>
                      {uniqueContractIds.map((id) => (
                        <SelectItem
                          key={`contract-${id}`}
                          value={id.toString()}
                        >
                          Contract #{id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Status Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Payment Status
                  </label>
                  <Select
                    value={paymentStatus}
                    onValueChange={setPaymentStatus}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Payment Method
                  </label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      {uniquePaymentMethods.map((method, index) => (
                        <SelectItem
                          key={`payment-method-${index}-${method}`}
                          value={method}
                        >
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reset Button */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 opacity-0">
                    Reset
                  </label>
                  <Button
                    onClick={handleResetFilters}
                    variant="outline"
                    className="w-full border-slate-300 hover:bg-slate-100"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reset Filters
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Transactions
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by Transaction ID, Client Name, or Contract ID..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transactions Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Transactions
                <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                  {filteredTransactions.length} records
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
                  <p className="text-slate-600">Loading transactions...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    No Transactions Found
                  </h3>
                  <p className="text-slate-600">
                    Try adjusting your filters or check back later.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Transaction ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Client Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Contract ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Penalty
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Method
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {filteredTransactions.map((transaction, index) => (
                        <motion.tr
                          key={transaction.transaction_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-slate-900">
                              {transaction.transaction_id}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-900">
                                {transaction.property_contracts?.client_name ||
                                  "N/A"}
                              </span>
                              {transaction.property_contracts?.client_phone && (
                                <span className="text-xs text-slate-500">
                                  {transaction.property_contracts.client_phone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-slate-600">
                              {transaction.contract_id || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {transaction.transaction_date
                                ? format(
                                    new Date(transaction.transaction_date),
                                    "MMM dd, yyyy"
                                  )
                                : "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold text-green-600">
                              ₱
                              {parseFloat(
                                transaction.total_amount || 0
                              ).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold text-orange-600">
                              ₱
                              {parseFloat(
                                transaction.penalty_paid || 0
                              ).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 capitalize">
                              {transaction.payment_method || "N/A"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              className={`${getStatusColor(
                                transaction.payment_status
                              )} capitalize flex items-center gap-1 w-fit`}
                            >
                              {getStatusIcon(transaction.payment_status)}
                              {transaction.payment_status || "N/A"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleGenerateReceipt(
                                    transaction.transaction_id,
                                    "print"
                                  )
                                }
                                className="bg-purple-500 hover:bg-purple-600 text-white"
                                title="Print Receipt"
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleGenerateReceipt(
                                    transaction.transaction_id,
                                    "download"
                                  )
                                }
                                className="bg-green-500 hover:bg-green-600 text-white"
                                title="Download Receipt"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
