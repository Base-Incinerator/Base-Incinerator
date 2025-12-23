import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAddress } from "viem";
import { INCINERATOR_ADDRESS } from "@/lib/contract";

type RequestBody = {
  walletAddress: string;
  txHash: string;
  referrer?: string | null;
};

type MagmaUserRow = {
  wallet_address: string;
  magma_points_total: number;
  referral_points_earned: number;
  referred_by_wallet: string | null;
};

type MoralisTxResponse = {
  from_address?: string;
  to_address?: string;
  receipt_status?: number | string | null;
  receipt_status_code?: number | string | null;
  receipt_status_name?: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
);

const MAGMA_PER_BURN = 100;
const REFERRAL_POINTS = 10;

const MORALIS_API_BASE = "https://deep-index.moralis.io/api/v2.2";
const MORALIS_CHAIN = "base";

function normalizeAddress(addr: string | null | undefined): string | null {
  if (!addr) return null;
  return isAddress(addr) ? addr.toLowerCase() : null;
}

function normalizeTxHash(tx: string | null | undefined): string | null {
  if (!tx) return null;
  const trimmed = tx.trim().toLowerCase();
  return /^0x[a-f0-9]{64}$/.test(trimmed) ? trimmed : null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isStatusSuccess(statusRaw: unknown): boolean {
  if (typeof statusRaw === "number") return statusRaw === 1;
  if (typeof statusRaw === "string") {
    const s = statusRaw.trim().toLowerCase();
    return s === "1" || s === "success";
  }
  return false;
}

function pickReceiptStatus(tx: MoralisTxResponse): unknown {
  return (
    tx.receipt_status ??
    tx.receipt_status_code ??
    tx.receipt_status_name ??
    null
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    const wallet = normalizeAddress(body.walletAddress);
    let referrer = normalizeAddress(body.referrer ?? null);
    const txHash = normalizeTxHash(body.txHash);

    if (!wallet) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    if (!txHash) {
      return NextResponse.json({ error: "Invalid txHash" }, { status: 400 });
    }

    // no self-referral
    if (referrer === wallet) {
      referrer = null;
    }

    // 1️⃣ Prevent double counting
    const { data: burnExisting, error: burnCheckError } = await supabase
      .from("magma_burns")
      .select("id")
      .eq("tx_hash", txHash)
      .maybeSingle<{ id: number }>();

    if (burnCheckError) throw burnCheckError;

    if (burnExisting?.id) {
      const { data: userRow } = await supabase
        .from("magma_users")
        .select("magma_points_total")
        .eq("wallet_address", wallet)
        .maybeSingle<{ magma_points_total: number }>();

      return NextResponse.json({
        success: true,
        alreadyCounted: true,
        wallet,
        magmaPointsTotal: userRow?.magma_points_total ?? 0,
        awardedPoints: 0,
        referralPointsAwarded: 0,
      });
    }

    // 2️⃣ Verify transaction via Moralis
    const apiKey = process.env.MORALIS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Moralis API key missing" },
        { status: 500 }
      );
    }

    let txRes: Response | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(
        `${MORALIS_API_BASE}/transaction/${txHash}?chain=${encodeURIComponent(
          MORALIS_CHAIN
        )}`,
        {
          headers: {
            "X-API-Key": apiKey,
            accept: "application/json",
          },
        }
      );

      if (res.ok) {
        txRes = res;
        break;
      }

      if (attempt < 2) await delay(3000);
    }

    if (!txRes) {
      return NextResponse.json(
        { error: "Failed to fetch transaction from Moralis" },
        { status: 502 }
      );
    }

    const txJson = (await txRes.json()) as MoralisTxResponse;

    const from = txJson.from_address?.toLowerCase() ?? null;
    const to = txJson.to_address?.toLowerCase() ?? null;
    const statusRaw = pickReceiptStatus(txJson);

    if (
      from !== wallet ||
      to !== INCINERATOR_ADDRESS.toLowerCase() ||
      !isStatusSuccess(statusRaw)
    ) {
      return NextResponse.json(
        { error: "Transaction is not a valid burn" },
        { status: 400 }
      );
    }

    // 3️⃣ Read existing user
    const { data: existingUser } = await supabase
      .from("magma_users")
      .select("magma_points_total, referred_by_wallet")
      .eq("wallet_address", wallet)
      .maybeSingle<
        Pick<MagmaUserRow, "magma_points_total" | "referred_by_wallet">
      >();

    const effectiveReferrer =
      existingUser?.referred_by_wallet ?? referrer ?? null;

    // 4️⃣ Upsert / update user
    if (!existingUser) {
      await supabase.from("magma_users").insert({
        wallet_address: wallet,
        magma_points_total: MAGMA_PER_BURN,
        referral_points_earned: 0,
        referred_by_wallet: effectiveReferrer,
      });
    } else {
      await supabase
        .from("magma_users")
        .update({
          magma_points_total:
            (existingUser.magma_points_total ?? 0) + MAGMA_PER_BURN,
          referred_by_wallet:
            existingUser.referred_by_wallet ?? effectiveReferrer,
        })
        .eq("wallet_address", wallet);
    }

    // 5️⃣ Referral reward (per burn)
    let referralPointsAwarded = 0;

    if (effectiveReferrer && effectiveReferrer !== wallet) {
      const { data: refRow } = await supabase
        .from("magma_users")
        .select("magma_points_total, referral_points_earned")
        .eq("wallet_address", effectiveReferrer)
        .maybeSingle<
          Pick<MagmaUserRow, "magma_points_total" | "referral_points_earned">
        >();

      if (!refRow) {
        await supabase.from("magma_users").insert({
          wallet_address: effectiveReferrer,
          magma_points_total: REFERRAL_POINTS,
          referral_points_earned: REFERRAL_POINTS,
          referred_by_wallet: null,
        });
      } else {
        await supabase
          .from("magma_users")
          .update({
            magma_points_total:
              (refRow.magma_points_total ?? 0) + REFERRAL_POINTS,
            referral_points_earned:
              (refRow.referral_points_earned ?? 0) + REFERRAL_POINTS,
          })
          .eq("wallet_address", effectiveReferrer);
      }

      referralPointsAwarded = REFERRAL_POINTS;
    }

    // 6️⃣ Lock txHash
    await supabase.from("magma_burns").insert({
      wallet_address: wallet,
      tx_hash: txHash,
      points_awarded: MAGMA_PER_BURN,
    });

    return NextResponse.json({
      success: true,
      alreadyCounted: false,
      wallet,
      awardedPoints: MAGMA_PER_BURN,
      referralPointsAwarded,
    });
  } catch (err) {
    console.error("record-burn error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
