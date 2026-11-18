export type AppRole = 'ADMIN' | 'USER';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: AppRole;
}
