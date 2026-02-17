import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// GET /api/agency/clients - List all client accounts (agency only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');
    const userId = searchParams.get('userId');

    if (!agencyId || !userId) {
      return NextResponse.json(
        { error: 'agencyId and userId are required' },
        { status: 400 }
      );
    }

    // Verify user is agency owner/admin
    const { data: member } = await supabaseAdmin
      .from('account_members')
      .select('role')
      .eq('account_id', agencyId)
      .eq('user_id', userId)
      .single();

    if (!member || !['agency_owner', 'agency_admin'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Agency access required' },
        { status: 403 }
      );
    }

    // Get all client accounts under this agency
    const { data: clients, error } = await supabaseAdmin
      .from('accounts')
      .select(`
        *,
        members:account_members(count)
      `)
      .eq('parent_account_id', agencyId)
      .eq('account_type', 'client')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('Error in GET /api/agency/clients:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/agency/clients - Create new client account
export async function POST(request: NextRequest) {
  try {
    const {
      agencyId,
      userId,
      name,
      slug,
      domain,
      settings
    } = await request.json();

    if (!agencyId || !userId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user is agency owner/admin
    const { data: member } = await supabaseAdmin
      .from('account_members')
      .select('role')
      .eq('account_id', agencyId)
      .eq('user_id', userId)
      .single();

    if (!member || !['agency_owner', 'agency_admin'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Agency access required' },
        { status: 403 }
      );
    }

    // Generate slug if not provided
    const clientSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if slug already exists
    const { data: existingSlug } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('slug', clientSlug)
      .single();

    if (existingSlug) {
      return NextResponse.json(
        { error: 'An account with this slug already exists' },
        { status: 409 }
      );
    }

    // Create client account
    const { data: client, error: clientError } = await supabaseAdmin
      .from('accounts')
      .insert({
        name,
        slug: clientSlug,
        type: null, // Legacy column, set to null
        account_type: 'client',
        parent_account_id: agencyId,
        domain,
        settings: settings || {}
      })
      .select()
      .single();

    if (clientError) {
      console.error('Error creating client:', clientError);
      return NextResponse.json(
        { error: 'Failed to create client account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      client
    });
  } catch (error: any) {
    console.error('Error in POST /api/agency/clients:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
