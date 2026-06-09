import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber } from "class-validator";

export class UpdateUserInforDto {
  @ApiProperty({
    description: "Title of improment",
    example: 1728133391123,
  })
  @IsNotEmpty()
  @IsNumber()
  from: number;

  @ApiProperty({
    description: "Title of improment",
    example: 1728133391123,
  })
  @IsNotEmpty()
  @IsNumber()
  end: number;
}
