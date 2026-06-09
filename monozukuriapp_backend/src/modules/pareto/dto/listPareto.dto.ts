import { OmitType } from "@nestjs/swagger";
import { PaginationDto } from "src/utils/dto/pagination.dto";

export class ListParetoDto extends OmitType(PaginationDto, ["from", "to"]) {}
