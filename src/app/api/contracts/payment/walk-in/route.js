import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Function to create Supabase admin client safely
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Create Supabase admin client
const supabaseAdmin = createSupabaseAdmin();

/**
 * Calculate penalty for overdue payment
 * Penalty starts 3 days after due date
 * Default penalty rate: 2% per month (or from schedule.penalty_rate)
 */
function calculatePenalty(schedule) {
  const dueDate = new Date(schedule.due_date);
  const currentDate = new Date();

  // Add 3 days grace period
  const gracePeriodEnd = new Date(dueDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

  // Check if payment is overdue (beyond grace period)
  if (currentDate <= gracePeriodEnd) {
    return 0; // No penalty within grace period
  }

  // Calculate days overdue (after grace period)
  const daysOverdue = Math.floor((currentDate - gracePeriodEnd) / (1000 * 60 * 60 * 24));

  if (daysOverdue <= 0) {
    return 0;
  }

  // Get penalty rate from schedule or use default (2% per month = 0.02)
  const penaltyRate = schedule.penalty_rate || 0.02;

  // Calculate penalty based on scheduled amount
  const scheduledAmount = parseFloat(schedule.scheduled_amount || 0);

  // Apply monthly penalty rate, converted to daily
  // Formula: (scheduled_amount * penalty_rate / 30 days) * days_overdue
  const dailyPenaltyRate = penaltyRate / 30;
  const penaltyAmount = scheduledAmount * dailyPenaltyRate * daysOverdue;

  return Math.round(penaltyAmount * 100) / 100; // Round to 2 decimal places
}

/**
 * POST /api/contracts/payment/walk-in
 * Process a walk-in payment for a contract installment
 */
export async function POST(request) {
  try {
    console.log("🔷 Walk-in payment API called");

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error"
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      schedule_id,
      contract_id,
      amount_paid,
      penalty_paid = 0,
      payment_method = "cash",
      reference_number = null,
      check_number = null,
      bank_name = null,
      processed_by = null,
      processed_by_name = "System",
      notes = null,
    } = body;

    console.log("📝 Payment details:", {
      schedule_id,
      contract_id,
      amount_paid,
      penalty_paid,
      payment_method,
    });

    // Validate required fields
    if (!schedule_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Schedule ID is required",
        },
        { status: 400 }
      );
    }

    if (!amount_paid || amount_paid <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid payment amount is required",
        },
        { status: 400 }
      );
    }

    // Get schedule details first to validate
    const { data: scheduleData, error: scheduleError } = await supabaseAdmin
      .from("contract_payment_schedules")
      .select("*, contract:property_contracts(*)")
      .eq("schedule_id", schedule_id)
      .single();

    if (scheduleError || !scheduleData) {
      console.error("❌ Schedule not found:", scheduleError);
      return NextResponse.json(
        {
          success: false,
          error: "Payment schedule not found",
        },
        { status: 404 }
      );
    }

    // Auto-calculate penalty if not provided (3 days after due date)
    const calculatedPenalty = calculatePenalty(scheduleData);
    const finalPenaltyPaid = penalty_paid > 0 ? penalty_paid : calculatedPenalty;

    console.log("💰 Penalty calculation:", {
      provided_penalty: penalty_paid,
      calculated_penalty: calculatedPenalty,
      final_penalty_paid: finalPenaltyPaid,
    });

    // Update penalty_amount in schedule if there's a calculated penalty
    if (calculatedPenalty > 0 && calculatedPenalty !== scheduleData.penalty_amount) {
      await supabaseAdmin
        .from("contract_payment_schedules")
        .update({ penalty_amount: calculatedPenalty })
        .eq("schedule_id", schedule_id);

      console.log("✅ Updated penalty_amount in schedule:", calculatedPenalty);
    }

    // Recalculate remaining amount including penalty
    const remainingAmountWithPenalty =
      parseFloat(scheduleData.scheduled_amount) -
      parseFloat(scheduleData.paid_amount) +
      parseFloat(calculatedPenalty);

    // Validate payment amount doesn't exceed remaining
    const totalPayment = parseFloat(amount_paid) + parseFloat(finalPenaltyPaid);

    if (totalPayment > remainingAmountWithPenalty) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount (₱${totalPayment.toFixed(2)}) exceeds remaining balance (₱${remainingAmountWithPenalty.toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    console.log("✅ Payment validation passed");

    // Call the database function to record payment (use calculated penalty)
    const { data: paymentResult, error: paymentError } = await supabaseAdmin.rpc(
      "record_walk_in_payment",
      {
        p_schedule_id: schedule_id,
        p_amount_paid: parseFloat(amount_paid),
        p_penalty_paid: parseFloat(finalPenaltyPaid),
        p_payment_method: payment_method,
        p_reference_number: reference_number,
        p_processed_by: processed_by,
        p_processed_by_name: processed_by_name,
        p_notes: notes,
      }
    );

    if (paymentError) {
      console.error("❌ Payment recording error:", paymentError);
      return NextResponse.json(
        {
          success: false,
          error: paymentError.message || "Failed to record payment",
          details: paymentError,
        },
        { status: 400 }
      );
    }

    console.log("💰 Payment recorded:", paymentResult);

    // If we have check/bank details, update the transaction
    if (paymentResult && paymentResult.length > 0) {
      const transactionId = paymentResult[0].transaction_id;

      if (check_number || bank_name) {
        await supabaseAdmin
          .from("contract_payment_transactions")
          .update({
            check_number,
            bank_name,
          })
          .eq("transaction_id", transactionId);
      }
    }

    // Fetch updated schedule and contract data
    const { data: updatedSchedule } = await supabaseAdmin
      .from("contract_payment_schedules")
      .select("*")
      .eq("schedule_id", schedule_id)
      .single();

    const { data: updatedContract } = await supabaseAdmin
      .from("property_contracts")
      .select("*")
      .eq("contract_id", scheduleData.contract_id)
      .single();

    console.log("✅ Walk-in payment processed successfully");

    return NextResponse.json({
      success: true,
      message: "Walk-in payment processed successfully",
      data: {
        transaction: paymentResult[0],
        updated_schedule: updatedSchedule,
        updated_contract: updatedContract,
      },
    });
  } catch (error) {
    console.error("❌ Walk-in payment API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contracts/payment/walk-in?schedule_id=xxx
 * Get payment details for a schedule
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("schedule_id");

    if (!scheduleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Schedule ID is required",
        },
        { status: 400 }
      );
    }

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error"
        },
        { status: 500 }
      );
    }

    // Get schedule with contract details
    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from("contract_payment_schedules")
      .select(`
        *,
        contract:property_contracts(
          contract_id,
          contract_number,
          client_name,
          client_email,
          property_title
        )
      `)
      .eq("schedule_id", scheduleId)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment schedule not found",
        },
        { status: 404 }
      );
    }

    // Get existing transactions for this schedule
    const { data: transactions } = await supabaseAdmin
      .from("contract_payment_transactions")
      .select("*")
      .eq("schedule_id", scheduleId)
      .order("transaction_date", { ascending: false });

    // Calculate current penalty (3 days after due date)
    const calculatedPenalty = calculatePenalty(schedule);

    // Calculate days overdue for display
    const dueDate = new Date(schedule.due_date);
    const gracePeriodEnd = new Date(dueDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);
    const currentDate = new Date();
    const daysOverdue = Math.max(0, Math.floor((currentDate - gracePeriodEnd) / (1000 * 60 * 60 * 24)));

    // Update penalty_amount in database if calculated penalty is different
    if (calculatedPenalty > 0 && calculatedPenalty !== schedule.penalty_amount) {
      await supabaseAdmin
        .from("contract_payment_schedules")
        .update({ penalty_amount: calculatedPenalty })
        .eq("schedule_id", scheduleId);

      console.log("✅ Updated penalty_amount in schedule:", calculatedPenalty);
    }

    return NextResponse.json({
      success: true,
      data: {
        schedule: {
          ...schedule,
          penalty_amount: calculatedPenalty, // Use the updated penalty value
          calculated_penalty: calculatedPenalty,
          days_overdue_after_grace: daysOverdue,
          grace_period_end: gracePeriodEnd.toISOString().split('T')[0],
        },
        transactions: transactions || [],
      },
    });
  } catch (error) {
    console.error("❌ Get payment details error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
