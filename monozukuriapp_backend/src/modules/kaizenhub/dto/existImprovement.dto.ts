import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class ExistImprovementDto {
  @ApiProperty({
    description: "The title of the improvement",
    example: "Improve user onboarding process",
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: "The ID of the improvement",
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  id?: number;
}
