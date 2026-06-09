import { ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { TypeImprovement, TypeListImprovement } from "src/types/enums/typeImprovement.enum";
import { PaginationDto } from "src/utils/dto/pagination.dto";

export class ListImprovementDto extends OmitType(PaginationDto, ["from", "to"]) {
  @ApiPropertyOptional({
    description: "Title of improment",
    example: "Title",
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: "type of improvement",
    example: "KANBAN",
  })
  @IsOptional()
  @IsEnum(TypeImprovement)
  type?: TypeImprovement;

  @ApiPropertyOptional({
    description: "type of improvement",
    example: "",
  })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  isDraft?: boolean;

  @ApiPropertyOptional({
    description: "type of list improvement",
    example: "PublishedDate",
  })
  @IsOptional()
  @IsEnum(TypeListImprovement)
  typeList?: TypeListImprovement;
}
