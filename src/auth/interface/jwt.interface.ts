export interface JWT {
  id: number;
  email: string;
  lastLoginDate: Date | null;
  iat: number;
  exp: number;
  jti: string;
}
