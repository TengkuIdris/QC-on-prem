import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsPositive } from "class-validator";

export class TimeDto {
  @ApiPropertyOptional({ example: new Date().getTime() })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  @IsOptional()
  from?: number;

  @ApiPropertyOptional({ example: new Date().getTime() })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  @IsOptional()
  to?: number;
}
