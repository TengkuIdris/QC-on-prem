import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  ValidateNested,
  ArrayMinSize,
  Min,
  Max,
} from "class-validator";

export class MetricDto {
  @ApiProperty({
    description: "Metric name",
    example: "Processing Time",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Metric value",
    example: "60 minutes",
  })
  @IsNotEmpty()
  value: number;
}

export class StepDto {
  @ApiProperty({
    description: "Step ID",
    example: 1,
  })
  @IsNumber()
  @IsPositive()
  id: number;

  @ApiProperty({
    description: "Step title",
    example: "Prepare materials",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: "Step description",
    example: "Gather all necessary materials and tools",
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: "Step image URL (optional)",
    example: "https://example.com/image.jpg",
    required: false,
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}

export class CreateImprovementDto {
  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  @IsEmail()
  @IsOptional()
  email: string;

  @ApiProperty({
    description: "User full name",
    example: "John Doe",
  })
  @IsString()
  @IsOptional()
  fullName: string;

  @ApiProperty({
    description: "Company name (optional)",
    example: "ACME Corp",
    required: false,
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({
    description: "Department name (optional)",
    example: "Engineering",
    required: false,
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({
    description: "Improvement title",
    example: "Process Optimization",
  })
  @IsString()
  @IsOptional()
  title: string;

  @ApiProperty({
    description: "Improvement category",
    example: "Quality",
  })
  @IsNumber()
  @IsOptional()
  category: number;

  @ApiProperty({
    description: "Improvement summary",
    example: "This improvement reduces processing time by 30%",
  })
  @IsString()
  @IsOptional()
  summary: string;

  @ApiProperty({
    description: "Before metrics",
    type: [MetricDto],
    example: [{ name: "Processing Time", value: "60 minutes" }],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MetricDto)
  beforeMetrics: MetricDto[];

  @ApiProperty({
    description: "After metrics",
    type: [MetricDto],
    example: [{ name: "Processing Time", value: "42 minutes" }],
  })
  @IsArray()
  @IsOptional()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MetricDto)
  afterMetrics: MetricDto[];

  @ApiProperty({
    description: "Tags for categorization",
    example: ["efficiency", "cost-reduction"],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({
    description: "Related documents",
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @IsOptional()
  @IsNumber({}, { each: true })
  relatedDocumentIds: number[];

  @ApiProperty({
    description: "Preparation days required",
    example: 7,
  })
  @IsNumber()
  @IsOptional()
  @IsPositive()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value))
  prepDays: number;

  @ApiProperty({
    description: "Execution days required",
    example: 14,
  })
  @IsNumber()
  @IsOptional()
  @IsPositive()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value))
  execDays: number;

  @ApiProperty({
    description: "Implementation steps",
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @IsOptional()
  @IsNumber({}, { each: true })
  stepIds: number[];

  @ApiProperty({
    description: "Implementation tip",
    example: "Start with small pilot test",
  })
  @IsString()
  @IsOptional()
  tip: string;

  @ApiProperty({
    description: "Implementation caution",
    example: "Ensure safety protocols are followed",
  })
  @IsString()
  @IsOptional()
  caution: string;

  @ApiProperty({
    description: "Description of IsDraft",
    example: true,
  })
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isDraft: boolean;
}
