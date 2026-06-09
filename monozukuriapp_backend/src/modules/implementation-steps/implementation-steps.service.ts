import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AwsS3Service } from "../s3/s3.service";
import { CreateImplementationStepDto, ImplementationStepDto } from "./dto/create-implementation-step.dto";
import { httpErrors } from "src/exceptions/index.exceptions";
import { prismaClient } from "prisma/client/instance";
import { STATUS_SUCCESS } from "src/constants/response.constant";
import { UpdateImplementationStepsDto } from "./dto/update-update-implementation-step.dto";

@Injectable()
export class ImplementationStepsService {
  constructor(private readonly awsS3Service: AwsS3Service) {}
  private readonly logger = new Logger(ImplementationStepsService.name);

  async createImplementationStep(payload: ImplementationStepDto) {
    let url: string | null = null;

    if (payload.file) {
      try {
        url = await this.awsS3Service.uploadFile(payload.file);
      } catch (error) {
        this.logger.error("Error uploading file to S3", error);
        throw new HttpException(httpErrors.CAN_NOT_UPLOAD_FILE, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    try {
      return prismaClient.implementationSteps.create({
        data: {
          stepNumber: payload.stepNumber,
          title: payload.title,
          description: payload.description,
          url,
        },
      });
    } catch (error) {
      this.logger.error("Error creating implementation step", error);
      throw new HttpException(httpErrors.CAN_NOT_CREATE_IMPLEMENTATION_STEP, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createImplementationSteps(payload: CreateImplementationStepDto) {
    try {
      const createStepPromises = [];

      for (const step of payload.steps) {
        createStepPromises.push(this.createImplementationStep(step));
      }

      return await Promise.all(createStepPromises);
    } catch (error) {
      this.logger.error("Error creating implementation steps", error);
      throw new HttpException(httpErrors.CAN_NOT_CREATE_IMPLEMENTATION_STEPS, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getImplementationStep(id: number) {
    try {
      const step = await prismaClient.implementationSteps.findUnique({
        where: { id },
      });

      if (!step) {
        throw new HttpException("Implementation step not found", HttpStatus.NOT_FOUND);
      }

      return step;
    } catch (error) {
      this.logger.error("Error getting implementation step", error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_CREATE_IMPLEMENTATION_STEPS,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteImplementationStep(id: number) {
    try {
      const step = await this.getImplementationStep(id);

      const deleteStepPromise = prismaClient.implementationSteps.delete({
        where: { id },
      });

      if (step.url) {
        await Promise.all([deleteStepPromise, this.awsS3Service.deleteFile(step.url)]);
      } else {
        await deleteStepPromise;
      }

      return STATUS_SUCCESS;
    } catch (error) {
      this.logger.error("Error deleting implementation step", error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(httpErrors.CAN_NOT_DELETE_IMPLEMENTATION_STEP, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateImplementationSteps(payload: UpdateImplementationStepsDto) {
    try {
      const ids = payload.implementationSteps.map((step) => step.id);
      const implementationSteps = await prismaClient.implementationSteps.findMany({
        where: {
          id: {
            in: ids,
          },
        },
      });

      if (ids.length !== implementationSteps.length) {
        throw new HttpException(httpErrors.IMPLEMENTATION_STEPS_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      this.logger.error("Error fetching implementation steps for update", error);
      throw error;
    }

    try {
      return await prismaClient.$transaction(async (tx) => {
        const updatePromises = [];

        for (const element of payload.implementationSteps) {
          updatePromises.push(
            tx.implementationSteps.update({
              where: { id: element.id },
              data: {
                description: element.description,
                stepNumber: element.stepNumber,
                title: element.title,
                url: element.url,
              },
            }),
          );
        }

        return await Promise.all(updatePromises);
      });
    } catch (error) {
      this.logger.error("Error updating implementation steps", error);
      throw error;
    }
  }
}
