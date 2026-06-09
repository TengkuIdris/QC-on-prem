import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class UpdateUserInfoDto {
  @ApiProperty({
    example: "Company Name",
    description: "Company name",
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;
}
