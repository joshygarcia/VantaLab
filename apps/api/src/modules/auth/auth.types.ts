export interface AuthClaims {
  sub: string;
  workspaceIds: string[];
  role?: 'member' | 'developer';
  iat?: number;
  exp?: number;
}
