import { OmitType } from "@nestjs/swagger";
import { PaginationDto } from "src/utils/dto/pagination.dto";

export class ListReviewDto extends OmitType(PaginationDto, ["from", "to"]) {}
