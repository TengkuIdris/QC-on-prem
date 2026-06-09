import { ApiProperty } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
  IsOptional,
} from "class-validator";

export class ImplementationStepDto {
  @ApiProperty({
    description: "The step number of the implementation step",
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value))
  stepNumber: number;

  @ApiProperty({
    description: "The title of the implementation step",
    example: "Step 1",
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: "The description of the implementation step",
    example: "This is the first step",
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: "The file associated with the implementation step",
    type: "string",
    format: "binary",
    required: false,
  })
  @IsOptional()
  file?: Express.Multer.File;
}

export class CreateImplementationStepDto {
  @ApiProperty({
    description: "List of implementation steps",
    type: [Array<ImplementationStepDto>],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImplementationStepDto)
  steps: ImplementationStepDto[];
}
