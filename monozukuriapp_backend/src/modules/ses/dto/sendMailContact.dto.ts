import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class SendMailContactDto {
  @ApiProperty({
    description: "The name of the sender",
    example: "John Doe",
  })
  @IsOptional()
  name: string;

  @ApiProperty({
    description: "The email address of the sender",
    example: "johndoe@gmail.com",
  })
  @IsOptional()
  email: string;

  @ApiProperty({
    description: "The name of the company the sender works for",
    example: "PGT Solutions",
  })
  @IsOptional()
  company: string;

  @ApiProperty({
    description: "The department of the sender in the company",
    example: "Sales Department",
  })
  @IsOptional()
  departmentName: string;

  @ApiProperty({
    description: "The detailed message or inquiry from the sender",
    example: "I would like to inquire about the software product you offer.",
  })
  @IsOptional()
  detail: string;
}
