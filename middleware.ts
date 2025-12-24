import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Payment configuration for reservations
const PAYMENT_CONFIG = {
  network: 'movement-testnet',
  reservationFee: '0.001', // 0.001 MOVE reservation fee
  currency: 'MOVE',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply payment requirement to reservation creation
  if (pathname === '/api/reservations' && request.method === 'POST') {
    const paymentHeader = request.headers.get('x-payment');
    const paymentRecipient = request.headers.get('x-payment-recipient');

    if (!paymentHeader) {
      // Return 402 Payment Required
      return new NextResponse(
        JSON.stringify({
          error: 'Payment Required',
          payment: {
            version: '1',
            network: PAYMENT_CONFIG.network,
            amount: PAYMENT_CONFIG.reservationFee,
            currency: PAYMENT_CONFIG.currency,
            description: 'Reservation deposit fee',
            instruction: 'Send payment to store owner and include transaction hash in x-payment header',
          },
        }),
        {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            'X-Payment-Required': JSON.stringify({
              version: '1',
              network: PAYMENT_CONFIG.network,
              amount: PAYMENT_CONFIG.reservationFee,
              currency: PAYMENT_CONFIG.currency,
            }),
          },
        }
      );
    }

    // If payment header exists, log it and continue
    // In production, verify the transaction on-chain
    console.log('Payment received:', {
      txHash: paymentHeader,
      recipient: paymentRecipient,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/reservations'],
};
