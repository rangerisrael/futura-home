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

// POST endpoint to revert contract transfer
export async function POST(request) {
  try {
    const body = await request.json();
    const { contract_id, transfer_id } = body;

    console.log("🔄 API: Reverting contract transfer:", {
      contract_id,
      transfer_id,
    });

    // Validate required fields
    if (!contract_id || !transfer_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields: contract_id and transfer_id",
        },
        { status: 400 }
      );
    }

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get the transfer history record
    const { data: transferRecord, error: transferError } = await supabaseAdmin
      .from("contract_transfer_history")
      .select("*")
      .eq("transfer_id", transfer_id)
      .eq("contract_id", contract_id)
      .single();

    if (transferError || !transferRecord) {
      console.error("❌ Transfer record fetch error:", transferError);
      return NextResponse.json(
        {
          success: false,
          message: "Transfer record not found",
          error: transferError?.message,
        },
        { status: 404 }
      );
    }

    // Get the current contract
    const { data: currentContract, error: contractError } =
      await supabaseAdmin
        .from("property_contracts")
        .select("*")
        .eq("contract_id", contract_id)
        .single();

    if (contractError || !currentContract) {
      console.error("❌ Contract fetch error:", contractError);
      return NextResponse.json(
        {
          success: false,
          message: "Contract not found",
          error: contractError?.message,
        },
        { status: 404 }
      );
    }

    // Revert the contract back to original owner
    const { data: revertedContract, error: revertError } = await supabaseAdmin
      .from("property_contracts")
      .update({
        client_name: transferRecord.original_client_name,
        client_email: transferRecord.original_client_email,
        client_phone: transferRecord.original_client_phone,
        client_address: transferRecord.original_client_address,
        updated_at: new Date().toISOString(),
      })
      .eq("contract_id", contract_id)
      .select()
      .single();

    if (revertError) {
      console.error("❌ Contract revert error:", revertError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to revert contract",
          error: revertError.message,
        },
        { status: 400 }
      );
    }

    // Revert the associated reservation if it exists
    if (currentContract.reservation_id) {
      // We need to find the original user_id - we can try to look it up by email
      const { data: originalUser } = await supabaseAdmin.auth.admin.listUsers();

      const originalUserRecord = originalUser?.users?.find(
        (user) => user.email === transferRecord.original_client_email
      );

      if (originalUserRecord) {
        const { error: reservationError } = await supabaseAdmin
          .from("property_reservations")
          .update({
            user_id: originalUserRecord.id,
            client_name: transferRecord.original_client_name,
            client_email: transferRecord.original_client_email,
            client_phone: transferRecord.original_client_phone,
            client_address: transferRecord.original_client_address,
            updated_at: new Date().toISOString(),
          })
          .eq("reservation_id", currentContract.reservation_id);

        if (reservationError) {
          console.error("❌ Reservation revert error:", reservationError);
          console.warn("⚠️ Failed to revert reservation, but contract revert succeeded");
        } else {
          console.log("✅ Reservation reverted successfully");
        }
      } else {
        console.warn("⚠️ Original user not found in auth, skipping reservation revert");
      }
    }

    // Delete the transfer history record
    const { error: deleteError } = await supabaseAdmin
      .from("contract_transfer_history")
      .delete()
      .eq("transfer_id", transfer_id);

    if (deleteError) {
      console.error("❌ Transfer history delete error:", deleteError);
      console.warn("⚠️ Failed to delete transfer history, but contract reverted successfully");
    } else {
      console.log("✅ Transfer history record deleted");
    }

    console.log("✅ Contract transfer reverted successfully");

    return NextResponse.json({
      success: true,
      message: "Contract transfer reverted successfully",
      data: {
        contract: revertedContract,
        original_owner: {
          name: transferRecord.original_client_name,
          email: transferRecord.original_client_email,
        },
      },
    });
  } catch (error) {
    console.error("❌ Revert transfer error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to revert transfer: " + error.message,
      },
      { status: 500 }
    );
  }
}
