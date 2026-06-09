import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReviewType } from "@prisma/client";
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

export class AssistantFishBoneDto {
  @ApiProperty({
    description: "Parameters in JSON (object) format",
  })
  @IsString()
  diagrams: string;

  @ApiProperty({
    description: "The name of the fishbone",
  })
  @IsString()
  @IsNotEmpty()
  problem: string;

  @ApiProperty({
    description: "The number of nodes in the fishbone",
  })
  @IsNumber()
  @IsNotEmpty()
  @IsIn([0, 1, 2, 3, 4])
  numberNode?: number;

  @ApiPropertyOptional({
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  lang?: string;

  @ApiPropertyOptional({ type: Number, required: false })
  @IsOptional()
  fishboneId?: number;

  @ApiPropertyOptional({ 
    type: String, 
    required: false,
    description: "Source of the request: 'ai-fishbone-diagram' or other",
    enum: ["ai-fishbone-diagram", "create-fishbone"]
  })
  @IsOptional()
  @IsString()
  source?: string;
}

export class FishBoneAssistantReviewDto {
  @ApiProperty({
    description: "The id of the fishbone assistant",
  })
  @IsNumber()
  @IsNotEmpty()
  assistantId: number;

  @ApiProperty({
    description: "The review of the fishbone assistant",
  })
  @IsNotEmpty()
  @IsIn([ReviewType.GOOD, ReviewType.BAD])
  review: ReviewType;

  @ApiProperty({
    description: "The reason of the review",
  })
  @ValidateIf((object) => object.review == ReviewType.BAD)
  @MaxLength(150, { message: "レビューの理由の文字数は150以下で入力してください。" })
  reason?: string;
}
