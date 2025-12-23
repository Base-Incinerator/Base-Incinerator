import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAddress } from "viem";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
);

type MagmaUserRow = {
  wallet_address: string;
  magma_points_total: number;
  referral_points_earned: number;
  referred_by_wallet: string | null;
};

function normalizeAddress(addr: string | null): string | null {
  if (!addr) return null;
  return isAddress(addr) ? addr.toLowerCase() : null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Keep compatibility with both query params
    const walletParam =
      searchParams.get("address") ?? searchParams.get("wallet");
    const wallet = normalizeAddress(walletParam);

    if (!wallet) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // 1) Read user profile
    const { data: user, error: userError } = await supabase
      .from("magma_users")
      .select(
        "wallet_address, magma_points_total, referral_points_earned, referred_by_wallet"
      )
      .eq("wallet_address", wallet)
      .maybeSingle<MagmaUserRow>();

    if (userError) throw userError;

    // 2) Total users (for rank context)
    const { count: totalUsers, error: totalUsersError } = await supabase
      .from("magma_users")
      .select("wallet_address", { count: "exact", head: true });

    if (totalUsersError) throw totalUsersError;

    // If user does not exist yet, return empty profile
    if (!user) {
      return NextResponse.json({
        walletAddress: wallet,
        magmaPointsTotal: 0,
        referralPointsEarned: 0,
        referralCount: 0,
        referredByWallet: null,
        rank: null,
        totalUsers: totalUsers ?? 0,
      });
    }

    // 3) Count referred users dynamically
    const { count: referralCount, error: referralCountError } = await supabase
      .from("magma_users")
      .select("wallet_address", { count: "exact", head: true })
      .eq("referred_by_wallet", wallet);

    if (referralCountError) throw referralCountError;

    // 4) Rank (1 + users with strictly higher points)
    const userPoints = user.magma_points_total ?? 0;

    let rank: number | null = null;

    if (userPoints > 0) {
      const { count: higherCount, error: higherCountError } = await supabase
        .from("magma_users")
        .select("wallet_address", { count: "exact", head: true })
        .gt("magma_points_total", userPoints);

      if (higherCountError) throw higherCountError;

      rank = (higherCount ?? 0) + 1;
    }

    return NextResponse.json({
      walletAddress: wallet,
      magmaPointsTotal: userPoints,
      referralPointsEarned: user.referral_points_earned ?? 0,
      referralCount: referralCount ?? 0,
      referredByWallet: user.referred_by_wallet,
      rank,
      totalUsers: totalUsers ?? 0,
    });
  } catch (err) {
    console.error("profile error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
