import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { PaginationDto } from "src/utils/dto/pagination.dto";

export class ListRecentFileDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Type of recent file",
    enum: ["fishBone", "parento", "fta"],
    required: false,
  })
  @IsOptional()
  @IsIn(["fishBone", "parento", "fta"])
  type?: "fishBone" | "parento" | "fta";
}
