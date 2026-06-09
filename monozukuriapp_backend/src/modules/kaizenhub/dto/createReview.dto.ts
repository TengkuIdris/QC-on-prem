import { HowUse } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsNotEmpty, IsString, IsJSON, IsEnum, Min, Max, IsInt, ValidateIf } from "class-validator";

export class CreateReviewDto {
  @ApiProperty({
    description: "id of improvement",
    example: 1,
  })
  @IsNotEmpty()
  improvementId: number;

  @ApiPropertyOptional({
    description: "rate (from 1 to 5)",
    example: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @ValidateIf((obj) => obj.rate)
  rate?: number | null;

  @ApiPropertyOptional({
    description: "comment of review",
    example: "comment sample",
  })
  @IsOptional()
  @IsString()
  @ValidateIf((obj) => obj.comment)
  comment?: string | null;

  @ApiPropertyOptional({
    description: "impact percent",
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @ValidateIf((obj) => obj.impactPercent)
  impactPercent?: number | null;

  @ApiPropertyOptional({
    description: "attraction sample",
    example: `"{\\"easy\\": true, \\"original\\": false, \\"highly effective\\": true}"`,
  })
  @IsOptional()
  @IsJSON()
  @ValidateIf((obj) => obj.attraction)
  attraction?: object | null;

  @ApiPropertyOptional({
    description: "Enum how use: REFERENCE, SOME, ALL, NOT_USE",
    example: "ALL",
  })
  @IsOptional()
  @IsEnum(HowUse)
  @ValidateIf((obj) => obj.howUse)
  howUse?: HowUse | null;

  @ApiPropertyOptional({
    description: "different keywords are seperated by comma",
    example: "keyword1, keyword2, keyword3",
  })
  @IsOptional()
  @IsString()
  @ValidateIf((obj) => obj.keyword)
  keyword?: string | null;
}
