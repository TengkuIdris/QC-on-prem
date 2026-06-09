import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsPositive, Max } from "class-validator";
import { TimeDto } from "./time.dto";
import { OrderBy } from "src/types/enums/orderBy.enum";

export class PaginationDto extends TimeDto {
  @ApiPropertyOptional({
    description: "desc or asc",
    example: "desc",
  })
  @IsIn([OrderBy.DESC, OrderBy.ASC])
  @IsOptional()
  orderBy: OrderBy = OrderBy.DESC;

  @ApiPropertyOptional({ example: 1 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Max(1000)
  @IsPositive()
  @IsOptional()
  size?: number = 10;
}
