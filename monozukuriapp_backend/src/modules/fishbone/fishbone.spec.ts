import { Test, TestingModule } from "@nestjs/testing";
import { FishBoneService } from "./fishbone.service";
import { AwsS3Service } from "../s3/s3.service";
import { prismaClient } from "prisma/client/instance";
import { HttpException, HttpStatus } from "@nestjs/common";
import { httpErrors } from "src/exceptions/index.exceptions";
import { FishboneDto } from "./dto/createFishBone.dto";
import { ListFishBoneDto } from "./dto/listFishBone.dto";
import { OrderBy } from "src/types/enums/orderBy.enum";
import { UserService } from "../user/user.service";
import { ActionEnum } from "@prisma/client";
import { GoogleApiModule } from "../googleApi/googleApi.modute";

describe("FishBone", () => {
  let fishBoneService: FishBoneService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [GoogleApiModule],
      providers: [FishBoneService, AwsS3Service, UserService],
    }).compile();

    fishBoneService = module.get<FishBoneService>(FishBoneService);
  });

  describe("Get Fishbone Detail", () => {
    it("should return Fishbone detail of the respective user when this data exists in the database", async () => {
      const userId = 2,
        id = 1;

      const mockFishbone = {
        id,
        userId,
        name: "Test",
      };

      const user = {
        id: userId,
        name: "Test",
      };

      prismaClient.user.findFirst = jest.fn().mockResolvedValue(user);
      prismaClient.fishBone.findFirst = jest.fn().mockResolvedValue(mockFishbone);

      const result = await fishBoneService.getFishBoneDetail(userId, id);

      expect(result).toEqual(mockFishbone);
    });
    it("should throw an error when userId does not match the userId in the mocked data", async () => {
      const userId = 3,
        id = 1;

      const mockFishbone = {
        id,
        userId: 2,
        name: "Test",
      };

      const user = {
        id: 2,
        name: "Test",
      };

      prismaClient.user.findFirst = jest.fn().mockResolvedValue(user);
      prismaClient.fishBone.findFirst = jest.fn().mockResolvedValue(mockFishbone);

      await expect(fishBoneService.getFishBoneDetail(userId, id)).rejects.toThrow(
        new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN),
      );
    });
  });

  describe("Create Fishbone", () => {
    it("should successfully create a fishbone", async () => {
      const userId = 1;
      const thumbnail = [{ size: 1024 } as Express.Multer.File];
      const thumbnailLink = "https://example.com/image.jpg";

      const createFishboneDto: FishboneDto = {
        parameters: {
          test: "Test",
        },
        fontFamily: "Arial",
        thumbnail: thumbnail[0],
      };

      const mockCreatedFishbone = {
        id: 1,
        userId,
        ...createFishboneDto,
        image: thumbnailLink,
        size: thumbnail[0].size,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(fishBoneService["awsS3Service"], "uploadFile").mockResolvedValue(thumbnailLink);
      prismaClient.fishBone.create = jest.fn().mockResolvedValue(mockCreatedFishbone);
      prismaClient.user.findUnique = jest.fn().mockResolvedValue({
        id: userId,
        planDetails: [
          {
            enableFlag: true,
            limitedUsage: 10,
            action: {
              type: ActionEnum.FISHBONE_SAVE_TYPED_DATA,
            },
          },
        ],
      });

      prismaClient.planDetail.findMany = jest.fn().mockResolvedValue([
        {
          enableFlag: true,
          limitedUsage: 10,
          action: {
            type: ActionEnum.FISHBONE_SAVE_TYPED_DATA,
          },
        },
      ]);
      prismaClient.fishBone.count = jest.fn().mockResolvedValue(0);

      const result = await fishBoneService.create(userId, createFishboneDto, { thumbnail });

      expect(result).toEqual(mockCreatedFishbone);
      expect(prismaClient.fishBone.create).toHaveBeenCalledWith({
        data: {
          userId,
          parameters: createFishboneDto.parameters,
          fontFamily: createFishboneDto.fontFamily,
          image: thumbnailLink,
          size: thumbnail[0].size,
        },
      });
    });

    it("should throw an error when image upload fails", async () => {
      const userId = 1;
      const thumbnail = [{ size: 1024 } as Express.Multer.File];

      const createFishboneDto: FishboneDto = {
        parameters: {
          test: "Test",
        },
        fontFamily: "Arial",
        thumbnail: thumbnail[0],
      };

      jest.spyOn(fishBoneService["awsS3Service"], "uploadFile").mockRejectedValue(new Error("Upload failed"));

      await expect(fishBoneService.create(userId, createFishboneDto, { thumbnail })).rejects.toThrow(
        new HttpException(httpErrors.CAN_NOT_UPLOAD_IMAGE, HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe("getFishBoneList", () => {
    it("should return a list of fishbones with pagination", async () => {
      const userId = 1;
      const queries: ListFishBoneDto = {
        page: 1,
        size: 10,
        orderBy: OrderBy.DESC,
      };

      const mockFishBones = [
        { id: 1, name: "Fishbone 1", userId },
        { id: 2, name: "Fishbone 2", userId },
      ];

      const mockPaginatedResult = {
        data: mockFishBones,
        totalPage: 1,
      };

      prismaClient.fishBone.findMany = jest.fn().mockResolvedValue(mockFishBones);
      prismaClient.fishBone.count = jest.fn().mockResolvedValue(mockFishBones.length);

      const result = await fishBoneService.getFishBoneList(userId, queries);

      expect(result).toEqual(mockPaginatedResult);
      expect(prismaClient.fishBone.findMany).toHaveBeenCalledWith({
        where: { userId },
        take: queries.size,
        skip: 0,
        orderBy: {
          createdAt: "desc",
        },
      });
      expect(prismaClient.fishBone.count).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe("updateFishBone", () => {
    it("should update a fishbone successfully", async () => {
      const userId = 1;
      const fishboneId = 1;
      const thumbnail = [{ size: 1024 } as Express.Multer.File];
      const updateFishBoneDto: FishboneDto = {
        parameters: { name: "Updated Root" },
        fontFamily: "Helvetica",
        thumbnail: thumbnail[0],
      };

      const mockExistingFishBone = {
        id: fishboneId,
        userId,
        image: "old-image-url",
      };

      const mockUpdatedFishBone = {
        ...mockExistingFishBone,
        ...updateFishBoneDto,
        image: "new-image-url",
      };

      prismaClient.fishBone.findFirst = jest.fn().mockResolvedValue(mockExistingFishBone);
      prismaClient.fishBone.update = jest.fn().mockResolvedValue(mockUpdatedFishBone);
      jest.spyOn(fishBoneService["awsS3Service"], "uploadFile").mockResolvedValue("new-image-url");

      const result = await fishBoneService.updateFishBone(userId, fishboneId, updateFishBoneDto, { thumbnail });

      expect(result).toEqual(mockUpdatedFishBone);
      expect(prismaClient.fishBone.findFirst).toHaveBeenCalledWith({
        where: { id: fishboneId },
      });
      expect(fishBoneService["awsS3Service"].uploadFile).toHaveBeenCalledWith(thumbnail[0]);
      expect(prismaClient.fishBone.update).toHaveBeenCalledWith({
        where: { id: fishboneId },
        data: expect.objectContaining({
          parameters: updateFishBoneDto.parameters,
          fontFamily: updateFishBoneDto.fontFamily,
          image: "new-image-url",
          size: thumbnail[0].size,
        }),
      });
    });

    it("should throw an error if fishbone is not found", async () => {
      const userId = 1;
      const fishboneId = 999;
      const thumbnail = [{ size: 1024 } as Express.Multer.File];
      const updateFishBoneDto: FishboneDto = {
        parameters: { name: "Updated Root" },
        fontFamily: "Helvetica",
        thumbnail: thumbnail[0],
      };

      prismaClient.fishBone.findFirst = jest.fn().mockResolvedValue(null);

      await expect(fishBoneService.updateFishBone(userId, fishboneId, updateFishBoneDto, {})).rejects.toThrow(
        new HttpException(httpErrors.FISHBONE_NOT_FOUND, HttpStatus.NOT_FOUND),
      );
    });

    it("should throw an error if user does not have permission", async () => {
      const userId = 1;
      const fishboneId = 1;
      const thumbnail = [{ size: 1024 } as Express.Multer.File];
      const updateFishBoneDto: FishboneDto = {
        parameters: { name: "Updated Root" },
        fontFamily: "Helvetica",
        thumbnail: thumbnail[0],
      };

      const mockExistingFishBone = {
        id: fishboneId,
        userId: 2, // Different user ID
        image: "old-image-url",
      };

      prismaClient.fishBone.findFirst = jest.fn().mockResolvedValue(mockExistingFishBone);

      await expect(fishBoneService.updateFishBone(userId, fishboneId, updateFishBoneDto, {})).rejects.toThrow(
        new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN),
      );
    });

    it("should throw an error if image upload fails", async () => {
      const userId = 1;
      const fishboneId = 1;
      const thumbnail = [{ size: 2048 } as Express.Multer.File];
      const updateFishBoneDto: FishboneDto = {
        parameters: { name: "Updated Root" },
        fontFamily: "Helvetica",
        thumbnail: thumbnail[0],
      };

      const mockExistingFishBone = {
        id: fishboneId,
        userId,
        image: "old-image-url",
      };

      prismaClient.fishBone.findFirst = jest.fn().mockResolvedValue(mockExistingFishBone);
      jest.spyOn(fishBoneService["awsS3Service"], "uploadFile").mockRejectedValue(new Error("Upload failed"));

      await expect(
        fishBoneService.updateFishBone(userId, fishboneId, updateFishBoneDto, { thumbnail }),
      ).rejects.toThrow(new HttpException(httpErrors.CAN_NOT_UPLOAD_IMAGE, HttpStatus.INTERNAL_SERVER_ERROR));
    });
  });
});
