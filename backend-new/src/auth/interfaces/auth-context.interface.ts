export interface AuthContext {
  userId: number;
  sessionId: string;
  username: string;
  role: string;
  permissions: string[];
}
