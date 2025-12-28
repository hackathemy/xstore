import { NextResponse } from "next/server";

// API Response helpers
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 500) {
  console.error(`API Error: ${message}`);
  return NextResponse.json({ error: message }, { status });
}

export function apiNotFound(resource = "Resource") {
  return apiError(`${resource} not found`, 404);
}

export function apiPaymentRequired(payment: {
  amount: string;
  recipient: string;
  reason?: string;
}) {
  return NextResponse.json(
    {
      error: "Payment required",
      payment,
    },
    { status: 402 }
  );
}

// Fetcher for client-side
export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}

export async function fetcherWithDefault<T>(url: string, defaultValue: T): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) return defaultValue;
    return response.json();
  } catch {
    return defaultValue;
  }
}
