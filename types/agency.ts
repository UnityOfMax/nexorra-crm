// Agency Platform Types

export type AccountType = 'agency' | 'client';

export type UserRole =
  | 'agency_owner'
  | 'agency_admin'
  | 'client_owner'
  | 'client_admin'
  | 'client_user';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';
export type MemberStatus = 'active' | 'inactive' | 'pending';

export interface Permissions {
  contacts?: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    bulk_actions: boolean;
  };
  conversations?: {
    view: boolean;
    send: boolean;
    delete: boolean;
  };
  calendar?: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  pipelines?: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    move_deals: boolean;
  };
  workflows?: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    activate: boolean;
  };
  pages?: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    publish: boolean;
  };
  settings?: {
    view: boolean;
    edit: boolean;
    integrations: boolean;
    billing: boolean;
  };
  clients?: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    manage_users: boolean;
  };
  analytics?: {
    view: boolean;
  };
  impersonate?: boolean;
}

export interface AgencyAccount {
  id: string;
  name: string;
  slug: string;
  account_type: 'agency';
  parent_account_id: null;
  domain?: string;
  settings?: any;
  created_at: string;
  updated_at: string;
}

export interface ClientAccount {
  id: string;
  name: string;
  slug: string;
  account_type: 'client';
  parent_account_id: string;
  domain?: string;
  settings?: any;
  created_at: string;
  updated_at: string;
}

export interface AccountMemberExtended {
  id: string;
  account_id: string;
  user_id: string;
  role: UserRole;
  permissions: Permissions;
  status: MemberStatus;
  created_at: string;

  // Joined data
  user?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
  account?: AgencyAccount | ClientAccount;
}

export interface UserInvitation {
  id: string;
  account_id: string;
  email: string;
  role: UserRole;
  permissions: Permissions;
  invited_by: string;
  token: string;
  expires_at: string;
  status: InvitationStatus;
  accepted_at?: string;
  created_at: string;

  // Joined data
  account?: AgencyAccount | ClientAccount;
  inviter?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  role: UserRole;
  permissions: Permissions;
  is_system: boolean;
  created_at: string;
}

// Helper type guards
export function isAgencyAccount(account: any): account is AgencyAccount {
  return account?.account_type === 'agency';
}

export function isClientAccount(account: any): account is ClientAccount {
  return account?.account_type === 'client';
}

export function isAgencyRole(role: UserRole): boolean {
  return role === 'agency_owner' || role === 'agency_admin';
}

export function isClientRole(role: UserRole): boolean {
  return role === 'client_owner' || role === 'client_admin' || role === 'client_user';
}

// Get default permissions for a role
export function getDefaultPermissions(role: UserRole): Permissions {
  switch (role) {
    case 'agency_owner':
    case 'agency_admin':
      return {
        contacts: { view: true, create: true, edit: true, delete: true, bulk_actions: true },
        conversations: { view: true, send: true, delete: true },
        calendar: { view: true, create: true, edit: true, delete: true },
        pipelines: { view: true, create: true, edit: true, delete: true, move_deals: true },
        workflows: { view: true, create: true, edit: true, delete: true, activate: true },
        pages: { view: true, create: true, edit: true, delete: true, publish: true },
        settings: { view: true, edit: true, integrations: true, billing: true },
        clients: { view: true, create: true, edit: true, delete: true, manage_users: true },
        analytics: { view: true },
        impersonate: true
      };

    case 'client_owner':
      return {
        contacts: { view: true, create: true, edit: true, delete: true, bulk_actions: true },
        conversations: { view: true, send: true, delete: true },
        calendar: { view: true, create: true, edit: true, delete: true },
        pipelines: { view: true, create: true, edit: true, delete: true, move_deals: true },
        settings: { view: true, edit: false, integrations: true, billing: false },
        analytics: { view: true }
      };

    case 'client_admin':
      return {
        contacts: { view: true, create: true, edit: true, delete: true, bulk_actions: false },
        conversations: { view: true, send: true, delete: false },
        calendar: { view: true, create: true, edit: true, delete: false },
        pipelines: { view: true, create: false, edit: false, delete: false, move_deals: true },
        settings: { view: true, edit: false, integrations: true, billing: false }
      };

    case 'client_user':
      return {
        contacts: { view: true, create: true, edit: true, delete: false, bulk_actions: false },
        conversations: { view: true, send: true, delete: false },
        calendar: { view: true, create: true, edit: true, delete: false },
        pipelines: { view: true, create: false, edit: false, delete: false, move_deals: true },
        settings: { view: false, edit: false, integrations: false, billing: false }
      };

    default:
      return {};
  }
}
