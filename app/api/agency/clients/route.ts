import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
      location,
      userInfo,
      timezone,
      campaign,
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

    // Auto-generate sending email from location name
    let fromEmail = '';
    let fromName = '';
    if (location?.first_name && location?.last_name) {
      const firstName = location.first_name.toLowerCase().replace(/\s+/g, '');
      const lastName = location.last_name.toLowerCase().replace(/\s+/g, '');
      fromEmail = `${firstName}${lastName}@contact.ourlimitedoffer.com`;
      fromName = `${location.first_name} ${location.last_name}`;
    }

    // Build account settings
    const accountSettings: any = {};
    if (location) {
      accountSettings.location = {
        first_name: location.first_name,
        last_name: location.last_name,
        email: location.email,
        phone: location.phone || null,
        address: location.address || null,
      };
    }
    if (fromEmail) {
      accountSettings.from_email = fromEmail;
      accountSettings.from_name = fromName;
    }
    if (timezone) {
      accountSettings.timezone = timezone;
    }
    if (campaign && Object.keys(campaign).length > 0) {
      accountSettings.campaign = {
        monthly_budget: campaign.monthly_budget || null,
        currency: campaign.currency || 'USD',
        target_locations: campaign.target_locations || [],
        target_client_type: campaign.target_client_type || [],
        facebook_page_id: campaign.facebook_page_id || null,
        meta_ad_account_id: campaign.meta_ad_account_id || null,
      };
    }

    // Create client account
    const { data: client, error: clientError } = await supabaseAdmin
      .from('accounts')
      .insert({
        name,
        slug: clientSlug,
        type: null,
        account_type: 'client',
        parent_account_id: agencyId,
        domain: domain || null,
        settings: accountSettings,
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

    // Auto-create default pipeline with standard stages
    if (client) {
      try {
        const { data: pipeline } = await supabaseAdmin
          .from('pipelines')
          .insert({
            account_id: client.id,
            name: 'Sales Pipeline',
            type: 'sales',
            is_default: true,
            position: 0,
          })
          .select()
          .single();

        if (pipeline) {
          const stages = [
            { name: 'New Lead',            color: '#3b82f6', position: 0, probability: 10,  is_closed: false, is_won: false },
            { name: 'Hot Lead',            color: '#f59e0b', position: 1, probability: 30,  is_closed: false, is_won: false },
            { name: 'Booked Appointment',  color: '#8b5cf6', position: 2, probability: 50,  is_closed: false, is_won: false },
            { name: 'Closed Deal',         color: '#22c55e', position: 3, probability: 100, is_closed: true,  is_won: true  },
            { name: 'No Show',             color: '#ef4444', position: 4, probability: 0,   is_closed: true,  is_won: false },
            { name: 'Long-Term Nurturing', color: '#6b7280', position: 5, probability: 20,  is_closed: false, is_won: false },
          ].map(s => ({ ...s, pipeline_id: pipeline.id }));

          await supabaseAdmin.from('pipeline_stages').insert(stages);
        }
      } catch (pipelineError) {
        console.error('Error auto-creating pipeline:', pipelineError);
        // Non-fatal — don't fail account creation
      }
    }

    // Auto-create landing page from real-estate template populated with location info
    if (client) {
      try {
        const agentName = fromName || name;
        const agentEmail = fromEmail || location?.email || '';
        const agentPhone = location?.phone || '';
        const agentAddress = location?.address || '';
        const pageSlug = fromEmail
          ? fromEmail.split('@')[0]
          : clientSlug;

        const landingContent = {
          blocks: [
            {
              id: 'block-auto-1',
              type: 're_hero',
              order: 0,
              data: {
                agentName,
                title: 'Licensed Real Estate Agent',
                subtitle: `Helping families find their dream home. Let's find yours.`,
                profileImageUrl: '',
                bgColor: '#0f172a',
                accentColor: '#f59e0b',
                ctaText: 'View Available Homes',
              },
            },
            {
              id: 'block-auto-2',
              type: 're_about',
              order: 1,
              data: {
                heading: `About ${agentName}`,
                bio: `With years of experience in the real estate market, I specialize in helping first-time buyers, investors, and growing families find the perfect property. My client-first approach means you'll never feel lost in the process.`,
                agentPhotoUrl: '',
                yearsExperience: 5,
                dealsClosed: 50,
                specialties: ['Luxury Homes', 'First-Time Buyers', 'Investment Properties'],
                accentColor: '#f59e0b',
              },
            },
            {
              id: 'block-auto-3',
              type: 're_reviews',
              order: 2,
              data: {
                heading: 'What My Clients Say',
                reviews: [
                  { text: 'Amazing experience from start to finish. Highly recommend!', author: 'Happy Client', location: '', rating: 5 },
                  { text: 'Professional, knowledgeable, and always available. Could not ask for more.', author: 'Satisfied Buyer', location: '', rating: 5 },
                ],
                ctaText: 'Find Your Dream Home',
                accentColor: '#f59e0b',
              },
            },
            {
              id: 'block-auto-4',
              type: 're_location',
              order: 3,
              data: {
                heading: 'Find Me',
                address: agentAddress,
                phone: agentPhone,
                email: agentEmail,
                mapEmbedUrl: '',
                accentColor: '#f59e0b',
              },
            },
            {
              id: 'block-auto-5',
              type: 're_footer',
              order: 4,
              data: {
                agentName,
                brokerage: '',
                phone: agentPhone,
                email: agentEmail,
                license: '',
                accentColor: '#f59e0b',
              },
            },
          ],
          styles: { fontFamily: 'Inter', primaryColor: '#f59e0b', backgroundColor: '#ffffff' },
        };

        await supabaseAdmin.from('landing_pages').insert({
          account_id: client.id,
          name: `${agentName} - Real Estate`,
          slug: pageSlug,
          content: landingContent,
          published: false,
        });
      } catch (pageError) {
        console.error('Error auto-creating landing page:', pageError);
        // Non-fatal — don't fail account creation
      }
    }

    // If user info provided, create an invitation
    if (userInfo?.email && client) {
      try {
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await supabaseAdmin
          .from('invitations')
          .insert({
            account_id: client.id,
            email: userInfo.email,
            role: 'client_owner',
            token,
            invited_by: userId,
            expires_at: expiresAt.toISOString(),
          });

        // Send invitation email
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await fetch(`${appUrl}/api/invitations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: client.id,
            email: userInfo.email,
            role: 'client_owner',
            invitedBy: userId,
          }),
        });
      } catch (inviteError) {
        console.error('Error creating invitation:', inviteError);
        // Don't fail the whole request if invitation fails
      }
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
