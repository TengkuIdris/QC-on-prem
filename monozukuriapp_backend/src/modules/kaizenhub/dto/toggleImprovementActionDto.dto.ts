import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";

export class ToggleImprovementActionDto {
  @IsNumber()
  @ApiProperty({
    example: 1,
    description: "Improvement ID",
  })
  improvementId: number;
}
