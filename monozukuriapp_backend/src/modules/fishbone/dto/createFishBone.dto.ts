import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsJSON, IsNotEmpty, IsOptional, IsString, IsEnum, IsNumber } from "class-validator";
import { FishBoneSource } from "@prisma/client";

export class FishboneDto {
  @ApiProperty({
    description: "Parameters in JSON (object) format",
    example: {
      name: "Root",
      level: 0,
      children: [
        {
          name: "level 1",
          children: [
            {
              name: "level 2",
              children: [
                {
                  name: "level 3",
                  level: 3,
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  })
  @IsJSON()
  @IsNotEmpty()
  parameters: object;

  @ApiProperty({
    description: "FontFamily",
    example: "FontFamily",
  })
  @IsString()
  fontFamily: string;

  @ApiPropertyOptional({ type: String, format: "binary", required: false })
  thumbnail?: Express.Multer.File;

  @ApiPropertyOptional({ type: [Number], required: false })
  @Transform(({ value }) => {
    if (typeof value === "string" && value.length > 0) {
      return JSON.parse(value);
    }
    return value;
  })
  @IsOptional()
  queryIds?: number[];

  @ApiPropertyOptional({ type: [Number], required: false })
  @Transform(({ value }) => {
    if (typeof value === "string" && value.length > 0) {
      return Number(value);
    }
    return value;
  })
  @IsOptional()
  rootFontSize?: number;

  @ApiPropertyOptional({ type: [Number], required: false })
  @Transform(({ value }) => {
    if (typeof value === "string" && value.length > 0) {
      return Number(value);
    }
    return value;
  })
  @IsOptional()
  firstLevelFontSize?: number;

  @ApiPropertyOptional({ type: [Number], required: false })
  @Transform(({ value }) => {
    if (typeof value === "string" && value.length > 0) {
      return Number(value);
    }
    return value;
  })
  @IsOptional()
  otherLevelFontSize?: number;

  @ApiPropertyOptional({ 
    enum: FishBoneSource, 
    description: "Source of fishbone creation",
    default: FishBoneSource.MANUAL 
  })
  @IsOptional()
  @IsEnum(FishBoneSource)
  source?: FishBoneSource;

  @ApiPropertyOptional({ 
    type: Number, 
    description: "ID of AI Assistant if created from AI",
    required: false 
  })
  @IsOptional()
  @IsNumber()
  aiAssistantId?: number;
}
