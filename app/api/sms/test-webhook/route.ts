import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('from') || '+15555551234';
  const to = searchParams.get('to') || '+15555554321';
  const body = searchParams.get('body') || 'Test message from webhook tester';

  console.log('=== TESTING WEBHOOK ===');
  console.log('Simulating incoming SMS...');
  console.log({ from, to, body });

  try {
    // Call our own webhook endpoint
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/webhook`;
    console.log('Calling webhook:', webhookUrl);

    const formData = new FormData();
    formData.append('From', from);
    formData.append('To', to);
    formData.append('Body', body);
    formData.append('MessageSid', 'SM' + Math.random().toString(36).substring(2, 15));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    });

    const responseText = await response.text();
    
    console.log('Webhook response status:', response.status);
    console.log('Webhook response:', responseText);

    return NextResponse.json({
      success: true,
      status: response.status,
      response: responseText,
      message: 'Check your terminal/console for detailed logs',
    });
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
