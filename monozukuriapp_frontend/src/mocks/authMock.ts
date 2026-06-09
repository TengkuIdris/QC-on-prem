// AWS Amplify Auth のモック
export const mockFetchAuthSession = async () => {
  return {
    tokens: {
      accessToken: {
        toString: () => "mock-access-token",
      },
      idToken: {
        toString: () => "mock-id-token",
      },
    },
  };
};

// ローカルストレージにモックデータを設定
export const setupMockAuth = () => {
  const clientId = import.meta.env.VITE_USER_POOL_CLIENT_ID;
  const mockUser = "mockUser";

  localStorage.setItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`, mockUser);
  localStorage.setItem(`CognitoIdentityServiceProvider.${clientId}.${mockUser}.accessToken`, "mock-access-token");
  localStorage.setItem(`CognitoIdentityServiceProvider.${clientId}.${mockUser}.idToken`, "mock-id-token");
  localStorage.setItem("indenty", "mock-indenty");
};
