import { ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import { IsArray, IsString } from "class-validator";

import { IsOptional } from "class-validator";
import { ListImprovementDto } from "./improvementList.dto";
import { Transform } from "class-transformer";

export class ListImprovementSearchDto extends OmitType(ListImprovementDto, ["type", "isDraft", "typeList"]) {
  @ApiPropertyOptional({
    description: "label of improvement",
    type: String,
    example: ["label1", "label2"],
    isArray: true,
  })
  @Transform(({ value }) => {
    return Array.isArray(value) ? value : [value];
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  label?: string[];
}
