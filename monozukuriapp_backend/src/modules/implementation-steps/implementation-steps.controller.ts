import {
  Controller,
  Delete,
  Param,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  Put,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { CognitoGuard } from "../auth/jwt-auth.guard";
import { ImplementationStepsService } from "./implementation-steps.service";
import { CreateImplementationStepDto } from "./dto/create-implementation-step.dto";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { UpdateImplementationStepsDto } from "./dto/update-update-implementation-step.dto";

@Controller("implementation-steps")
@ApiTags("Implementation Steps")
@ApiBearerAuth()
@UseGuards(CognitoGuard)
export class ImplementationStepsController {
  constructor(private readonly implementationStepsService: ImplementationStepsService) {}

  @Post()
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(AnyFilesInterceptor())
  @ApiBody({ type: CreateImplementationStepDto })
  @ApiOperation({ summary: "Create implementation steps" })
  @ApiResponse({ status: 201, description: "Implementation steps created successfully" })
  @ApiResponse({ status: 400, description: "Bad request - Invalid input data" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async create(@Body() body: any, @UploadedFiles() files: Express.Multer.File[]) {
    const parsedDto = this.parseFormDataToDto(body);

    if (!parsedDto.steps || !Array.isArray(parsedDto.steps) || parsedDto.steps.length === 0) {
      throw new HttpException(["steps must be a non-empty array"], HttpStatus.BAD_REQUEST);
    }

    const validationErrors = [];
    parsedDto.steps.forEach((step, index) => {
      if (!step.stepNumber || typeof step.stepNumber !== "number") {
        validationErrors.push(`Step ${index + 1}: stepNumber is required and must be a number`);
      }
      if (!step.title || typeof step.title !== "string" || step.title.trim() === "") {
        validationErrors.push(`Step ${index + 1}: title is required and must be a non-empty string`);
      }
      if (!step.description || typeof step.description !== "string" || step.description.trim() === "") {
        validationErrors.push(`Step ${index + 1}: description is required and must be a non-empty string`);
      }
    });

    if (validationErrors.length > 0) {
      throw new HttpException(validationErrors, HttpStatus.BAD_REQUEST);
    }

    const dto: CreateImplementationStepDto = {
      steps: parsedDto.steps.map((step) => ({
        stepNumber: step.stepNumber,
        title: step.title,
        description: step.description,
        file: null as any,
      })),
    };

    const fileByIndex = new Map<number, Express.Multer.File>();

    if (files && files.length > 0) {
      for (const file of files) {
        const match = file.fieldname.match(/^steps\[(\d+)\]\.file$/);
        if (match) {
          const stepIndex = parseInt(match[1], 10);
          fileByIndex.set(stepIndex, file);
        }
      }
    }

    dto.steps = dto.steps.map((step, index) => ({
      ...step,
      file: fileByIndex.get(index),
    }));

    return await this.implementationStepsService.createImplementationSteps(dto);
  }

  private parseFormDataToDto(body: any): CreateImplementationStepDto {
    const stepsMap = new Map<number, any>();

    for (const [key, value] of Object.entries(body)) {
      const match = key.match(/^steps\[(\d+)\]\.(.+)$/);
      if (match) {
        const stepIndex = parseInt(match[1], 10);
        const fieldName = match[2];

        if (!stepsMap.has(stepIndex)) {
          stepsMap.set(stepIndex, {});
        }

        const processedValue = fieldName === "stepNumber" ? parseInt(value as string, 10) : value;
        stepsMap.get(stepIndex)[fieldName] = processedValue;
      }
    }

    const steps = [];
    const maxIndex = Math.max(...Array.from(stepsMap.keys()));
    for (let i = 0; i <= maxIndex; i++) {
      if (stepsMap.has(i)) {
        steps.push(stepsMap.get(i));
      }
    }

    return { steps };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete implementation step" })
  @ApiResponse({ status: 200, description: "Implementation step deleted successfully" })
  @ApiResponse({ status: 404, description: "Implementation step not found" })
  async deleteImplementationStep(@Param("id", ParseIntPipe) id: number) {
    return await this.implementationStepsService.deleteImplementationStep(id);
  }

  @Put("")
  async updateImplementationSteps(@Body() payload: UpdateImplementationStepsDto) {
    return await this.implementationStepsService.updateImplementationSteps(payload);
  }
}
