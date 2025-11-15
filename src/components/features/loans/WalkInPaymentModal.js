"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  XCircle,
  CreditCard,
  DollarSign,
  Receipt,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function WalkInPaymentModal({
  isOpen,
  onClose,
  schedule,
  contract,
  onPaymentSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [calculatedPenalty, setCalculatedPenalty] = useState(0);
  const [daysOverdue, setDaysOverdue] = useState(0);
  const [gracePeriodEnd, setGracePeriodEnd] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount_paid: 0,
    penalty_paid: 0,
    payment_method: "cash",
    reference_number: "",
    check_number: "",
    bank_name: "",
    processed_by_name: "",
    notes: "",
  });

  // Fetch payment details with calculated penalty
  React.useEffect(() => {
    if (isOpen && schedule?.schedule_id) {
      fetchPaymentDetails();
    } else {
      // Reset state when modal closes
      setCalculatedPenalty(0);
      setDaysOverdue(0);
      setGracePeriodEnd(null);
      setPaymentData({
        amount_paid: 0,
        penalty_paid: 0,
        payment_method: "cash",
        reference_number: "",
        check_number: "",
        bank_name: "",
        processed_by_name: "",
        notes: "",
      });
    }
  }, [isOpen, schedule?.schedule_id]);

  const fetchPaymentDetails = async () => {
    try {
      const response = await fetch(
        `/api/contracts/payment/walk-in?schedule_id=${schedule.schedule_id}`
      );
      const result = await response.json();

      console.log("🔍 Payment details response:", result);

      if (result.success && result.data.schedule) {
        const scheduleData = result.data.schedule;

        console.log("📋 Schedule data:", {
          due_date: scheduleData.due_date,
          grace_period_end: scheduleData.grace_period_end,
          calculated_penalty: scheduleData.calculated_penalty,
          days_overdue: scheduleData.days_overdue_after_grace,
          remaining_amount: scheduleData.remaining_amount,
        });

        const remainingAmount = parseFloat(scheduleData.remaining_amount || 0);
        const penaltyAmount = parseFloat(scheduleData.calculated_penalty || 0);

        console.log("✅ Auto-filling payment form:", {
          amount_paid: remainingAmount,
          penalty_paid: penaltyAmount,
          total: remainingAmount + penaltyAmount,
        });

        setCalculatedPenalty(penaltyAmount);
        setDaysOverdue(scheduleData.days_overdue_after_grace || 0);
        setGracePeriodEnd(scheduleData.grace_period_end);

        // Auto-fill payment amount (BASE ONLY) and penalty (SEPARATE)
        setPaymentData((prev) => ({
          ...prev,
          amount_paid: remainingAmount.toFixed(2),
          penalty_paid: penaltyAmount.toFixed(2),
        }));

        console.log("✅ Payment form auto-filled successfully");
      }
    } catch (error) {
      console.error("Error fetching payment details:", error);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return "₱0.00";
    return `₱${parseFloat(amount).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleInputChange = (field, value) => {
    setPaymentData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // FORCE base amount to be exactly the remaining amount (never use user input)
    const remainingAmount = parseFloat(schedule.remaining_amount || 0);
    const amountPaid = remainingAmount; // Always pay the exact remaining amount
    const penaltyPaid = parseFloat(calculatedPenalty || 0); // Use the calculated penalty
    const totalPayment = amountPaid + penaltyPaid;

    console.log("💳 Submitting payment:", {
      amount_paid: amountPaid,
      penalty_paid: penaltyPaid,
      total_payment: totalPayment,
      remaining_amount: remainingAmount,
      calculated_penalty: calculatedPenalty,
      expected_total: remainingAmount + calculatedPenalty,
    });

    // Client-side validation
    if (remainingAmount <= 0) {
      alert("❌ ERROR: No remaining amount to pay.");
      setLoading(false);
      return;
    }

    try {
      const payloadData = {
        schedule_id: schedule.schedule_id,
        contract_id: contract.contract_id,
        amount_paid: amountPaid, // This is always equal to remainingAmount
        penalty_paid: penaltyPaid, // This is always equal to calculatedPenalty
        payment_method: paymentData.payment_method,
        reference_number: paymentData.reference_number || null,
        check_number: paymentData.check_number || null,
        bank_name: paymentData.bank_name || null,
        processed_by_name: paymentData.processed_by_name || "Admin",
        notes: paymentData.notes || null,
      };

      console.log("📤 Sending payload to API:", payloadData);

      const response = await fetch("/api/contracts/payment/walk-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadData),
      });

      const result = await response.json();

      console.log("📥 API response:", result);

      if (result.success) {
        console.log("✅ Payment processed successfully!");
        onPaymentSuccess(result.data);
        onClose();
      } else {
        console.error("❌ Payment failed:", result.error);
        alert(`❌ Payment Failed:\n\n${result.error || "Failed to process payment"}`);
      }
    } catch (error) {
      console.error("❌ Payment error:", error);
      alert(`❌ Network Error:\n\nFailed to process payment. Please check your connection and try again.\n\nError: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !schedule || !contract) return null;

  // Use schedule values directly for validation (not paymentData)
  const baseAmount = parseFloat(schedule?.remaining_amount || 0);
  const penaltyAmount = parseFloat(calculatedPenalty || 0);
  const totalPayment = baseAmount + penaltyAmount;
  const expectedTotal = baseAmount + penaltyAmount;

  // Check if amounts are valid for submission
  const isValidPayment = baseAmount > 0 && schedule?.remaining_amount;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white sticky top-0 z-10 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Walk-in Payment</h2>
                    <p className="text-green-100 text-sm mt-1">
                      Process client payment
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Contract & Schedule Info */}
              <Card className="mb-6 border-2 border-blue-100">
                <CardContent className="p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                        Contract Number
                      </p>
                      <p className="font-bold text-blue-900">
                        {contract.contract_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                        Client Name
                      </p>
                      <p className="font-semibold text-gray-900">
                        {contract.client_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                        Installment
                      </p>
                      <Badge className="bg-amber-100 text-amber-800 font-medium">
                        #{schedule.installment_number}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                        Due Date
                      </p>
                      <p className="font-semibold text-gray-900">
                        {schedule.due_date ? new Date(schedule.due_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }) : "N/A"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                        Due Amount
                      </p>
                      <p className="font-bold text-red-600 text-lg">
                        {formatCurrency(schedule.remaining_amount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Details Form */}
              <div className="space-y-5">
                {/* Payment Amount */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Base Payment Amount (Auto-calculated) <span className="text-red-500">*</span>
                    </label>
                  </div>

                  {/* INFO BANNER */}
                  <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-blue-900">
                          ℹ️ Base Amount (Automatically Set)
                        </p>
                        <p className="text-xs text-blue-800 mt-1">
                          This field shows the BASE AMOUNT ONLY (₱{parseFloat(schedule.remaining_amount || 0).toFixed(2)}).
                          Penalty (₱{calculatedPenalty.toFixed(2)}) is added separately below.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5" />
                    <Input
                      type="number"
                      step="0.01"
                      value={paymentData.amount_paid}
                      className="pl-10 text-lg font-semibold bg-blue-50 border-blue-300 cursor-not-allowed"
                      readOnly
                      disabled
                      required
                    />
                  </div>
                  <p className="text-xs text-blue-600 font-semibold mt-2">
                    🔒 This field is automatically calculated and cannot be edited
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-gray-50 border border-gray-300 rounded p-2">
                      <p className="text-xs text-gray-500 mb-1">Base Amount</p>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(schedule.remaining_amount)}</p>
                    </div>
                    {calculatedPenalty > 0 && (
                      <div className="bg-orange-50 border border-orange-300 rounded p-2">
                        <p className="text-xs text-orange-600 mb-1">+ Penalty (separate)</p>
                        <p className="text-sm font-bold text-orange-700">{formatCurrency(calculatedPenalty)}</p>
                      </div>
                    )}
                  </div>

                  {calculatedPenalty > 0 && (
                    <div className="bg-green-50 border border-green-300 rounded-lg p-2 mt-2">
                      <p className="text-xs text-green-700">
                        <span className="font-bold">Total Payment (automatically calculated):</span>
                        <br />
                        {formatCurrency(schedule.remaining_amount)} + {formatCurrency(calculatedPenalty)} = <span className="text-lg font-bold">{formatCurrency(parseFloat(schedule.remaining_amount || 0) + parseFloat(calculatedPenalty))}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Penalty Amount - Always Show */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {calculatedPenalty > 0 ? "Penalty Amount (Auto-calculated)" : "Penalty Information"}
                  </label>

                  {/* Penalty Info Card */}
                  <div className={`${calculatedPenalty > 0 ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200"} border rounded-lg p-3 mb-2`}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className={`w-5 h-5 ${calculatedPenalty > 0 ? "text-orange-500" : "text-blue-500"} mt-0.5 flex-shrink-0`} />
                      <div className="text-xs space-y-1">
                        <p className={`font-semibold ${calculatedPenalty > 0 ? "text-orange-800" : "text-blue-800"}`}>
                          {calculatedPenalty > 0 ? "Overdue Payment Penalty" : "Penalty Policy"}
                        </p>
                        <p className={calculatedPenalty > 0 ? "text-orange-700" : "text-blue-700"}>
                          Due Date: {schedule.due_date ? new Date(schedule.due_date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }) : "N/A"}
                        </p>
                        <p className={calculatedPenalty > 0 ? "text-orange-700" : "text-blue-700"}>
                          Grace Period Ends: {gracePeriodEnd ? new Date(gracePeriodEnd).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }) : "N/A"} (3 days after due date)
                        </p>
                        <p className={calculatedPenalty > 0 ? "text-orange-700" : "text-blue-700"}>
                          Today: {new Date().toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        {calculatedPenalty > 0 && (
                          <p className="text-orange-700">
                            Days Overdue: <span className="font-semibold">{daysOverdue} days</span>
                          </p>
                        )}
                        <p className={calculatedPenalty > 0 ? "text-orange-700" : "text-blue-700"}>
                          Penalty Rate: 3% per month (0.1% per day)
                        </p>
                        {calculatedPenalty === 0 && (
                          <p className="text-blue-700 font-medium">
                            ✓ No penalty applied - Payment is within grace period
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {calculatedPenalty > 0 && (
                    <>
                      <div className="relative">
                        <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 w-5 h-5" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentData.penalty_paid}
                          className="pl-10 bg-orange-50 border-orange-300 font-semibold cursor-not-allowed"
                          readOnly
                          disabled
                        />
                      </div>
                      <p className="text-xs text-orange-600 font-semibold">
                        🔒 This field is automatically calculated and cannot be edited
                      </p>
                      <p className="text-xs text-orange-600">
                        Penalty = Base Amount × 3% per month × Days Overdue ÷ 30 days
                      </p>
                    </>
                  )}
                  {calculatedPenalty === 0 && (
                    <p className="text-xs text-blue-600">
                      No penalty amount to pay - payment is within grace period
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentData.payment_method}
                    onChange={(e) =>
                      handleInputChange("payment_method", e.target.value)
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="gcash">GCash</option>
                    <option value="paymaya">PayMaya</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="check">Check</option>
                    <option value="online_banking">Online Banking</option>
                  </select>
                </div>

                {/* Conditional Fields */}
                {paymentData.payment_method === "check" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Check Number
                      </label>
                      <Input
                        type="text"
                        value={paymentData.check_number}
                        onChange={(e) =>
                          handleInputChange("check_number", e.target.value)
                        }
                        placeholder="Enter check number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Bank Name
                      </label>
                      <Input
                        type="text"
                        value={paymentData.bank_name}
                        onChange={(e) =>
                          handleInputChange("bank_name", e.target.value)
                        }
                        placeholder="Enter bank name"
                      />
                    </div>
                  </div>
                )}

                {["bank_transfer", "gcash", "paymaya", "online_banking"].includes(
                  paymentData.payment_method
                ) && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reference Number
                    </label>
                    <Input
                      type="text"
                      value={paymentData.reference_number}
                      onChange={(e) =>
                        handleInputChange("reference_number", e.target.value)
                      }
                      placeholder="Enter reference number"
                    />
                  </div>
                )}

                {/* Processed By */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Processed By
                  </label>
                  <Input
                    type="text"
                    value={paymentData.processed_by_name}
                    onChange={(e) =>
                      handleInputChange("processed_by_name", e.target.value)
                    }
                    placeholder="Your name"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) =>
                      handleInputChange("notes", e.target.value)
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows="3"
                    placeholder="Add any additional notes..."
                  />
                </div>
              </div>

              {/* Payment Summary */}
              <Card className={`mt-6 bg-gradient-to-br ${!isValidPayment ? 'from-red-50 to-red-100/50 border-red-200' : 'from-green-50 to-green-100/50 border-green-200'} border-2`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Receipt className={`w-5 h-5 ${!isValidPayment ? 'text-red-600' : 'text-green-600'}`} />
                      <h3 className="font-bold text-gray-900">Payment Summary</h3>
                    </div>
                    {isValidPayment && (
                      <div className="flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-semibold text-green-700">Ready to Process</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">Base Payment:</span>
                      <span className="font-semibold text-lg">
                        {formatCurrency(baseAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">Penalty:</span>
                      <span className="font-semibold text-orange-600">
                        {penaltyAmount > 0 ? formatCurrency(penaltyAmount) : "₱0.00"}
                      </span>
                    </div>
                    <div className="bg-white rounded-lg p-3 border-2 border-green-300">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 text-lg">
                          TOTAL TO PAY:
                        </span>
                        <span className="font-bold text-3xl text-green-700">
                          {formatCurrency(totalPayment)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2 text-right">
                        {formatCurrency(baseAmount)} + {formatCurrency(penaltyAmount)} = {formatCurrency(totalPayment)}
                      </p>
                    </div>
                    {!isValidPayment && (
                      <div className="bg-red-100 border-2 border-red-400 rounded-lg p-3 mt-3">
                        <p className="text-sm text-red-900 font-bold flex items-center gap-2">
                          <XCircle className="w-5 h-5" />
                          ❌ CANNOT PROCESS PAYMENT
                        </p>
                        <p className="text-xs text-red-800 mt-2">
                          No remaining amount to pay or invalid schedule data.
                        </p>
                      </div>
                    )}
                    {isValidPayment && calculatedPenalty > 0 && (
                      <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mt-3">
                        <p className="text-xs text-blue-800">
                          ℹ️ <span className="font-semibold">Payment includes penalty:</span> This payment is overdue by {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} after the grace period.
                          A penalty of {formatCurrency(calculatedPenalty)} ({(calculatedPenalty / parseFloat(schedule.remaining_amount || 1) * 100).toFixed(2)}%) has been automatically calculated and will be included in this transaction.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-12"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-semibold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !isValidPayment}
                  title={!isValidPayment ? "Please check payment amounts before processing" : "Process payment"}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : !isValidPayment ? (
                    <>
                      <XCircle className="w-5 h-5 mr-2" />
                      Check Payment Amounts
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Process Payment {totalPayment > 0 ? `(${formatCurrency(totalPayment)})` : ''}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
