import { NextResponse } from 'next/server';
import { createPaymentOrder } from '@/lib/actions/online-payments';
import { getUserProfile } from '@/lib/actions/auth';

export async function POST(req: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scheduleId } = await req.json();

    if (!scheduleId) {
      return NextResponse.json({ error: 'scheduleId is required' }, { status: 400 });
    }

    const result = await createPaymentOrder(scheduleId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      orderId: result.orderId,
      paymentSessionId: result.paymentSessionId,
      amount: result.amount
    });

  } catch (error: any) {
    console.error('Create Order API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
