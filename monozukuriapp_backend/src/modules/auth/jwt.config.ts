export const jwtConfig = {
  global: true,
  secret: process.env.JWT_ACCESS_TOKEN_SECRET,
  signOptions: { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME },
};

export interface JwtPayload {
  userId: number;
}
