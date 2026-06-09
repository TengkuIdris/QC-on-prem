import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class UpdateIndentyDto {
  @ApiProperty({
    description: "Random string to update indenty",
    example: "sdhsvbvisdvbwyvcdsaubsdjvdshcvdsukvcg",
  })
  @IsNotEmpty()
  indenty: string;

  @ApiProperty({
    description: "token to detect user",
    example: "sdhsvbvisdvbwyvcdsaubsdjvdshcvdsukvcg",
  })
  @IsNotEmpty()
  tokens: string;
}
