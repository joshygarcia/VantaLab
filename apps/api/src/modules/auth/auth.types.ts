export interface AuthClaims {
  sub: string;
  workspaceIds: string[];
  iat?: number;
  exp?: number;
}
