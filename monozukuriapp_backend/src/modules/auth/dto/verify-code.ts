import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class VerifyDto {
  @ApiProperty({
    description: "Email address of the user",
    example: "admin@gmail.com",
  })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Code from cognito to verify user vie email",
    example: "123654",
  })
  @IsNotEmpty()
  code: string;
}
