import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Orientation, ParetoMode } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

class ParetoItem {
  @ApiProperty({
    description: "Title of improment",
    example: "Title",
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: "type of improvement",
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  quantity: number;

  @ApiProperty({
    description: "type of improvement",
    example: 1.1,
  })
  @IsNotEmpty()
  @IsNumber()
  cumulativeQuantity: number;

  @ApiProperty({
    description: "type of improvement",
    example: 1.1,
  })
  @IsNotEmpty()
  @IsNumber()
  cumulativePercentage: number;

  @ApiProperty({
    description: "Title of improment",
    example: "Title",
  })
  @IsNotEmpty()
  @IsString()
  color: string;

  @ApiProperty({
    description: "Description of improment",
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  showBarLabel: boolean;

  @ApiProperty({
    description: "Description of improment",
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  showLineLabel: boolean;
}

class ParetoDto {
  @ApiProperty({
    description: "Title of improment",
    example: "Title",
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: "Description of improment",
    example: "Description",
  })
  @IsNotEmpty()
  @IsString()
  yAxisLabel: string;

  @ApiProperty({
    description: "Description of improment",
    example: "Description",
  })
  @IsNotEmpty()
  @IsString()
  yAxisUnits: string;

  @ApiProperty({
    description: "Description of improment",
    example: "Description",
  })
  @IsNotEmpty()
  @IsString()
  otherColor: string;

  @ApiProperty({
    description: "Description of improment",
    example: "Description",
  })
  @IsNotEmpty()
  @IsString()
  lineChartColor: string;

  @ApiProperty({
    description: "type of improvement",
    example: Orientation.portrait,
  })
  @IsEnum(Orientation)
  labelOrientation: Orientation;

  @ApiProperty({
    description: "type of improvement",
    example: Orientation.portrait,
  })
  @IsEnum(Orientation)
  yAxisLabelOrientation: Orientation;

  @ApiProperty({
    description: "type of improvement",
    example: Orientation.portrait,
  })
  @IsEnum(Orientation)
  lineLabelOrientation: Orientation;

  @ApiProperty({
    description: "type of improvement",
    example: Orientation.portrait,
  })
  @IsEnum(Orientation)
  columnLabelOrientation: Orientation;

  @ApiProperty({
    description: "type of improvement",
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  xAxisItemCount: number;

  @ApiProperty({
    description: "type of improvement",
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  fontSizeTitle: number;

  @ApiProperty({
    description: "type of improvement",
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  lineThickness: number;

  @ApiProperty({
    description: "type of improvement",
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  xAxisFontSize: number;

  @ApiProperty({
    description: "type of improvement",
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  yAxisFontSize: number;

  @ApiProperty({
    description: "type of improvement",
    example: 1,
  })
  @IsOptional()
  @IsInt()
  yAxisUnitSize: number;

  @ApiProperty({
    description: "type of improvement",
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  lineLabelFontSize: number;

  @ApiProperty({
    description: "type of improvement",
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  columnLabelFontSize: number;

  @ApiProperty({
    description: "type of improvement",
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  axisFontSize: number;

  @ApiProperty({
    description: "scale",
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  scale: number;

  @ApiProperty({
    description: "Description of improment",
    example: "Description",
  })
  @IsNotEmpty()
  @IsString()
  fontFamily: string;

  @ApiProperty({
    description: "Description of improment",
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  showBarLabels: boolean;

  @ApiProperty({
    description: "Description of improment",
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  showLineLabels: boolean;

  @ApiProperty({
    description: "type of improvement",
    example: [
      {
        name: "item5",
        quantity: 98,
        cumulativeQuantity: 98,
        cumulativePercentage: 28.57142857142857,
        color: "hsl(0, 70%, 60%)",
        showBarLabel: true,
        showLineLabel: true,
      },
      {
        name: "item55",
        quantity: 77,
        cumulativeQuantity: 175,
        cumulativePercentage: 51.02040816326531,
        color: "hsl(137.508, 70%, 60%)",
        showBarLabel: true,
        showLineLabel: true,
      },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ParetoItem)
  records: ParetoItem[];
}

export class CreateParetoDto {
  @ApiPropertyOptional({
    description: "type of improvement",
    example: {
      title: "Title",
      yAxisLabel: "Description",
      yAxisUnits: "Description",
      otherColor: "Description",
      lineChartColor: "Description",
      labelOrientation: "portrait",
      yAxisLabelOrientation: "portrait",
      lineLabelOrientation: "portrait",
      columnLabelOrientation: "portrait",
      xAxisItemCount: 1,
      lineThickness: 1,
      xAxisFontSize: 1,
      yAxisFontSize: 1,
      yAxisUnitSize: 1,
      lineLabelFontSize: 1,
      columnLabelFontSize: 1,
      fontSizeTitle: 12,
      axisFontSize: 1,
      scale: 1,
      fontFamily: "Description",
      showBarLabels: true,
      showLineLabels: true,
      records: [
        {
          name: "item5",
          quantity: 98,
          cumulativeQuantity: 98,
          cumulativePercentage: 28.57142857142857,
          color: "hsl(0, 70%, 60%)",
          showBarLabel: true,
          showLineLabel: true,
        },
        {
          name: "item55",
          quantity: 77,
          cumulativeQuantity: 175,
          cumulativePercentage: 51.02040816326531,
          color: "hsl(137.508, 70%, 60%)",
          showBarLabel: true,
          showLineLabel: true,
        },
      ],
    },
  })
  @ValidateNested()
  @Type(() => ParetoDto)
  @Transform(({ value }) => (typeof value === "string" ? JSON.parse(value) : value))
  single?: ParetoDto;

  @ApiPropertyOptional({
    description: "type of improvement",
    example: {
      title: "Title",
      yAxisLabel: "Description",
      yAxisUnits: "Description",
      otherColor: "Description",
      lineChartColor: "Description",
      labelOrientation: "portrait",
      yAxisLabelOrientation: "portrait",
      lineLabelOrientation: "portrait",
      columnLabelOrientation: "portrait",
      xAxisItemCount: 1,
      lineThickness: 1,
      xAxisFontSize: 1,
      yAxisFontSize: 1,
      lineLabelFontSize: 1,
      columnLabelFontSize: 1,
      fontSizeTitle: 12,
      axisFontSize: 1,
      scale: 1,
      fontFamily: "Description",
      showBarLabels: true,
      showLineLabels: true,
      records: [
        {
          name: "item5",
          quantity: 98,
          cumulativeQuantity: 98,
          cumulativePercentage: 28.57142857142857,
          color: "hsl(0, 70%, 60%)",
          showBarLabel: true,
          showLineLabel: true,
        },
        {
          name: "item55",
          quantity: 77,
          cumulativeQuantity: 175,
          cumulativePercentage: 51.02040816326531,
          color: "hsl(137.508, 70%, 60%)",
          showBarLabel: true,
          showLineLabel: true,
        },
      ],
    },
  })
  @ValidateNested()
  @Type(() => ParetoDto)
  @Transform(({ value }) => (typeof value === "string" ? JSON.parse(value) : value))
  after?: ParetoDto;

  @ApiPropertyOptional({
    description: "type of improvement",
    example: {
      title: "Title",
      yAxisLabel: "Description",
      yAxisUnits: "Description",
      otherColor: "Description",
      lineChartColor: "Description",
      labelOrientation: "portrait",
      yAxisLabelOrientation: "portrait",
      lineLabelOrientation: "portrait",
      columnLabelOrientation: "portrait",
      xAxisItemCount: 1,
      lineThickness: 1,
      xAxisFontSize: 1,
      yAxisFontSize: 1,
      lineLabelFontSize: 1,
      columnLabelFontSize: 1,
      fontSizeTitle: 12,
      axisFontSize: 1,
      scale: 1,
      fontFamily: "Description",
      showBarLabels: true,
      showLineLabels: true,
      records: [
        {
          name: "item5",
          quantity: 98,
          cumulativeQuantity: 98,
          cumulativePercentage: 28.57142857142857,
          color: "hsl(0, 70%, 60%)",
          showBarLabel: true,
          showLineLabel: true,
        },
        {
          name: "item55",
          quantity: 77,
          cumulativeQuantity: 175,
          cumulativePercentage: 51.02040816326531,
          color: "hsl(137.508, 70%, 60%)",
          showBarLabel: true,
          showLineLabel: true,
        },
      ],
    },
  })
  @ValidateNested()
  @Type(() => ParetoDto)
  @Transform(({ value }) => (typeof value === "string" ? JSON.parse(value) : value))
  before?: ParetoDto;

  @ApiProperty({
    description: "type of improvement",
    example: ParetoMode.SINGLE,
  })
  @IsEnum(ParetoMode)
  mode: ParetoMode;

  @ApiPropertyOptional({ type: String, format: "binary", required: false })
  afterImage?: Express.Multer.File;

  @ApiPropertyOptional({ type: String, format: "binary", required: false })
  beforeImage?: Express.Multer.File;

  @ApiPropertyOptional({ type: String, format: "binary", required: false })
  singleImage?: Express.Multer.File;

  @ApiProperty({
    description: "type of improvement",
    example: "cfvvskvjs",
  })
  @IsString()
  name: string;
}
