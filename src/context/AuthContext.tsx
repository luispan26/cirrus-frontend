import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useMutation } from '@apollo/client/react';
import { apolloClient } from '../apollo';
import { LOGIN_MUTATION, ME_QUERY, REGISTER_MUTATION } from '../graphql/operations';
import { clearAuthToken, getAuthToken, setAuthToken } from '../lib/auth-storage';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const [runLogin] = useMutation<{ login: { accessToken: string; user: AuthUser } }>(LOGIN_MUTATION);
  const [runRegister] = useMutation<{ register: { accessToken: string; user: AuthUser } }>(REGISTER_MUTATION);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setInitializing(false);
      return;
    }
    apolloClient
      .query<{ me: AuthUser }>({ query: ME_QUERY, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        if (data?.me) setUser(data.me);
        else clearAuthToken();
      })
      .catch(() => clearAuthToken())
      .finally(() => setInitializing(false));
  }, []);

  async function login(email: string, password: string) {
    const { data } = await runLogin({ variables: { input: { email, password } } });
    if (!data) throw new Error('Login failed');
    setAuthToken(data.login.accessToken);
    setUser(data.login.user);
    // Drop any cached query results (e.g. myReports) from a previous
    // account on this browser/tab before the new user's pages read from
    // cache-and-network — otherwise the previous user's Design History can
    // flash on screen until the network response overwrites it.
    await apolloClient.clearStore();
  }

  async function register(email: string, password: string, name: string) {
    const { data } = await runRegister({ variables: { input: { email, password, name } } });
    if (!data) throw new Error('Registration failed');
    setAuthToken(data.register.accessToken);
    setUser(data.register.user);
    await apolloClient.clearStore();
  }

  async function logout() {
    clearAuthToken();
    setUser(null);
    await apolloClient.clearStore();
  }

  return (
    <AuthContext.Provider value={{ user, initializing, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}