import { Test, TestingModule } from "@nestjs/testing";
import { FTAService } from "./fta.service";
import { AwsS3Service } from "../s3/s3.service";
import { prismaClient } from "prisma/client/instance";
import { HttpException, HttpStatus } from "@nestjs/common";
import { httpErrors } from "src/exceptions/index.exceptions";
import { FTADto } from "./dto/createFta.dto";
import { ListFTADto } from "./dto/listFta.dto";
import { OrderBy } from "src/types/enums/orderBy.enum";
import { UserService } from "../user/user.service";
import { ActionEnum } from "@prisma/client";

describe("FTA", () => {
  let ftaService: FTAService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FTAService, AwsS3Service, UserService],
    }).compile();

    ftaService = module.get<FTAService>(FTAService);
  });

  describe("Get FTA Detail", () => {
    it("should return FTA detail of the respective user when this data exists in the database", async () => {
      const userId = 2,
        id = 1;

      const mockFTA = {
        id,
        userId,
        name: "Test",
      };

      const user = {
        id: userId,
        name: "Test",
      };

      prismaClient.user.findFirst = jest.fn().mockResolvedValue(user);
      prismaClient.fTA.findFirst = jest.fn().mockResolvedValue(mockFTA);

      const result = await ftaService.getFTADetail(userId, id);

      expect(result).toEqual(mockFTA);
    });
    it("should throw an error when userId does not match the userId in the mocked data", async () => {
      const userId = 3,
        id = 1;

      const mockFTA = {
        id,
        userId: 2,
        name: "Test",
      };

      const user = {
        id: 2,
        name: "Test",
      };

      prismaClient.user.findFirst = jest.fn().mockResolvedValue(user);
      prismaClient.fTA.findFirst = jest.fn().mockResolvedValue(mockFTA);

      await expect(ftaService.getFTADetail(userId, id)).rejects.toThrow(
        new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN),
      );
    });
  });

  describe("Create FTA", () => {
    it("should successfully create a FTA", async () => {
      const userId = 1;
      const thumbnail = [{ size: 1024 } as Express.Multer.File];
      const thumbnailLink = "https://example.com/image.jpg";

      const createFTA: FTADto = {
        parameters: {
          test: "Test",
        },
        fontFamily: "Arial",
        thumbnail: thumbnail[0],
      };

      const mockCreatedFTA = {
        id: 1,
        userId,
        ...createFTA,
        image: thumbnailLink,
        size: thumbnail[0].size,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(ftaService["awsS3Service"], "uploadFile").mockResolvedValue(thumbnailLink);
      prismaClient.fTA.create = jest.fn().mockResolvedValue(mockCreatedFTA);
      prismaClient.user.findUnique = jest.fn().mockResolvedValue({
        id: userId,
        planDetails: [
          {
            enableFlag: true,
            limitedUsage: 10,
            action: {
              type: ActionEnum.FTA_SAVE_TYPED_DATA,
            },
          },
        ],
      });

      prismaClient.planDetail.findMany = jest.fn().mockResolvedValue([
        {
          enableFlag: true,
          limitedUsage: 10,
          action: {
            type: ActionEnum.FTA_SAVE_TYPED_DATA,
          },
        },
      ]);
      prismaClient.fTA.count = jest.fn().mockResolvedValue(0);

      const result = await ftaService.create(userId, createFTA, { thumbnail });

      expect(result).toEqual(mockCreatedFTA);
      expect(prismaClient.fTA.create).toHaveBeenCalledWith({
        data: {
          userId,
          parameters: createFTA.parameters,
          fontFamily: createFTA.fontFamily,
          image: thumbnailLink,
          size: thumbnail[0].size,
        },
      });
    });

    it("should throw an error when image upload fails", async () => {
      const userId = 1;
      const thumbnail = [{ size: 1024 } as Express.Multer.File];
      const createFTA: FTADto = {
        parameters: {
          test: "Test",
        },
        fontFamily: "Arial",
        thumbnail: thumbnail[0],
      };

      jest.spyOn(ftaService["awsS3Service"], "uploadFile").mockRejectedValue(new Error("Upload failed"));

      await expect(ftaService.create(userId, createFTA, { thumbnail })).rejects.toThrow(
        new HttpException(httpErrors.CAN_NOT_UPLOAD_IMAGE, HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe("getFTAList", () => {
    it("should return a list of ftas with pagination", async () => {
      const userId = 1;
      const queries: ListFTADto = {
        page: 1,
        size: 10,
        orderBy: OrderBy.DESC,
      };

      const mockFTAs = [
        { id: 1, name: "FTA 1", userId },
        { id: 2, name: "FTA 2", userId },
      ];

      const mockPaginatedResult = {
        data: mockFTAs,
        totalPage: 1,
      };

      prismaClient.fTA.findMany = jest.fn().mockResolvedValue(mockFTAs);
      prismaClient.fTA.count = jest.fn().mockResolvedValue(mockFTAs.length);

      const result = await ftaService.getFTAList(userId, queries);

      expect(result).toEqual(mockPaginatedResult);
      expect(prismaClient.fTA.findMany).toHaveBeenCalledWith({
        where: { userId },
        take: queries.size,
        skip: 0,
        orderBy: {
          createdAt: "desc",
        },
      });
      expect(prismaClient.fTA.count).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe("updateFTA", () => {
    it("should update a fta successfully", async () => {
      const userId = 1;
      const ftaId = 1;
      const thumbnail = [{ size: 1024 } as Express.Multer.File];
      const updateFTA: FTADto = {
        parameters: { name: "Updated Root" },
        fontFamily: "Helvetica",
        thumbnail: thumbnail[0],
      };

      const mockExistingFTA = {
        id: ftaId,
        userId,
        image: "old-image-url",
      };

      const mockUpdatedFTA = {
        ...mockExistingFTA,
        ...updateFTA,
        image: "new-image-url",
      };

      prismaClient.fTA.findFirst = jest.fn().mockResolvedValue(mockExistingFTA);
      prismaClient.fTA.update = jest.fn().mockResolvedValue(mockUpdatedFTA);
      jest.spyOn(ftaService["awsS3Service"], "uploadFile").mockResolvedValue("new-image-url");

      const result = await ftaService.updateFTA(userId, ftaId, updateFTA, { thumbnail });

      expect(result).toEqual(mockUpdatedFTA);
      expect(prismaClient.fTA.findFirst).toHaveBeenCalledWith({
        where: { id: ftaId },
      });
      expect(ftaService["awsS3Service"].uploadFile).toHaveBeenCalledWith(thumbnail[0]);
      expect(prismaClient.fTA.update).toHaveBeenCalledWith({
        where: { id: ftaId },
        data: expect.objectContaining({
          parameters: updateFTA.parameters,
          fontFamily: updateFTA.fontFamily,
          image: "new-image-url",
          size: thumbnail[0].size,
        }),
      });
    });

    it("should throw an error if fta is not found", async () => {
      const userId = 1;
      const ftaId = 999;
      const thumbnail = [{ size: 1024 } as Express.Multer.File];
      const updateFTA: FTADto = {
        parameters: { name: "Updated Root" },
        fontFamily: "Helvetica",
        thumbnail: thumbnail[0],
      };

      prismaClient.fTA.findFirst = jest.fn().mockResolvedValue(null);

      await expect(ftaService.updateFTA(userId, ftaId, updateFTA, {})).rejects.toThrow(
        new HttpException(httpErrors.FTA_NOT_FOUND, HttpStatus.NOT_FOUND),
      );
    });

    it("should throw an error if user does not have permission", async () => {
      const userId = 1;
      const ftaId = 1;
      const thumbnail = [{ size: 1024 } as Express.Multer.File];
      const updateFTA: FTADto = {
        parameters: { name: "Updated Root" },
        fontFamily: "Helvetica",
        thumbnail: thumbnail[0],
      };

      const mockExistingFTA = {
        id: ftaId,
        userId: 2, // Different user ID
        image: "old-image-url",
      };

      prismaClient.fTA.findFirst = jest.fn().mockResolvedValue(mockExistingFTA);

      await expect(ftaService.updateFTA(userId, ftaId, updateFTA, {})).rejects.toThrow(
        new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN),
      );
    });

    it("should throw an error if image upload fails", async () => {
      const userId = 1;
      const ftaId = 1;
      const thumbnail = [{ size: 1024 } as Express.Multer.File];
      const updateFTA: FTADto = {
        parameters: { name: "Updated Root" },
        fontFamily: "Helvetica",
        thumbnail: thumbnail[0],
      };

      const mockExistingFTA = {
        id: ftaId,
        userId,
        image: "old-image-url",
      };

      prismaClient.fTA.findFirst = jest.fn().mockResolvedValue(mockExistingFTA);
      jest.spyOn(ftaService["awsS3Service"], "uploadFile").mockRejectedValue(new Error("Upload failed"));

      await expect(ftaService.updateFTA(userId, ftaId, updateFTA, { thumbnail })).rejects.toThrow(
        new HttpException(httpErrors.CAN_NOT_UPLOAD_IMAGE, HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });
});
