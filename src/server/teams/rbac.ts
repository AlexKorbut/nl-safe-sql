/**
 * Team accounts & RBAC (Wave 4)
 * Support team members with different roles
 */

export type TeamRole = "owner" | "editor" | "viewer";

export interface Permission {
  create_audits: boolean;
  view_reports: boolean;
  manage_team: boolean;
  manage_billing: boolean;
}

export const ROLE_PERMISSIONS: Record<TeamRole, Permission> = {
  owner: {
    create_audits: true,
    view_reports: true,
    manage_team: true,
    manage_billing: true,
  },
  editor: {
    create_audits: true,
    view_reports: true,
    manage_team: false,
    manage_billing: false,
  },
  viewer: {
    create_audits: false,
    view_reports: true,
    manage_team: false,
    manage_billing: false,
  },
};

export function hasPermission(role: TeamRole, permission: keyof Permission): boolean {
  return ROLE_PERMISSIONS[role][permission];
}
