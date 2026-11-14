// Authenticated and guest user domain models
export interface User {
  id: string;
  email: string;
  displayName: string;
  plan: 'free' | 'lite' | 'pro' | 'business';
}

export interface GuestUser {
  id: 'guest';
  sessionId: string;
}
