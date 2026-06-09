import { Test, TestingModule } from "@nestjs/testing";
import { ParetoService } from "./pareto.service";
import { AwsS3Service } from "../s3/s3.service";
import { prismaClient } from "prisma/client/instance";
import { HttpException, HttpStatus } from "@nestjs/common";
import { CreateParetoDto } from "./dto/createPareto.dto";
import { ListParetoDto } from "./dto/listPareto.dto";
import { OrderBy } from "src/types/enums/orderBy.enum";
import { Orientation, ParetoMode, PlanTypeEnum } from "@prisma/client";
import { UserService } from "../user/user.service";
import { httpErrors } from "src/exceptions/index.exceptions";
import { UpdateParetoDto } from "./dto/updatePareto.dto";

jest.mock("prisma/client/instance", () => ({
  prismaClient: {
    parento: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    paretoRecord: {
      update: jest.fn(),
    },
    userPlan: {
      findFirst: jest.fn(),
    },
  },
}));

describe("ParetoService", () => {
  let paretoService: ParetoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParetoService,
        {
          provide: AwsS3Service,
          useValue: {
            uploadFile: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getLimitedRecordsInPlan: jest.fn(),
          },
        },
      ],
    }).compile();

    paretoService = module.get<ParetoService>(ParetoService);
  });

  describe("createPareto", () => {
    it("should create a new pareto", async () => {
      const userId = 1;

      const beforeImage = { size: 1024 } as Express.Multer.File;
      const beforeImageLink = "https://example.com/imageBefore.jpg";

      const createParetoDto: CreateParetoDto = {
        mode: ParetoMode.BEFORE,
        name: "Test Pareto",
        beforeImage: beforeImage,
        before: {
          scale: 1,
          title: "Before",
          yAxisLabel: "Y Axis Label",
          yAxisUnits: "Y Axis Units",
          otherColor: "#000000",
          lineChartColor: "#000000",
          labelOrientation: Orientation.portrait,
          yAxisLabelOrientation: Orientation.portrait,
          lineLabelOrientation: Orientation.portrait,
          columnLabelOrientation: Orientation.portrait,
          xAxisItemCount: 10,
          fontSizeTitle: 10,
          lineThickness: 10,
          showBarLabels: true,
          showLineLabels: true,
          xAxisFontSize: 10,
          yAxisFontSize: 10,
          yAxisUnitSize: 10,
          lineLabelFontSize: 10,
          columnLabelFontSize: 10,
          axisFontSize: 10,
          fontFamily: "Arial",
          records: [],
        },
      };

      const mockCreatedPareto = {
        id: 1,
        ...createParetoDto,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUserPlan = {
        id: 1,
        userId,
        planId: 3,
        isActive: true,
        plan: {
          type: PlanTypeEnum.PLAN_C,
        },
        user: {
          email: "test@example.com",
        },
      };

      prismaClient.parento.create = jest.fn().mockResolvedValue(mockCreatedPareto);
      prismaClient.userPlan.findFirst = jest.fn().mockResolvedValue(mockUserPlan);
      jest.spyOn(paretoService["awsS3Service"], "uploadFile").mockResolvedValue(beforeImageLink);

      const result = await paretoService.createPareto(userId, createParetoDto, { beforeImage: [beforeImage] });

      expect(result).toEqual(mockCreatedPareto);
    });
  });

  describe("getParetoList", () => {
    it("should return a list of paretos", async () => {
      const userId = 1;
      const listParetoDto: ListParetoDto = {
        page: 1,
        size: 10,
        orderBy: OrderBy.DESC,
      };

      const mockParetoList = [
        {
          id: 1,
          title: "Test Pareto 1",
          description: "Test Description 1",
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          title: "Test Pareto 2",
          description: "Test Description 2",
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaClient.parento.findMany = jest.fn().mockResolvedValue(mockParetoList);
      prismaClient.parento.count = jest.fn().mockResolvedValue(2);

      const result = await paretoService.getParetoList(userId, listParetoDto);

      expect(result).toEqual({
        data: mockParetoList,
        totalPage: 1,
      });
    });
  });

  describe("getParetoDetail", () => {
    it("should return pareto detail", async () => {
      const userId = 1;
      const paretoId = 1;

      const mockPareto = {
        id: paretoId,
        title: "Test Pareto",
        description: "Test Description",
        userId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaClient.parento.findUnique = jest.fn().mockResolvedValue(mockPareto);

      const result = await paretoService.getParetoDetail(userId, paretoId);

      expect(result).toEqual(mockPareto);
    });

    it("should throw an error if pareto is not found", async () => {
      const userId = 1;
      const paretoId = 999;

      prismaClient.parento.findUnique = jest.fn().mockResolvedValue(null);

      await expect(paretoService.getParetoDetail(userId, paretoId)).rejects.toThrow(HttpException);
    });
  });

  describe("updateUserInfo", () => {
    it("should throw an exception if pareto is not found", async () => {
      const userId = 1;
      const paretoId = 1;

      (prismaClient.parento.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        paretoService.updateUserInfo(userId, paretoId, {
          from: new Date("2023-01-01").getTime(),
          end: new Date("2023-12-31").getTime(),
        }),
      ).rejects.toThrow(new HttpException(httpErrors.PARETO_NOT_FOUND, HttpStatus.NOT_FOUND));
    });

    it("should throw an exception if user does not have permission", async () => {
      const userId = 1;
      const paretoId = 1;

      (prismaClient.parento.findFirst as jest.Mock).mockResolvedValue({ userId: userId + 1 });

      await expect(
        paretoService.updateUserInfo(userId, paretoId, {
          from: new Date("2023-01-01").getTime(),
          end: new Date("2023-12-31").getTime(),
        }),
      ).rejects.toThrow(
        new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN),
      );
    });

    it("should update user info successfully", async () => {
      const userId = 1;
      const paretoId = 1;
      const mockPareto = { userId, id: paretoId };
      const mockUpdatedRecord = { id: 1, startTime: new Date("2023-01-01"), endTime: new Date("2023-12-31") };

      (prismaClient.parento.findFirst as jest.Mock).mockResolvedValue(mockPareto);
      (prismaClient.paretoRecord.update as jest.Mock).mockResolvedValue(mockUpdatedRecord);

      const result = await paretoService.updateUserInfo(userId, paretoId, {
        from: new Date("2023-01-01").getTime(),
        end: new Date("2023-12-31").getTime(),
      });

      expect(result).toEqual(mockUpdatedRecord);
      expect(prismaClient.paretoRecord.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          startTime: new Date("2023-01-01"),
          endTime: new Date("2023-12-31"),
          createdTime: expect.any(Date),
        },
      });
    });

    it("should throw an exception if there is an error updating the database", async () => {
      const userId = 1;
      const paretoId = 1;

      (prismaClient.parento.findFirst as jest.Mock).mockResolvedValue({ userId, id: paretoId });
      (prismaClient.paretoRecord.update as jest.Mock).mockRejectedValue(new Error("Database error"));

      await expect(
        paretoService.updateUserInfo(userId, paretoId, {
          from: new Date("2023-01-01").getTime(),
          end: new Date("2023-12-31").getTime(),
        }),
      ).rejects.toThrow(
        new HttpException(
          httpErrors.AN_ERROR_OCCURRED_WHILE_UPDATING_DATA_IN_THE_DATABASE,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe("deletePareto", () => {
    it("should throw an exception if pareto is not found", async () => {
      const userId = 1;
      const paretoId = 999;

      (prismaClient.parento.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(paretoService.deletePareto(userId, paretoId)).rejects.toThrow(
        new HttpException(httpErrors.PARETO_NOT_FOUND, HttpStatus.NOT_FOUND),
      );
    });

    it("should throw an exception if user does not have permission", async () => {
      const userId = 1;
      const paretoId = 1;

      (prismaClient.parento.findUnique as jest.Mock).mockResolvedValue({ userId: userId + 1 });

      await expect(paretoService.deletePareto(userId, paretoId)).rejects.toThrow(
        new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN),
      );
    });

    it("should delete pareto successfully", async () => {
      const userId = 1;
      const paretoId = 1;
      const mockPareto = {
        id: paretoId,
        userId,
        singleId: 10,
        afterId: 11,
        beforeId: 12,
      };

      (prismaClient.parento.findUnique as jest.Mock).mockResolvedValue(mockPareto);
      (prismaClient.$transaction as jest.Mock) = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          paretoRecord: {
            delete: jest.fn().mockResolvedValue({}),
          },
          parento: {
            delete: jest.fn().mockResolvedValue({}),
          },
        };
        await callback(tx);
      });

      await paretoService.deletePareto(userId, paretoId);

      expect(prismaClient.$transaction).toHaveBeenCalled();
    });

    it("should throw an exception if there is an error deleting from the database", async () => {
      const userId = 1;
      const paretoId = 1;

      (prismaClient.parento.findUnique as jest.Mock).mockResolvedValue({ userId, id: paretoId });
      (prismaClient.$transaction as jest.Mock) = jest.fn().mockRejectedValue(new Error("Database error"));

      await expect(paretoService.deletePareto(userId, paretoId)).rejects.toThrow(
        new HttpException(
          httpErrors.AN_ERROR_OCCURRED_WHILE_DELETING_DATA_IN_THE_DATABASE,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe("updatePareto", () => {
    const userId = 1;
    const paretoId = 1;
    const mockPareto = {
      id: paretoId,
      userId,
      mode: ParetoMode.SINGLE,
      singleId: 10,
      afterId: null,
      beforeId: null,
    };

    const mockUserPlan = {
      id: 1,
      userId,
      planId: 3,
      isActive: true,
      plan: {
        type: PlanTypeEnum.PLAN_C,
      },
      user: {
        email: "test@example.com",
      },
    };

    it("should throw an exception if pareto is not found", async () => {
      (prismaClient.parento.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(paretoService.updatePareto(userId, paretoId, { name: "" }, {})).rejects.toThrow(
        new HttpException(httpErrors.PARETO_NOT_FOUND, HttpStatus.NOT_FOUND),
      );
    });

    it("should throw an exception if user does not have permission", async () => {
      (prismaClient.parento.findUnique as jest.Mock).mockResolvedValue({ ...mockPareto, userId: userId + 1 });

      await expect(paretoService.updatePareto(userId, paretoId, { name: "" }, {})).rejects.toThrow(
        new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN),
      );
    });

    it("should throw an exception if mode and data are different", async () => {
      (prismaClient.parento.findUnique as jest.Mock).mockResolvedValue(mockPareto);

      await expect(
        paretoService.updatePareto(
          userId,
          paretoId,
          {
            name: "Test Pareto",
            after: {
              title: "",
              yAxisLabel: "",
              yAxisUnits: "",
              otherColor: "",
              lineChartColor: "",
              axisFontSize: 0,
              lineLabelFontSize: 0,
              columnLabelFontSize: 0,
              columnLabelOrientation: Orientation.portrait,
              lineLabelOrientation: Orientation.portrait,
              yAxisLabelOrientation: Orientation.portrait,
              labelOrientation: Orientation.portrait,
              fontFamily: "",
              showBarLabels: false,
              showLineLabels: false,
              records: [],
              fontSizeTitle: 0,
              lineThickness: 0,
              xAxisFontSize: 0,
              yAxisFontSize: 0,
              yAxisUnitSize: 0,
              xAxisItemCount: 0,
              scale: 0,
            },
          },
          {},
        ),
      ).rejects.toThrow(new HttpException(httpErrors.MODE_AND_DATA_HAVE_DIFFERENT, HttpStatus.INTERNAL_SERVER_ERROR));
    });

    it("should update pareto successfully", async () => {
      const updateParetoDto = {
        name: "Updated Pareto",
        single: {
          scale: 2,
          title: "Updated Single",
          records: [],
        },
      };
      const singleImage = [{ size: 1024 } as Express.Multer.File];
      const mockUpdatedPareto = {
        ...mockPareto,
        ...updateParetoDto,
        user: {
          name: "Test User",
          id: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          email: "test@example.com",
          isConfirmed: true,
          company: "Test Company",
          department: "Test Department",
        },
        singlePareto: {
          paretoItem: [],
          ...updateParetoDto.single,
        },
        afterPareto: { paretoItem: [] },
        beforePareto: { paretoItem: [] },
      };

      (prismaClient.parento.findUnique as jest.Mock).mockResolvedValue(mockPareto);
      (prismaClient.userPlan.findFirst as jest.Mock).mockResolvedValue(mockUserPlan);
      (prismaClient.$transaction as jest.Mock) = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          parento: {
            update: jest.fn().mockResolvedValue({}),
          },
          paretoItem: {
            deleteMany: jest.fn().mockResolvedValue({}),
          },
          paretoRecord: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        await callback(tx);
      });
      jest
        .spyOn(paretoService["awsS3Service"], "uploadFile")
        .mockResolvedValue("https://example.com/updated-image.jpg");
      jest.spyOn(paretoService, "getParetoById").mockResolvedValue(mockUpdatedPareto as any);

      const result = await paretoService.updatePareto(userId, paretoId, updateParetoDto as UpdateParetoDto, {
        singleImage,
      });

      expect(result).toEqual(mockUpdatedPareto);
      expect(prismaClient.$transaction).toHaveBeenCalled();
    });

    it("should throw an exception if mode and data are different", async () => {
      (prismaClient.parento.findUnique as jest.Mock).mockResolvedValue(mockPareto);
      (prismaClient.$transaction as jest.Mock) = jest.fn().mockRejectedValue(new Error("Database error"));

      await expect(paretoService.updatePareto(userId, paretoId, { name: "" }, {})).rejects.toThrow(
        new HttpException(httpErrors.MODE_AND_DATA_HAVE_DIFFERENT, HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });

    it("should throw an exception if image upload fails", async () => {
      (prismaClient.parento.findUnique as jest.Mock).mockResolvedValue(mockPareto);
      jest.spyOn(paretoService["awsS3Service"], "uploadFile").mockRejectedValue(new Error("Upload failed"));

      await expect(
        paretoService.updatePareto(userId, paretoId, { single: {} } as UpdateParetoDto, {
          singleImage: [{}] as Express.Multer.File[],
        }),
      ).rejects.toThrow(new HttpException(httpErrors.CAN_NOT_UPLOAD_IMAGE, HttpStatus.INTERNAL_SERVER_ERROR));
    });

    it("should throw an exception if there is an error updating the database", async () => {
      (prismaClient.parento.findUnique as jest.Mock).mockResolvedValue(mockPareto);
      (prismaClient.$transaction as jest.Mock) = jest.fn().mockRejectedValue(new Error("Database error"));

      await expect(
        paretoService.updatePareto(userId, paretoId, { single: {} } as UpdateParetoDto, {
          singleImage: [{}] as Express.Multer.File[],
        }),
      ).rejects.toThrow(
        new HttpException(
          httpErrors.AN_ERROR_OCCURRED_WHILE_UPDATING_DATA_IN_THE_DATABASE,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});
