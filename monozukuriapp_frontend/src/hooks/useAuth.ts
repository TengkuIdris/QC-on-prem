import { useState, useEffect } from "react";
import { Auth } from "@aws-amplify/auth";
import { CognitoUser } from "@aws-amplify/auth";
import { AuthState } from "@aws-amplify/ui-components";

interface AuthUser extends CognitoUser {
  attributes: {
    email: string;
    email_verified: boolean;
    sub: string;
  };
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(AuthState.Loading);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const userData = await Auth.currentAuthenticatedUser();
      setAuthState(AuthState.SignedIn);
      setUser(userData);
    } catch (error) {
      setAuthState(AuthState.SignedOut);
      setUser(null);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const user = await Auth.signIn(username, password);
      setAuthState(AuthState.SignedIn);
      setUser(user);
      return user;
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await Auth.signOut();
      setAuthState(AuthState.SignedOut);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const signUp = async (username: string, password: string, email: string) => {
    try {
      const { user } = await Auth.signUp({
        username,
        password,
        attributes: {
          email,
        },
      });
      return user;
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  };

  const confirmSignUp = async (username: string, code: string) => {
    try {
      await Auth.confirmSignUp(username, code);
    } catch (error) {
      console.error("Error confirming sign up:", error);
      throw error;
    }
  };

  const forgotPassword = async (username: string) => {
    try {
      await Auth.forgotPassword(username);
    } catch (error) {
      console.error("Error initiating forgot password:", error);
      throw error;
    }
  };

  const forgotPasswordSubmit = async (username: string, code: string, newPassword: string) => {
    try {
      await Auth.forgotPasswordSubmit(username, code, newPassword);
    } catch (error) {
      console.error("Error submitting new password:", error);
      throw error;
    }
  };

  return {
    authState,
    user,
    signIn,
    signOut,
    signUp,
    confirmSignUp,
    forgotPassword,
    forgotPasswordSubmit,
  };
};
