import { Injectable } from "@nestjs/common";
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminDeleteUserCommandOutput,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  AdminUpdateUserAttributesCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

@Injectable()
export class CognitoService {
  private cognito: CognitoIdentityProviderClient;

  constructor() {
    // Always use default credential provider chain (IAM role, environment, etc.)
    // This ensures we use the EC2 IAM role which has proper Cognito permissions
    // Fallback to explicit credentials will be handled in each method when send() fails
    this.cognito = new CognitoIdentityProviderClient({
      region: process.env.AWS_CONFIG_REGION || 'ap-southeast-1',
    });
  }

  /**
   * Create a new Cognito client with explicit credentials (fallback)
   */
  private createFallbackCognitoClient(): CognitoIdentityProviderClient {
    const region = process.env.AWS_CONFIG_REGION || 'ap-southeast-1';
    return new CognitoIdentityProviderClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_CONFIG_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_CONFIG_SECRET_ACCESS_KEY!,
      },
    });
  }

  async deleteUser(email: string): Promise<AdminDeleteUserCommandOutput | { UserNotFound: true }> {
    const params = {
      UserPoolId: process.env.AWS_USER_POOLS_ID,
      Username: email,
    };
    try {
      const command = new AdminDeleteUserCommand(params);
      return await this.cognito.send(command);
    } catch (error: any) {
      // If default credentials failed and explicit credentials are available, try fallback
      const isCredentialsError =
        error.message?.includes("Resolved credential object is not valid") ||
        error.message?.includes("Could not load credentials") ||
        error.name === "CredentialsError";

      const isPermissionError =
        error.message?.includes("is not authorized to perform") ||
        error.message?.includes("AccessDenied") ||
        error.name === "AccessDeniedException" ||
        error.name === "UnauthorizedOperation" ||
        error.name === "NotAuthorizedException";

      if (
        (isCredentialsError || isPermissionError) &&
        process.env.AWS_CONFIG_ACCESS_KEY_ID &&
        process.env.AWS_CONFIG_SECRET_ACCESS_KEY
      ) {
        console.log(
          "CognitoService.deleteUser: Default credentials failed, retrying with explicit credentials",
        );
        const fallbackCognito = this.createFallbackCognitoClient();
        try {
          const command = new AdminDeleteUserCommand(params);
          return await fallbackCognito.send(command);
        } catch (fallbackError: any) {
          console.error("CognitoService.deleteUser: Fallback credentials also failed:", fallbackError);
          if (fallbackError.name === "UserNotFoundException") {
            console.log(
              `CognitoService.deleteUser: User ${email} not found in Cognito (may already be deleted)`,
            );
            return { UserNotFound: true };
          }
          throw new Error(fallbackError.message || "Failed to delete user from Cognito");
        }
      }

      if (error.name === "UserNotFoundException") {
        console.log(
          `CognitoService.deleteUser: User ${email} not found in Cognito (may already be deleted)`,
        );
        return { UserNotFound: true };
      }

      throw new Error(error.message || "Failed to delete user from Cognito");
    }
  }

  async signUpWithEmail(email: string, password: string) {
    const params = {
      ClientId: process.env.AWS_USER_POOLS_WEB_CLIENT_ID!,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }],
    };
    try {
      const command = new SignUpCommand(params);
      return await this.cognito.send(command);
    } catch (error) {
      throw new Error(error.message || "Cognito sign up failed");
    }
  }

  async setEmailVerified(email: string, verified: boolean) {
    const params = {
      UserPoolId: process.env.AWS_USER_POOLS_ID!,
      Username: email,
      UserAttributes: [
        {
          Name: "email_verified",
          Value: verified ? "true" : "false",
        },
      ],
    };
    try {
      const command = new AdminUpdateUserAttributesCommand(params);
      return await this.cognito.send(command);
    } catch (error) {
      // If default credentials failed (credentials error or permission denied) and explicit credentials are available, try fallback
      const isCredentialsError =
        error.message?.includes("Resolved credential object is not valid") ||
        error.message?.includes("Could not load credentials") ||
        error.name === "CredentialsError";

      const isPermissionError =
        error.message?.includes("is not authorized to perform") ||
        error.message?.includes("AccessDenied") ||
        error.name === "AccessDeniedException" ||
        error.name === "UnauthorizedOperation";

      if (
        (isCredentialsError || isPermissionError) &&
        process.env.AWS_CONFIG_ACCESS_KEY_ID &&
        process.env.AWS_CONFIG_SECRET_ACCESS_KEY
      ) {
        console.log(`CognitoService.setEmailVerified: Default credentials failed (${isCredentialsError ? 'credentials' : 'permissions'}), retrying with explicit credentials`);
        // Retry with explicit credentials
        const fallbackCognito = this.createFallbackCognitoClient();
        try {
          const command = new AdminUpdateUserAttributesCommand(params);
          return await fallbackCognito.send(command);
        } catch (fallbackError) {
          console.error("CognitoService.setEmailVerified: Fallback credentials also failed:", fallbackError);
          throw new Error(fallbackError.message || "Set email_verified failed");
        }
      }
      throw new Error(error.message || "Set email_verified failed");
    }
  }

  async adminConfirmSignUp(email: string) {
    const params = {
      UserPoolId: process.env.AWS_USER_POOLS_ID!,
      Username: email,
    };
    try {
      const command = new AdminConfirmSignUpCommand(params);
      return await this.cognito.send(command);
    } catch (error) {
      // If default credentials failed (credentials error or permission denied) and explicit credentials are available, try fallback
      const isCredentialsError =
        error.message?.includes("Resolved credential object is not valid") ||
        error.message?.includes("Could not load credentials") ||
        error.name === "CredentialsError";

      const isPermissionError =
        error.message?.includes("is not authorized to perform") ||
        error.message?.includes("AccessDenied") ||
        error.name === "AccessDeniedException" ||
        error.name === "UnauthorizedOperation";

      if (
        (isCredentialsError || isPermissionError) &&
        process.env.AWS_CONFIG_ACCESS_KEY_ID &&
        process.env.AWS_CONFIG_SECRET_ACCESS_KEY
      ) {
        console.log(`CognitoService.adminConfirmSignUp: Default credentials failed (${isCredentialsError ? 'credentials' : 'permissions'}), retrying with explicit credentials`);
        // Retry with explicit credentials
        const fallbackCognito = this.createFallbackCognitoClient();
        try {
          const command = new AdminConfirmSignUpCommand(params);
          return await fallbackCognito.send(command);
        } catch (fallbackError) {
          console.error("CognitoService.adminConfirmSignUp: Fallback credentials also failed:", fallbackError);
          throw new Error(fallbackError.message || "Admin confirm sign up failed");
        }
      }
      throw new Error(error.message || "Admin confirm sign up failed");
    }
  }

  /**
   * Create Cognito user without sending verification email (for invited users)
   * Use this for Member users who don't need OTP verification
   */
  async adminCreateUserWithoutEmail(email: string, password: string) {
    const params = {
      UserPoolId: process.env.AWS_USER_POOLS_ID!,
      Username: email,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
      ],
      MessageAction: "SUPPRESS" as const, // Don't send welcome/verification email
      TemporaryPassword: password,
    };
    try {
      const command = new AdminCreateUserCommand(params);
      const result = await this.cognito.send(command);

      // Set permanent password immediately
      await this.adminSetUserPassword(email, password);

      // Get UserSub from created user (AdminGetUser returns it in UserAttributes)
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: process.env.AWS_USER_POOLS_ID!,
        Username: email,
      });
      const userDetails = await this.cognito.send(getUserCommand);

      // Extract UserSub from UserAttributes (sub attribute contains the UUID)
      const userSub = userDetails.UserAttributes?.find(attr => attr.Name === "sub")?.Value;

      // Return with UserSub for consistency with SignUpCommand response
      return {
        UserSub: userSub || email, // Fallback to email if sub not found
        User: result.User,
      };
    } catch (error) {
      // If default credentials failed (credentials error or permission denied) and explicit credentials are available, try fallback
      const isCredentialsError =
        error.message?.includes("Resolved credential object is not valid") ||
        error.message?.includes("Could not load credentials") ||
        error.name === "CredentialsError";

      const isPermissionError =
        error.message?.includes("is not authorized to perform") ||
        error.message?.includes("AccessDenied") ||
        error.name === "AccessDeniedException" ||
        error.name === "UnauthorizedOperation";

      if (
        (isCredentialsError || isPermissionError) &&
        process.env.AWS_CONFIG_ACCESS_KEY_ID &&
        process.env.AWS_CONFIG_SECRET_ACCESS_KEY
      ) {
        console.log(`CognitoService.adminCreateUserWithoutEmail: Default credentials failed (${isCredentialsError ? 'credentials' : 'permissions'}), retrying with explicit credentials`);
        // Retry with explicit credentials
        const fallbackCognito = this.createFallbackCognitoClient();
        try {
          const command = new AdminCreateUserCommand(params);
          const result = await fallbackCognito.send(command);

          // Set permanent password immediately (also with fallback)
          await this.adminSetUserPasswordWithFallback(email, password, fallbackCognito);

          // Get UserSub from created user
          const getUserCommand = new AdminGetUserCommand({
            UserPoolId: process.env.AWS_USER_POOLS_ID!,
            Username: email,
          });
          const userDetails = await fallbackCognito.send(getUserCommand);

          const userSub = userDetails.UserAttributes?.find(attr => attr.Name === "sub")?.Value;

          return {
            UserSub: userSub || email,
            User: result.User,
          };
        } catch (fallbackError) {
          console.error("CognitoService.adminCreateUserWithoutEmail: Fallback credentials also failed:", fallbackError);
          throw new Error(fallbackError.message || "Admin create user failed");
        }
      }
      throw new Error(error.message || "Admin create user failed");
    }
  }

  /**
   * Set permanent password for admin-created user
   */
  async adminSetUserPassword(email: string, password: string) {
    const params = {
      UserPoolId: process.env.AWS_USER_POOLS_ID!,
      Username: email,
      Password: password,
      Permanent: true, // Set as permanent password
    };
    try {
      const command = new AdminSetUserPasswordCommand(params);
      return await this.cognito.send(command);
    } catch (error) {
      // If default credentials failed (credentials error or permission denied) and explicit credentials are available, try fallback
      const isCredentialsError =
        error.message?.includes("Resolved credential object is not valid") ||
        error.message?.includes("Could not load credentials") ||
        error.name === "CredentialsError";

      const isPermissionError =
        error.message?.includes("is not authorized to perform") ||
        error.message?.includes("AccessDenied") ||
        error.name === "AccessDeniedException" ||
        error.name === "UnauthorizedOperation";

      if (
        (isCredentialsError || isPermissionError) &&
        process.env.AWS_CONFIG_ACCESS_KEY_ID &&
        process.env.AWS_CONFIG_SECRET_ACCESS_KEY
      ) {
        console.log(`CognitoService.adminSetUserPassword: Default credentials failed (${isCredentialsError ? 'credentials' : 'permissions'}), retrying with explicit credentials`);
        // Retry with explicit credentials
        const fallbackCognito = this.createFallbackCognitoClient();
        try {
          const command = new AdminSetUserPasswordCommand(params);
          return await fallbackCognito.send(command);
        } catch (fallbackError) {
          console.error("CognitoService.adminSetUserPassword: Fallback credentials also failed:", fallbackError);
          throw new Error(fallbackError.message || "Set user password failed");
        }
      }
      throw new Error(error.message || "Set user password failed");
    }
  }

  /**
   * Set permanent password for admin-created user (with fallback client)
   * Internal method used by adminCreateUserWithoutEmail when using fallback credentials
   */
  private async adminSetUserPasswordWithFallback(
    email: string,
    password: string,
    cognitoClient: CognitoIdentityProviderClient
  ) {
    const params = {
      UserPoolId: process.env.AWS_USER_POOLS_ID!,
      Username: email,
      Password: password,
      Permanent: true,
    };
    const command = new AdminSetUserPasswordCommand(params);
    return await cognitoClient.send(command);
  }
}
