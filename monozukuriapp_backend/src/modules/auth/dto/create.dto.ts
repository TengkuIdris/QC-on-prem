import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class CreateUserDto {
  @ApiProperty({
    description: "Email address of the user",
    example: "admin@gmail.com",
  })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Password in plain text",
    example: "JONATHAN",
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Password in plain text",
    example: "Password@123",
  })
  @IsNotEmpty()
  password: string;
}
