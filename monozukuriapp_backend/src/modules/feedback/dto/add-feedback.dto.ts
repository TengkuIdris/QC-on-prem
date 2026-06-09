import { ApiProperty } from "@nestjs/swagger";
import { Transform, TransformFnParams } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class AddFeedbackDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @Transform(({ value }: TransformFnParams) => value?.trim())
  @ApiProperty({
    description: "Feedback provided by the user",
    example: "This feature is very useful and easy to use.",
  })
  feedback: string;
}
