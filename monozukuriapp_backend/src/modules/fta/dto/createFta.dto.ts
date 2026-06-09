import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsJSON, IsNotEmpty, IsString } from "class-validator";

export class FTADto {
  @ApiProperty({
    description: "Parameters in JSON (object) format",
    example: {
      name: "Root",
      level: 0,
      children: [
        {
          name: "level 1",
          children: [
            {
              name: "level 2",
              children: [
                {
                  name: "level 3",
                  level: 3,
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  })
  @IsJSON()
  @IsNotEmpty()
  parameters: object;

  @ApiProperty({
    description: "FontFamily",
    example: "FontFamily",
  })
  @IsString()
  fontFamily: string;

  @ApiPropertyOptional({ type: String, format: "binary", required: false })
  thumbnail?: Express.Multer.File;
}
