import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendInvitationEmail } from '@/lib/email/send-invitation';
import { getDefaultPermissions } from '@/types/agency';
import type { UserRole } from '@/types/agency';
import crypto from 'crypto';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

// GET /api/invitations - List invitations for an account
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;

    const { data: invitations, error } = await supabaseAdmin
      .from('user_invitations')
      .select(`
        *,
        account:accounts(id, name, account_type),
        inviter:users!invited_by(id, email, full_name)
      `)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ invitations });
  } catch (error: any) {
    console.error('Error in GET /api/invitations:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/invitations - Create and send invitation
export async function POST(request: NextRequest) {
  try {
    const {
      accountId,
      email,
      role,
      invitedBy,
      customPermissions
    } = await request.json();

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;

    if (!accountId || !email || !role || !invitedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if user already exists with this email
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      // Check if already a member
      const { data: existingMember } = await supabaseAdmin
        .from('account_members')
        .select('id')
        .eq('account_id', accountId)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this account' },
          { status: 409 }
        );
      }
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabaseAdmin
      .from('user_invitations')
      .select('id, status')
      .eq('account_id', accountId)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 409 }
      );
    }

    // Get account details
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('id, name, account_type')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Get inviter details
    const { data: inviter } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .eq('id', invitedBy)
      .single();

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiration (48 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Get permissions
    const permissions = customPermissions || getDefaultPermissions(role as UserRole);

    // Create invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('user_invitations')
      .insert({
        account_id: accountId,
        email: email.toLowerCase(),
        role,
        permissions,
        invited_by: invitedBy,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Send invitation email
    const activationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/activate?token=${token}`;

    try {
      await sendInvitationEmail({
        to: email,
        inviterName: inviter?.full_name || inviter?.email || 'Someone',
        accountName: account.name,
        role: role.replace(/_/g, ' '),
        activationUrl,
        expiresInHours: 48
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email fails, but log it
    }

    return NextResponse.json({
      success: true,
      invitation
    });
  } catch (error: any) {
    console.error('Error in POST /api/invitations:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
