import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { schedule_id } = body;

    console.log("🔄 Reverting payment for schedule:", schedule_id);

    if (!schedule_id) {
      return NextResponse.json(
        { success: false, message: "Schedule ID is required" },
        { status: 400 }
      );
    }

    // Get the payment schedule details
    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from("contract_payment_schedules")
      .select("*")
      .eq("schedule_id", schedule_id)
      .single();

    if (scheduleError || !schedule) {
      console.error("❌ Schedule not found:", scheduleError);
      return NextResponse.json(
        { success: false, message: "Payment schedule not found" },
        { status: 404 }
      );
    }

    // Check if payment is actually paid
    if (schedule.payment_status !== "paid") {
      return NextResponse.json(
        {
          success: false,
          message: "Payment schedule is not in paid status",
        },
        { status: 400 }
      );
    }

    console.log("📋 Schedule details:", {
      schedule_id: schedule.schedule_id,
      current_status: schedule.payment_status,
      paid_amount: schedule.paid_amount,
      remaining_amount: schedule.remaining_amount,
    });

    // Get all transactions for this schedule
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from("contract_payment_transactions")
      .select("*")
      .eq("schedule_id", schedule_id)
      .order("transaction_date", { ascending: false });

    if (transactionsError) {
      console.error("❌ Error fetching transactions:", transactionsError);
      return NextResponse.json(
        { success: false, message: "Failed to fetch payment transactions" },
        { status: 500 }
      );
    }

    console.log(`📦 Found ${transactions?.length || 0} transactions to revert`);

    // Start transaction by updating payment schedule
    const newRemainingAmount = schedule.scheduled_amount;
    const newPaidAmount = 0;

    // Update payment schedule to pending
    const { error: updateScheduleError } = await supabaseAdmin
      .from("contract_payment_schedules")
      .update({
        payment_status: "pending",
        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("schedule_id", schedule_id);

    if (updateScheduleError) {
      console.error("❌ Failed to update schedule:", updateScheduleError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to update payment schedule",
          error: updateScheduleError,
        },
        { status: 500 }
      );
    }

    // Mark all related transactions as reverted
    if (transactions && transactions.length > 0) {
      const { error: updateTransactionsError } = await supabaseAdmin
        .from("contract_payment_transactions")
        .update({
          transaction_status: "reverted",
          notes: `Payment reverted on ${new Date().toLocaleDateString()}`,
          updated_at: new Date().toISOString(),
        })
        .in(
          "transaction_id",
          transactions.map((t) => t.transaction_id)
        );

      if (updateTransactionsError) {
        console.error(
          "⚠️ Warning: Failed to update transactions:",
          updateTransactionsError
        );
        // Don't fail the entire operation if transaction update fails
      }
    }

    // Recalculate contract totals
    const { data: allSchedules, error: allSchedulesError } = await supabaseAdmin
      .from("contract_payment_schedules")
      .select("paid_amount")
      .eq("contract_id", schedule.contract_id);

    if (allSchedulesError) {
      console.error(
        "⚠️ Warning: Failed to fetch schedules:",
        allSchedulesError
      );
    } else {
      const totalPaid = allSchedules.reduce(
        (sum, s) => sum + (parseFloat(s.paid_amount) || 0),
        0
      );
      const totalScheduled = schedule.contract.downpayment_total || 0;
      const newRemainingBalance = totalScheduled - totalPaid;

      // Update contract remaining balance
      const { error: updateContractError } = await supabaseAdmin
        .from("contract_to_sell_tbl")
        .update({
          remaining_balance: newRemainingBalance,
          remaining_downpayment: newRemainingBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("contract_id", schedule.contract_id);

      if (updateContractError) {
        console.error(
          "⚠️ Warning: Failed to update contract:",
          updateContractError
        );
      }
    }

    console.log("✅ Payment reverted successfully");

    return NextResponse.json({
      success: true,
      message: "Payment reverted to pending successfully",
      data: {
        schedule_id: schedule_id,
        transactions_reverted: transactions?.length || 0,
      },
    });
  } catch (error) {
    console.error("❌ Error reverting payment:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to revert payment: " + error.message,
      },
      { status: 500 }
    );
  }
}
