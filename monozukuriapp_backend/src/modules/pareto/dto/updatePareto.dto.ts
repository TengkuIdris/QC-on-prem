import { OmitType } from "@nestjs/swagger";
import { CreateParetoDto } from "./createPareto.dto";

export class UpdateParetoDto extends OmitType(CreateParetoDto, ["mode"]) {}
