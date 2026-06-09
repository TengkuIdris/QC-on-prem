import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ResendSignUpCodeDto {
  @ApiProperty({
    description: "Email address of the user",
    example: "admin@gmail.com",
  })
  @IsString()
  @IsNotEmpty()
  email: string;
}
