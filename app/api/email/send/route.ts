import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('=== EMAIL SEND API CALLED ===');
  
  try {
    const { accountId, to, subject, htmlContent, textContent, contactId } = await request.json();

    console.log('Email request:', { accountId, to, subject, contactId });

    if (!accountId || !to || !subject || (!htmlContent && !textContent)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get Resend API key from environment
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json(
        { error: 'Resend not configured. Please add RESEND_API_KEY to environment variables.' },
        { status: 500 }
      );
    }

    // Get account settings for from email/name
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('settings, owner_id')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('Account error:', accountError);
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    const fromEmail = account.settings?.from_email;
    const fromName = account.settings?.from_name || 'CRM System';

    if (!fromEmail) {
      return NextResponse.json(
        { error: 'No "from" email configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    console.log('Sending via Resend...');
    console.log('From:', `${fromName} <${fromEmail}>`);
    console.log('To:', to);

    // Initialize Resend
    const resend = new Resend(resendApiKey);

    // Send email
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: subject,
      html: htmlContent || `<p>${textContent}</p>`,
      text: textContent,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send email via Resend' },
        { status: 500 }
      );
    }

    console.log('Email sent via Resend:', data?.id);

    // Save message to messages table
    const { error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        account_id: accountId,
        contact_id: contactId || null,
        direction: 'outbound',
        type: 'email',
        content: textContent || htmlContent,
        from_address: fromEmail,
        to_address: to,
        status: 'sent',
        external_id: data?.id,
        metadata: { subject },
      });

    if (messageError) {
      console.error('Error saving message:', messageError);
    }

    // Also log as activity
    await supabaseAdmin.from('activities').insert({
      account_id: accountId,
      contact_id: contactId || null,
      type: 'email',
      subject: subject,
      description: textContent || htmlContent.substring(0, 500),
      completed: true,
      created_by: account.owner_id,
    });

    console.log('=== EMAIL SENT SUCCESSFULLY ===');

    return NextResponse.json({
      success: true,
      messageId: data?.id,
    });
  } catch (error: any) {
    console.error('=== EMAIL SEND ERROR ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
