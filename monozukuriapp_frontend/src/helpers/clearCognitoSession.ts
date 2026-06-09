export const clearLocalStorageCognito = () => {
  const user = localStorage.getItem(
    `CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.LastAuthUser`,
  );
  if (user) {
    localStorage.removeItem(
      `CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.${user}.accessToken`,
    );
    localStorage.removeItem(
      `CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.${user}.clockDrift`,
    );
    localStorage.removeItem(
      `CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.${user}.idToken`,
    );
    localStorage.removeItem(
      `CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.${user}.refreshToken`,
    );
    localStorage.removeItem(
      `CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.${user}.signInDetails`,
    );
    localStorage.removeItem(`CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.LastAuthUser`);
  }
};
