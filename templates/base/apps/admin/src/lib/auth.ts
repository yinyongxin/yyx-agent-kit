const TOKEN_KEY = "starter.admin.token";
const EMAIL_KEY = "starter.admin.email";

const storage = () => (typeof window === "undefined" ? null : window.localStorage);

export const authStore = {
  getToken: (): string | null => storage()?.getItem(TOKEN_KEY) ?? null,

  setToken: (token: string) => {
    storage()?.setItem(TOKEN_KEY, token);
  },

  getEmail: (): string | null => storage()?.getItem(EMAIL_KEY) ?? null,

  setEmail: (email: string) => {
    storage()?.setItem(EMAIL_KEY, email);
  },

  clear: () => {
    storage()?.removeItem(TOKEN_KEY);
    storage()?.removeItem(EMAIL_KEY);
  },

  isAuthenticated: (): boolean => Boolean(storage()?.getItem(TOKEN_KEY)),
};
