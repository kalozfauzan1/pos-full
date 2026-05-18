export interface TokenPayload {
  userId: string;
  email: string;
  roleId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  role: {
    id: string;
    name: string;
    permissions: string[];
  };
}