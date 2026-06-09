import * as dotenv from "dotenv";
dotenv.config();
import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { prismaClient } from "prisma/client/instance";
import { HttpException, HttpStatus } from "@nestjs/common";
import { httpErrors } from "src/exceptions/index.exceptions";
import { signUp, confirmSignUp } from "aws-amplify/auth";
import { CognitoService } from "../cognito/cognito.service";

jest.mock("aws-amplify/auth", () => ({
  signUp: jest.fn(),
  confirmSignUp: jest.fn(),
}));

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        CognitoService,
        {
          //@ts-ignore
          provide: prismaClient,
          useValue: {
            user: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  // Validate User By Email

  it("should return user details when the user exists in the database", async () => {
    const email = "test@example.com";
    const mockUser = { id: 1, email };

    prismaClient.user.findFirst = jest.fn().mockResolvedValue(mockUser);

    const result = await authService.validateUserByEmail(email);

    expect(result).toEqual(mockUser);
    expect(prismaClient.user.findFirst).toHaveBeenCalledWith({
      where: { email },
    });
  });
  it("should return null when the user does not exist in the database", async () => {
    const email = "nonexistent@example.com";

    prismaClient.user.findFirst = jest.fn().mockResolvedValue(null);
    const result = await authService.validateUserByEmail(email);

    expect(result).toBeNull();
    expect(prismaClient.user.findFirst).toHaveBeenCalledWith({
      where: { email },
    });
  });

  // Create User

  it("should don't create a new user when email isn't unique in database", async () => {
    const createUserDto = {
      email: "unique@example.com",
      name: "Test User",
      password: "Password@123",
    };

    const mockUser = { ...createUserDto, id: "1", isConfirmed: true };

    prismaClient.user.findFirst = jest.fn().mockResolvedValue(mockUser);
    (signUp as jest.Mock).mockResolvedValue({ isSignUpComplete: true });
    prismaClient.user.create = jest.fn().mockResolvedValue({
      id: 1,
      email: createUserDto.email,
      name: createUserDto.name,
    });

    await expect(authService.createUser(createUserDto)).rejects.toThrow(
      new HttpException(httpErrors.USER_EXISTED, HttpStatus.BAD_REQUEST),
    );
    expect(prismaClient.user.findFirst).toHaveBeenCalledWith({
      where: { email: createUserDto.email },
    });
    expect(signUp).not.toHaveBeenCalled();
    expect(prismaClient.user.create).not.toHaveBeenCalled();
  });

  it("should don't create a new user when email isn't unique in cognito", async () => {
    const createUserDto = {
      email: "unique@example.com",
      name: "Test User",
      password: "Password@123",
    };

    prismaClient.user.findFirst = jest.fn().mockResolvedValue(null);

    (signUp as jest.Mock).mockRejectedValue(new Error("SignUp failed"));
    prismaClient.user.create = jest.fn().mockResolvedValue({
      id: 1,
      email: createUserDto.email,
      name: createUserDto.name,
    });

    await expect(authService.createUser(createUserDto)).rejects.toThrow(
      new HttpException(httpErrors.CREATE_USER_FAILED, HttpStatus.BAD_REQUEST),
    );
    expect(prismaClient.user.findFirst).toHaveBeenCalledWith({
      where: { email: createUserDto.email },
    });
    expect(signUp).toHaveBeenCalledWith({
      username: createUserDto.email,
      password: createUserDto.password,
      options: {
        userAttributes: { email: createUserDto.email },
      },
    });
    expect(prismaClient.user.create).not.toHaveBeenCalled();
  });
  it("should create a new user successfuly", async () => {
    const createUserDto = {
      email: "unique@example.com",
      name: "Test User",
      password: "Password@123",
    };

    prismaClient.user.findFirst = jest.fn().mockResolvedValue(null);
    (signUp as jest.Mock).mockResolvedValue({ isSignUpComplete: true });
    prismaClient.user.create = jest.fn().mockResolvedValue({
      id: 1,
      email: createUserDto.email,
      name: createUserDto.name,
    });
    const result = await authService.createUser(createUserDto);

    expect(result).toHaveProperty("email", createUserDto.email);
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name", createUserDto.name);
    expect(prismaClient.user.findFirst).toHaveBeenCalledWith({
      where: { email: createUserDto.email },
    });
    expect(signUp).toHaveBeenCalledWith({
      username: createUserDto.email,
      password: createUserDto.password,
      options: {
        userAttributes: { email: createUserDto.email },
      },
    });
    expect(prismaClient.user.create).toHaveBeenCalledWith({
      data: { email: createUserDto.email, name: createUserDto.name },
    });
  });

  // Verify Code Cognito

  it("should don't verify user when email didn't exist in database", async () => {
    const verifyCodeDto = {
      email: "unique@example.com",
      code: "192764",
    };

    prismaClient.user.findFirst = jest.fn().mockResolvedValue(null);
    (confirmSignUp as jest.Mock).mockResolvedValue({ isSignUpComplete: true, nextStep: { signUpStep: "DONE" } });

    await expect(authService.verifyCodeSignUp(verifyCodeDto)).rejects.toThrow(
      new HttpException(httpErrors.USER_NOT_EXISTED, HttpStatus.BAD_REQUEST),
    );
    expect(prismaClient.user.findFirst).toHaveBeenCalledWith({
      where: { email: verifyCodeDto.email },
    });
    expect(confirmSignUp).not.toHaveBeenCalled();
  });

  it("should throw error when code invalid", async () => {
    const verifyCodeDto = {
      email: "unique@example.com",
      code: "192764",
    };

    prismaClient.user.findFirst = jest.fn().mockResolvedValue({
      email: "unique@example.com",
      name: "Test User",
      id: 1,
    });

    (confirmSignUp as jest.Mock).mockRejectedValue(new Error("Invalid code"));

    await expect(authService.verifyCodeSignUp(verifyCodeDto)).rejects.toThrow(
      new HttpException(httpErrors.CONFIRM_SIGN_UP_FAILED, HttpStatus.BAD_REQUEST),
    );

    expect(prismaClient.user.findFirst).toHaveBeenCalledWith({
      where: { email: verifyCodeDto.email },
    });
    expect(confirmSignUp).toHaveBeenCalledWith({ username: verifyCodeDto.email, confirmationCode: verifyCodeDto.code });
  });

  it("verify code successfuly", async () => {
    const verifyCodeDto = {
      email: "unique@example.com",
      code: "192764",
    };

    prismaClient.user.findFirst = jest.fn().mockResolvedValue({
      email: "unique@example.com",
      name: "Test User",
      id: 1,
      isConfiirmed: false,
    });
    prismaClient.user.update = jest.fn().mockResolvedValue({
      email: "unique@example.com",
      name: "Test User",
      id: 1,
      isConfiirmed: true,
    });

    (confirmSignUp as jest.Mock).mockResolvedValue({ isSignUpComplete: true, nextStep: { signUpStep: "DONE" } });

    const result = await authService.verifyCodeSignUp(verifyCodeDto);

    expect(result).toHaveProperty("isSignUpComplete", true);
    expect(result).toHaveProperty("nextStep", { signUpStep: "DONE" });

    expect(prismaClient.user.findFirst).toHaveBeenCalledWith({
      where: { email: verifyCodeDto.email },
    });
    expect(confirmSignUp).toHaveBeenCalledWith({ username: verifyCodeDto.email, confirmationCode: verifyCodeDto.code });
  });
});
