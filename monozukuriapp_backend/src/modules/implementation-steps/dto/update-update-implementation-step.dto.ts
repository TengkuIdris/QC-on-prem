import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class UpdateImplementationStepDto {
  @ApiProperty({
    description: "ID of the implementation step to update",
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @ApiProperty({
    description: "Title of the implementation step",
    example: "Step 1",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: "Step number of the implementation step",
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  stepNumber: number;

  @ApiProperty({
    description: "Description of the implementation step",
    example: "This is the first step",
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: "URL of the implementation step",
    example: "https://example.com/step1",
  })
  @IsOptional()
  @IsString()
  url?: string;
}

export class UpdateImplementationStepsDto {
  @ApiProperty({
    type: [UpdateImplementationStepDto],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateImplementationStepDto)
  implementationSteps: UpdateImplementationStepDto[];
}
