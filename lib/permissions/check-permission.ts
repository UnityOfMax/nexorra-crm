import { supabaseAdmin } from '@/lib/supabase';
import type { Permissions, UserRole } from '@/types/agency';

/**
 * Check if a user has a specific permission for an account
 */
export async function checkPermission(
  userId: string,
  accountId: string,
  permission: string
): Promise<boolean> {
  try {
    // Get user's role and permissions for this account
    const { data: member, error } = await supabaseAdmin
      .from('account_members')
      .select('role, permissions, status')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('status', 'active')
      .single();

    if (error || !member) {
      return false;
    }

    // Agency owners have all permissions
    if (member.role === 'agency_owner' || member.role === 'agency_admin') {
      return true;
    }

    // Check specific permission
    const permissions = member.permissions as Permissions;
    const permissionPath = permission.split('.');

    let current: any = permissions;
    for (const key of permissionPath) {
      if (current[key] === undefined) {
        return false;
      }
      current = current[key];
    }

    return current === true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Check if user is an agency owner/admin
 */
export async function isAgencyOwner(userId: string): Promise<boolean> {
  try {
    const { data: members, error } = await supabaseAdmin
      .from('account_members')
      .select('role, accounts!inner(account_type)')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error || !members) {
      return false;
    }

    return members.some(
      (m: any) =>
        (m.role === 'agency_owner' || m.role === 'agency_admin') &&
        m.accounts.account_type === 'agency'
    );
  } catch (error) {
    console.error('Error checking agency owner:', error);
    return false;
  }
}

/**
 * Get user's role for a specific account
 */
export async function getUserRole(
  userId: string,
  accountId: string
): Promise<UserRole | null> {
  try {
    const { data: member, error } = await supabaseAdmin
      .from('account_members')
      .select('role')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('status', 'active')
      .single();

    if (error || !member) {
      return null;
    }

    return member.role as UserRole;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Get user's permissions for a specific account
 */
export async function getUserPermissions(
  userId: string,
  accountId: string
): Promise<Permissions | null> {
  try {
    const { data: member, error } = await supabaseAdmin
      .from('account_members')
      .select('permissions, role')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('status', 'active')
      .single();

    if (error || !member) {
      return null;
    }

    return member.permissions as Permissions;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }
}

/**
 * Check if user has access to a client account (either as member or agency owner)
 */
export async function canAccessAccount(
  userId: string,
  accountId: string
): Promise<boolean> {
  try {
    // Check if user is a member of the account
    const { data: directMember } = await supabaseAdmin
      .from('account_members')
      .select('id')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('status', 'active')
      .single();

    if (directMember) {
      return true;
    }

    // Check if user is agency owner of parent account
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('parent_account_id')
      .eq('id', accountId)
      .single();

    if (account?.parent_account_id) {
      const { data: agencyMember } = await supabaseAdmin
        .from('account_members')
        .select('role')
        .eq('user_id', userId)
        .eq('account_id', account.parent_account_id)
        .eq('status', 'active')
        .single();

      if (agencyMember && ['agency_owner', 'agency_admin'].includes(agencyMember.role)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking account access:', error);
    return false;
  }
}

/**
 * Middleware function for API routes to check permissions
 */
export async function requirePermission(
  userId: string,
  accountId: string,
  permission: string
): Promise<{ authorized: boolean; error?: string }> {
  const hasAccess = await canAccessAccount(userId, accountId);
  if (!hasAccess) {
    return {
      authorized: false,
      error: 'You do not have access to this account'
    };
  }

  const hasPermission = await checkPermission(userId, accountId, permission);
  if (!hasPermission) {
    return {
      authorized: false,
      error: `You do not have permission to ${permission}`
    };
  }

  return { authorized: true };
}
