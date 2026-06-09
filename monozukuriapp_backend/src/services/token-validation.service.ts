import { Injectable, Logger } from '@nestjs/common'
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import { decryptPrivateKey } from '../utils/aes'
import awsmobile from '../../aws-export'
import { AuthService } from '../modules/auth/auth.service'

@Injectable()
export class TokenValidationService {
  private readonly logger = new Logger(TokenValidationService.name)
  
  private verifierAccessToken = CognitoJwtVerifier.create({
    userPoolId: awsmobile.aws_user_pools_id,
    tokenUse: "access",
    clientId: awsmobile.aws_user_pools_web_client_id,
  })
  
  private verifierIdToken = CognitoJwtVerifier.create({
    userPoolId: awsmobile.aws_user_pools_id,
    tokenUse: "id",
    clientId: awsmobile.aws_user_pools_web_client_id,
  })

  constructor(private readonly authService: AuthService) {}

  async validateTokenAndGetUserId(token: string): Promise<number> {
    try {
      if (!token || token === 'mock-token-for-testing') {
        throw new Error('Invalid or mock token')
      }

      // Parse the token format: "accessToken idToken randomKey"
      const tokenParts = token.split(' ')
      if (tokenParts.length < 3) {
        throw new Error('Invalid token format')
      }

      const accessToken = tokenParts[0]
      const encryptIdToken = tokenParts[1]
      const encryptRandomKey = tokenParts[2]

      // Verify access token
      await this.verifierAccessToken.verify(accessToken)

      // Decrypt and verify ID token
      const idToken = await decryptPrivateKey(encryptIdToken)
      const randomKey = await decryptPrivateKey(encryptRandomKey)
      const userInfo = await this.verifierIdToken.verify(idToken)

      // Get user from database
      const user = await this.authService.validateUserByEmail(userInfo?.email as string)
      if (!user) {
        throw new Error('User not found')
      }

      if (user.indenty !== randomKey) {
        throw new Error('Invalid identity')
      }

      this.logger.log(`Token validated successfully for user ID: ${user.id}`)
      return user.id

    } catch (error) {
      this.logger.error(`Token validation failed: ${error.message}`)
      throw error
    }
  }
} 