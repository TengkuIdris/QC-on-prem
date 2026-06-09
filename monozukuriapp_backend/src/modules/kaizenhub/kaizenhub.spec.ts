import { HttpException, HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { prismaClient } from "prisma/client/instance";
import { httpErrors } from "src/exceptions/index.exceptions";
import { OrderBy } from "src/types/enums/orderBy.enum";
import { TypeImprovement, TypeListImprovement } from "src/types/enums/typeImprovement.enum";
import { AwsS3Service } from "../s3/s3.service";
import { CreateImprovementDto } from "./dto/createImprovement.dto";
import { ListImprovementDto } from "./dto/improvementList.dto";
import { UpdateUserInfoDto } from "./dto/updateUserInfo.dto";
import { KaizenhubService } from "./kaizenhub.service";

describe("KaizenHubService", () => {
  let kaizenHubService: KaizenhubService;
  let awsS3Service: AwsS3Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KaizenhubService, AwsS3Service],
    }).compile();
    kaizenHubService = module.get<KaizenhubService>(KaizenhubService);
    awsS3Service = module.get<AwsS3Service>(AwsS3Service);
  });

  describe("createKaizenHub", () => {
    it("should create a new improvement", async () => {
      const userId = 1;

      const beforeImage = { size: 1024 } as Express.Multer.File;
      const beforeImageLink = "https://example.com/imageBefore.jpg";

      const createKaizenHubDto: CreateImprovementDto = {
        title: "Test KaizenHub",
        description: "Test Description",
        type: TypeImprovement.KANBAN,
        labels: ["test label"],
        situationBeforeImprovement: "Situation Before Improvement",
        situationAfterImprovement: "Situation After Improvement",
        improvementProcedures: "Improvement Procedures",
        tipsAndTricks: "Tips and Tricks",
        afterImage: null,
        beforeImage: beforeImage,
        isDraft: false,
      };

      const mockLabel = {
        id: 1,
        name: "test label",
      };

      const mockCreatedKaizenHub = {
        id: 1,
        userId,
        ...createKaizenHubDto,
        beforeImage: beforeImageLink,
        afterImage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLabelAndImprovement = {
        id: 1,
        labelId: 1,
        improvementId: 1,
      };

      prismaClient.$transaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          improvement: {
            create: jest.fn().mockResolvedValue(mockCreatedKaizenHub),
          },
          label: {
            create: jest.fn().mockResolvedValue(mockLabel),
            findFirst: jest.fn().mockResolvedValue(mockLabel),
          },
          labelAndImprovement: {
            create: jest.fn().mockResolvedValue(mockLabelAndImprovement),
          },
        };

        return callback(tx);
      });

      jest.spyOn(kaizenHubService["awsS3Service"], "uploadFile").mockResolvedValue(beforeImageLink);

      const result = await kaizenHubService.createImprovement(userId, createKaizenHubDto);

      expect(result).toEqual(mockCreatedKaizenHub);
    });

    it("should throw an error if image upload fails", async () => {
      //Arrange
      const userId = 1;
      const createKaizenHubDto: CreateImprovementDto = {
        title: "Test KaizenHub",
        description: "Test Description",
        type: TypeImprovement.KANBAN,
        labels: ["label1", "label2"],
        situationBeforeImprovement: "Situation Before Improvement",
        situationAfterImprovement: "Situation After Improvement",
        improvementProcedures: "Improvement Procedures",
        tipsAndTricks: "Tips and Tricks",
        afterImage: { buffer: Buffer.from("test"), originalname: "test.jpg" } as Express.Multer.File,
        beforeImage: null,
        isDraft: false,
      };

      jest.spyOn(kaizenHubService["awsS3Service"], "uploadFile").mockRejectedValue(new Error("Upload failed"));

      //Act & Assert
      await expect(kaizenHubService.createImprovement(userId, createKaizenHubDto)).rejects.toThrow(
        new HttpException(httpErrors.CAN_NOT_UPLOAD_IMAGE, HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe("getKaizenHubDetail", () => {
    it("should return KaizenHub detail", async () => {
      //Arrange
      const mockImprovementDetail = {
        id: 1,
        labels: [{ label: "Label 1" }],
        user: { id: 1, name: "User name" },
        _count: {
          likes: 0,
        },
      };

      prismaClient.improvement.findUnique = jest.fn().mockResolvedValue(mockImprovementDetail);

      // Act
      const result = await kaizenHubService.getImprovementDetail(1);

      // Assert
      expect(prismaClient.improvement.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          _count: {
            select: {
              likes: true,
              reviews: true,
            },
          },
          labels: {
            select: {
              label: true,
            },
          },
          user: true,
        },
      });

      expect(result).toEqual(mockImprovementDetail);
    });

    it("should throw an error if KaizenHub is not found", async () => {
      const mockImprovementDetail = {
        id: 1,
        labels: [{ label: "Label 1" }],
        user: { id: 1, name: "User name" },
      };

      const otherKaizenHubId = 2;

      prismaClient.improvement.findUnique = jest.fn().mockImplementation(({ where }) => {
        if (where.id === otherKaizenHubId) {
          return null;
        }
        return mockImprovementDetail;
      });
      await expect(kaizenHubService.getImprovementDetail(otherKaizenHubId)).rejects.toThrow(
        new HttpException(httpErrors.IMPROVEMENT_NOT_FOUND, HttpStatus.NOT_FOUND),
      );
    });
  });

  describe("updateKaizenHub", () => {
    it("should update KaizenHub", async () => {
      //Arrange
      const userId = 1;
      const kaizenHubId = 1;
      const updateKaizenHubDto: CreateImprovementDto = {
        title: "Test KaizenHub",
        description: "Test Description",
        type: TypeImprovement.KANBAN,
        labels: ["test label"],
        situationBeforeImprovement: "Situation Before Improvement",
        situationAfterImprovement: "Situation After Improvement",
        improvementProcedures: "Improvement Procedures",
        tipsAndTricks: "Tips and Tricks",
        afterImage: null,
        beforeImage: null,
        isDraft: false,
      };

      const mockLabel = {
        id: 1,
        name: "test label",
      };

      const mockLabelAndImprovement = {
        id: 1,
        labelId: 1,
        improvementId: 1,
      };

      const mockExistingKaizenHub = { id: kaizenHubId, userId, name: "Old Name" };
      const mockUpdatedKaizenHub = {
        id: kaizenHubId,
        userId,
        name: "new improvement",
        ...mockExistingKaizenHub,
        ...updateKaizenHubDto,
      };

      prismaClient.improvement.findUnique = jest
        .fn()
        .mockResolvedValueOnce(mockExistingKaizenHub)
        .mockResolvedValueOnce(mockUpdatedKaizenHub);

      prismaClient.$transaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          improvement: {
            update: jest.fn().mockResolvedValue(mockUpdatedKaizenHub),
          },
          label: {
            create: jest.fn().mockResolvedValue(mockLabel),
            findFirst: jest.fn().mockResolvedValue(mockLabel),
          },
          labelAndImprovement: {
            create: jest.fn().mockResolvedValue(mockLabelAndImprovement),
            findFirst: jest.fn().mockResolvedValue(mockLabelAndImprovement),
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        };

        return callback(tx);
      });

      jest.spyOn(awsS3Service, "uploadFile").mockResolvedValue("new-image-url");
      jest.spyOn(awsS3Service, "deleteFile").mockResolvedValue(undefined);

      //Act
      const result = await kaizenHubService.updateImprovement(userId, kaizenHubId, updateKaizenHubDto);

      //Assert
      expect(result).toEqual(mockUpdatedKaizenHub);
      expect(prismaClient.improvement.findUnique).toHaveBeenCalledTimes(2);
    });

    it("should throw an error if KaizenHub is not found", async () => {
      //Arrange
      const userId = 1;
      const kaizenHubId = 999;
      const updateKaizenHubDto: CreateImprovementDto = {
        title: "Test KaizenHub",
        description: "Test Description",
        type: TypeImprovement.KANBAN,
        labels: ["label1", "label2"],
        situationBeforeImprovement: "Situation Before Improvement",
        situationAfterImprovement: "Situation After Improvement",
        improvementProcedures: "Improvement Procedures",
        tipsAndTricks: "Tips and Tricks",
        afterImage: null,
        beforeImage: null,
        isDraft: false,
      };

      //Act & Assert
      await expect(kaizenHubService.updateImprovement(userId, kaizenHubId, updateKaizenHubDto)).rejects.toThrow(
        new HttpException(httpErrors.IMPROVEMENT_NOT_FOUND, HttpStatus.NOT_FOUND),
      );
    });
  });

  describe("listKaizenHub", () => {
    it("should return a list of KaizenHubs", async () => {
      //Arrange
      const mockKaizenHubs = [
        { id: 1, name: "KaizenHub 1" },
        { id: 2, name: "KaizenHub 2" },
      ];
      prismaClient.improvement.findMany = jest.fn().mockResolvedValue(mockKaizenHubs);
      prismaClient.improvement.count = jest.fn().mockResolvedValue(mockKaizenHubs.length);

      const queries: ListImprovementDto = {
        page: 1,
        size: 10,
        orderBy: OrderBy.DESC,
      };

      //Act
      const result = await kaizenHubService.getImprovementList(queries);

      //Assert
      expect(result).toEqual({
        data: mockKaizenHubs,
        totalPage: 1,
      });
      expect(prismaClient.improvement.findMany).toHaveBeenCalled();
      expect(prismaClient.improvement.count).toHaveBeenCalled();
    });
  });

  describe("getFavoriteImprovements", () => {
    it("should return favorite improvements sorted by created date DESC by default", async () => {
      // Arrange
      const userId = 1;
      const queries: ListImprovementDto = {
        page: 1,
        size: 10,
        orderBy: OrderBy.DESC,
      };

      const mockFavorites = [
        {
          id: 1,
          userId: userId,
          improvementId: 1,
          improvement: {
            id: 1,
            title: "Recent Improvement",
            createdAt: new Date("2024-03-15"),
            _count: {
              likes: 5,
            },
          },
        },
        {
          id: 2,
          userId: userId,
          improvementId: 2,
          improvement: {
            id: 2,
            title: "Older Improvement",
            createdAt: new Date("2024-03-10"),
            _count: {
              likes: 10,
            },
          },
        },
      ];

      prismaClient.favorite.findMany = jest.fn().mockResolvedValue(mockFavorites);
      prismaClient.favorite.count = jest.fn().mockResolvedValue(mockFavorites.length);

      // Act
      const result = await kaizenHubService.getFavoriteImprovements(userId, queries);

      // Assert
      expect(result).toEqual({
        data: [
          {
            id: 1,
            title: "Recent Improvement",
            createdAt: new Date("2024-03-15"),
            _count: {
              likes: 5,
            },
          },
          {
            id: 2,
            title: "Older Improvement",
            createdAt: new Date("2024-03-10"),
            _count: {
              likes: 10,
            },
          },
        ],
        totalPage: 1,
      });

      expect(prismaClient.favorite.findMany).toHaveBeenCalledWith({
        where: {
          userId: userId,
        },
        include: {
          improvement: {
            include: {
              _count: {
                select: {
                  likes: true,
                },
              },
            },
          },
        },
        orderBy: {
          improvement: {
            createdAt: OrderBy.DESC,
          },
        },
        take: 10,
        skip: 0,
      });
    });

    it("should return favorite improvements sorted by likes count when typeList is Like", async () => {
      // Arrange
      const userId = 1;
      const queries: ListImprovementDto = {
        page: 1,
        size: 10,
        orderBy: OrderBy.DESC,
        typeList: TypeListImprovement.Like,
      };

      const mockFavorites = [
        {
          id: 1,
          userId: userId,
          improvementId: 1,
          improvement: {
            id: 1,
            title: "Most Liked",
            _count: {
              likes: 100,
            },
          },
        },
        {
          id: 2,
          userId: userId,
          improvementId: 2,
          improvement: {
            id: 2,
            title: "Less Liked",
            _count: {
              likes: 50,
            },
          },
        },
      ];

      prismaClient.favorite.findMany = jest.fn().mockResolvedValue(mockFavorites);
      prismaClient.favorite.count = jest.fn().mockResolvedValue(mockFavorites.length);

      // Act
      const result = await kaizenHubService.getFavoriteImprovements(userId, queries);

      // Assert
      expect(result).toEqual({
        data: [
          {
            id: 1,
            title: "Most Liked",
            _count: {
              likes: 100,
            },
          },
          {
            id: 2,
            title: "Less Liked",
            _count: {
              likes: 50,
            },
          },
        ],
        totalPage: 1,
      });

      expect(prismaClient.favorite.findMany).toHaveBeenCalledWith({
        where: {
          userId: userId,
        },
        include: {
          improvement: {
            include: {
              _count: {
                select: {
                  likes: true,
                },
              },
            },
          },
        },
        orderBy: [
          {
            improvement: {
              likes: {
                _count: OrderBy.DESC,
              },
            },
          },
          {
            improvement: {
              createdAt: OrderBy.DESC,
            },
          },
        ],
        take: 10,
        skip: 0,
      });
    });

    it("should handle pagination correctly", async () => {
      // Arrange
      const userId = 1;
      const queries: ListImprovementDto = {
        page: 2,
        size: 5,
        orderBy: OrderBy.DESC,
      };

      const mockFavorites = [
        {
          id: 6,
          userId: userId,
          improvementId: 6,
          improvement: {
            id: 6,
            title: "Page 2 Improvement 1",
            _count: {
              likes: 5,
            },
          },
        },
        {
          id: 7,
          userId: userId,
          improvementId: 7,
          improvement: {
            id: 7,
            title: "Page 2 Improvement 2",
            _count: {
              likes: 3,
            },
          },
        },
      ];

      prismaClient.favorite.findMany = jest.fn().mockResolvedValue(mockFavorites);
      prismaClient.favorite.count = jest.fn().mockResolvedValue(mockFavorites.length);
      // Act
      const result = await kaizenHubService.getFavoriteImprovements(userId, queries);

      // Assert
      expect(result).toEqual({
        data: [
          {
            id: 6,
            title: "Page 2 Improvement 1",
            _count: {
              likes: 5,
            },
          },
          {
            id: 7,
            title: "Page 2 Improvement 2",
            _count: {
              likes: 3,
            },
          },
        ],
        totalPage: 1,
      });

      expect(prismaClient.favorite.findMany).toHaveBeenCalledWith({
        where: {
          userId: userId,
        },
        include: {
          improvement: {
            include: {
              _count: {
                select: {
                  likes: true,
                },
              },
            },
          },
        },
        orderBy: {
          improvement: {
            createdAt: OrderBy.DESC,
          },
        },
        take: 5,
        skip: 5,
      });
    });

    it("should filter out null improvements", async () => {
      // Arrange
      const userId = 1;
      const queries: ListImprovementDto = {
        page: 1,
        size: 10,
        orderBy: OrderBy.DESC,
      };

      const mockFavorites = [
        {
          id: 1,
          userId: userId,
          improvementId: 1,
          improvement: null,
        },
        {
          id: 2,
          userId: userId,
          improvementId: 2,
          improvement: {
            id: 2,
            title: "Valid Improvement",
            _count: {
              likes: 5,
            },
          },
        },
      ];

      prismaClient.favorite.findMany = jest.fn().mockResolvedValue(mockFavorites);
      prismaClient.favorite.count = jest.fn().mockResolvedValue(mockFavorites.length);

      // Act
      const result = await kaizenHubService.getFavoriteImprovements(userId, queries);

      // Assert
      expect(result).toEqual({
        data: [
          {
            id: 2,
            title: "Valid Improvement",
            _count: {
              likes: 5,
            },
          },
        ],
        totalPage: 1,
      });
    });
  });

  describe("updateUserInfo", () => {
    it("should update user info successfully", async () => {
      // Arrange
      const userId = 1;
      const updateUserInfoDto: UpdateUserInfoDto = {
        company: "JATCO",
        department: "IT Department",
        email: "should.not.update@example.com",
      };

      const mockUpdatedUser = {
        id: userId,
        company: "JATCO",
        department: "IT Department",
        email: "original.email@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaClient.user.update = jest.fn().mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await kaizenHubService.updateUserInfo(userId, updateUserInfoDto);

      // Assert
      expect(result).toEqual(mockUpdatedUser);
      expect(prismaClient.user.update).toHaveBeenCalledWith({
        where: {
          id: userId,
        },
        data: {
          company: "JATCO",
          department: "IT Department",
          email: undefined,
        },
      });
    });

    it("should handle partial updates", async () => {
      // Arrange
      const userId = 1;
      const updateUserInfoDto: UpdateUserInfoDto = {
        company: "JATCO",
        department: "",
        email: "existing.email@example.com",
      };

      const mockUpdatedUser = {
        id: userId,
        company: "JATCO",
        department: "",
        email: "existing.email@example.com",
      };

      prismaClient.user.update = jest.fn().mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await kaizenHubService.updateUserInfo(userId, updateUserInfoDto);

      // Assert
      expect(result).toEqual(mockUpdatedUser);
      expect(prismaClient.user.update).toHaveBeenCalledWith({
        where: {
          id: userId,
        },
        data: {
          company: "JATCO",
          department: "",
          email: undefined,
        },
      });
    });

    it("should throw an error when user update fails", async () => {
      // Arrange
      const userId = 999;
      const updateUserInfoDto: UpdateUserInfoDto = {
        company: "JATCO",
        department: "IT Department",
        email: "existing.email@example.com",
      };

      prismaClient.user.update = jest.fn().mockRejectedValue(new Error("User not found"));

      // Act & Assert
      await expect(kaizenHubService.updateUserInfo(userId, updateUserInfoDto)).rejects.toThrow();
    });
  });

  describe("getImprovementsByWeek", () => {
    it("should return improvements sorted by likes count", async () => {
      // Arrange
      const queries: ListImprovementDto = {
        page: 1,
        size: 10,
        orderBy: OrderBy.DESC,
      };

      const mockImprovements = [
        {
          id: 1,
          title: "Most Liked Improvement",
          _count: {
            likes: 10,
          },
        },
        {
          id: 2,
          title: "Second Most Liked",
          _count: {
            likes: 5,
          },
        },
      ];

      prismaClient.improvement.findMany = jest.fn().mockResolvedValue(mockImprovements);
      prismaClient.improvement.count = jest.fn().mockResolvedValue(mockImprovements.length);

      // Act
      const result = await kaizenHubService.getImprovementsByWeek(queries);

      // Assert
      expect(result).toEqual({
        data: mockImprovements,
        totalPage: 1,
      });

      expect(prismaClient.improvement.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ isDraft: null }, { isDraft: false }],
        },
        include: {
          _count: {
            select: {
              likes: true,
            },
          },
        },
        orderBy: [
          {
            likes: {
              _count: "desc",
            },
          },
          {
            createdAt: "desc",
          },
        ],
        take: 10,
        skip: 0,
      });

      expect(prismaClient.improvement.count).toHaveBeenCalledWith({
        where: {
          OR: [{ isDraft: null }, { isDraft: false }],
        },
      });
    });

    it("should handle empty results", async () => {
      // Arrange
      const queries: ListImprovementDto = {
        page: 1,
        size: 10,
        orderBy: OrderBy.DESC,
      };

      prismaClient.improvement.findMany = jest.fn().mockResolvedValue([]);
      prismaClient.improvement.count = jest.fn().mockResolvedValue(0);

      // Act
      const result = await kaizenHubService.getImprovementsByWeek(queries);

      // Assert
      expect(result).toEqual({
        data: [],
        totalPage: 0,
      });
    });

    it("should handle pagination correctly", async () => {
      // Arrange
      const queries: ListImprovementDto = {
        page: 2,
        size: 5,
        orderBy: OrderBy.DESC,
      };

      const mockImprovements = [
        {
          id: 6,
          title: "Improvement 6",
          _count: {
            likes: 5,
          },
        },
        {
          id: 7,
          title: "Improvement 7",
          _count: {
            likes: 4,
          },
        },
      ];

      const totalItems = 12;

      prismaClient.improvement.findMany = jest.fn().mockResolvedValue(mockImprovements);
      prismaClient.improvement.count = jest.fn().mockResolvedValue(totalItems);

      // Act
      const result = await kaizenHubService.getImprovementsByWeek(queries);

      // Assert
      expect(result).toEqual({
        data: mockImprovements,
        totalPage: 3,
      });

      expect(prismaClient.improvement.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ isDraft: null }, { isDraft: false }],
        },
        include: {
          _count: {
            select: {
              likes: true,
            },
          },
        },
        orderBy: [
          {
            likes: {
              _count: "desc",
            },
          },
          {
            createdAt: "desc",
          },
        ],
        take: 5,
        skip: 5,
      });
    });

    it("should exclude draft improvements", async () => {
      // Arrange
      const queries: ListImprovementDto = {
        page: 1,
        size: 10,
        orderBy: OrderBy.DESC,
      };

      const mockImprovements = [
        {
          id: 1,
          title: "Published Improvement",
          isDraft: false,
          _count: {
            likes: 10,
          },
        },
      ];

      prismaClient.improvement.findMany = jest.fn().mockResolvedValue(mockImprovements);
      prismaClient.improvement.count = jest.fn().mockResolvedValue(mockImprovements.length);

      // Act
      const result = await kaizenHubService.getImprovementsByWeek(queries);

      // Assert
      expect(result.data).toEqual(mockImprovements);
      expect(prismaClient.improvement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ isDraft: null }, { isDraft: false }],
          },
        }),
      );
    });
  });

  describe("getLargestLikedImprovementsByWeek", () => {
    it("should return top N improvements sorted by likes count", async () => {
      // Arrange
      const size = 3;
      const mockImprovements = [
        {
          id: 1,
          title: "Most Liked Improvement",
          user: {
            id: 1,
            name: "John Doe",
          },
          _count: {
            likes: 100,
          },
        },
        {
          id: 2,
          title: "Second Most Liked",
          user: {
            id: 2,
            name: "Jane Doe",
          },
          _count: {
            likes: 50,
          },
        },
        {
          id: 3,
          title: "Third Most Liked",
          user: {
            id: 1,
            name: "John Doe",
          },
          _count: {
            likes: 25,
          },
        },
      ];

      prismaClient.improvement.findMany = jest.fn().mockResolvedValue(mockImprovements);

      // Act
      const result = await kaizenHubService.getLargestLikedImprovementsByWeek(size);

      // Assert
      expect(result).toEqual(mockImprovements);
      expect(prismaClient.improvement.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ isDraft: null }, { isDraft: false }],
        },
        include: {
          user: true,
          _count: {
            select: {
              likes: true,
            },
          },
        },
        orderBy: [
          {
            likes: {
              _count: "desc",
            },
          },
          {
            createdAt: "desc",
          },
        ],
        take: size,
      });
    });

    it("should handle case when no improvements exist", async () => {
      // Arrange
      const size = 5;
      prismaClient.improvement.findMany = jest.fn().mockResolvedValue([]);

      // Act
      const result = await kaizenHubService.getLargestLikedImprovementsByWeek(size);

      // Assert
      expect(result).toEqual([]);
      expect(prismaClient.improvement.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ isDraft: null }, { isDraft: false }],
        },
        include: {
          user: true,
          _count: {
            select: {
              likes: true,
            },
          },
        },
        orderBy: [
          {
            likes: {
              _count: "desc",
            },
          },
          {
            createdAt: "desc",
          },
        ],
        take: size,
      });
    });

    it("should return fewer items when available improvements are less than requested size", async () => {
      // Arrange
      const size = 5;
      const mockImprovements = [
        {
          id: 1,
          title: "Most Liked Improvement",
          user: {
            id: 1,
            name: "John Doe",
          },
          _count: {
            likes: 10,
          },
        },
        {
          id: 2,
          title: "Second Most Liked",
          user: {
            id: 2,
            name: "Jane Doe",
          },
          _count: {
            likes: 5,
          },
        },
      ];

      prismaClient.improvement.findMany = jest.fn().mockResolvedValue(mockImprovements);

      // Act
      const result = await kaizenHubService.getLargestLikedImprovementsByWeek(size);

      // Assert
      expect(result).toEqual(mockImprovements);
      expect(result).toHaveLength(2);
      expect(prismaClient.improvement.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ isDraft: null }, { isDraft: false }],
        },
        include: {
          user: true,
          _count: {
            select: {
              likes: true,
            },
          },
        },
        orderBy: [
          {
            likes: {
              _count: "desc",
            },
          },
          {
            createdAt: "desc",
          },
        ],
        take: size,
      });
    });

    it("should exclude draft improvements", async () => {
      // Arrange
      const size = 2;
      const mockImprovements = [
        {
          id: 1,
          title: "Published Improvement",
          isDraft: false,
          user: {
            id: 1,
            name: "John Doe",
          },
          _count: {
            likes: 10,
          },
        },
        {
          id: 2,
          title: "Another Published Improvement",
          isDraft: null,
          user: {
            id: 2,
            name: "Jane Doe",
          },
          _count: {
            likes: 5,
          },
        },
      ];

      prismaClient.improvement.findMany = jest.fn().mockResolvedValue(mockImprovements);

      // Act
      const result = await kaizenHubService.getLargestLikedImprovementsByWeek(size);

      // Assert
      expect(result).toEqual(mockImprovements);
      expect(prismaClient.improvement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ isDraft: null }, { isDraft: false }],
          },
          include: {
            user: true,
            _count: {
              select: {
                likes: true,
              },
            },
          },
        }),
      );
    });
  });

  describe("getMyImprovement", () => {
    it("should return user's improvements with default sorting by created date", async () => {
      // Arrange
      const userId = 1;
      const queries: ListImprovementDto = {
        page: 1,
        size: 10,
        orderBy: OrderBy.DESC,
      };

      const mockImprovements = [
        {
          id: 1,
          title: "Recent Improvement",
          createdAt: new Date("2024-03-15"),
          _count: { likes: 5 },
          reviews: [],
          averageRating: 0,
        },
        {
          id: 2,
          title: "Older Improvement",
          createdAt: new Date("2024-03-10"),
          _count: { likes: 3 },
          reviews: [],
          averageRating: 0,
        },
      ];

      prismaClient.improvement.findMany = jest.fn().mockResolvedValue(mockImprovements);
      prismaClient.improvement.count = jest.fn().mockResolvedValue(2);

      // Act
      const result = await kaizenHubService.getMyImprovement(queries, userId);

      // Assert
      expect(result).toEqual({
        data: mockImprovements.map((improvement) => ({
          ...improvement,
          reviews: undefined,
        })),
        totalPage: 1,
      });

      expect(prismaClient.improvement.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          OR: [{ isDraft: false }, { isDraft: null }],
        },
        include: {
          _count: {
            select: {
              likes: true,
            },
          },
          reviews: true,
        },
        orderBy: { createdAt: OrderBy.DESC },
        take: 10,
        skip: 0,
      });
    });

    it("should return improvements sorted by likes when typeList is Like", async () => {
      // Arrange
      const userId = 1;
      const queries: ListImprovementDto = {
        page: 1,
        size: 10,
        orderBy: OrderBy.DESC,
        typeList: TypeListImprovement.Like,
      };

      const mockImprovements = [
        {
          id: 1,
          title: "Most Liked",
          _count: { likes: 100 },
          reviews: [],
          averageRating: 0,
        },
        {
          id: 2,
          title: "Less Liked",
          _count: { likes: 50 },
          averageRating: 0,
          reviews: [],
        },
      ];

      prismaClient.improvement.findMany = jest.fn().mockResolvedValue(mockImprovements);
      prismaClient.improvement.count = jest.fn().mockResolvedValue(2);

      // Act
      const result = await kaizenHubService.getMyImprovement(queries, userId);

      // Assert
      expect(result).toEqual({
        data: mockImprovements.map((improvement) => ({
          ...improvement,
          reviews: undefined,
        })),
        totalPage: 1,
      });

      expect(prismaClient.improvement.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          OR: [{ isDraft: false }, { isDraft: null }],
        },
        include: {
          _count: {
            select: {
              likes: true,
            },
          },
          reviews: true,
        },
        orderBy: [{ likes: { _count: OrderBy.DESC } }, { createdAt: OrderBy.DESC }],
        take: 10,
        skip: 0,
      });
    });

    it("should filter by type when type is provided", async () => {
      // Arrange
      const userId = 1;
      const queries: ListImprovementDto = {
        page: 1,
        size: 10,
        type: TypeImprovement.KANBAN,
        orderBy: OrderBy.DESC,
      };

      const mockImprovements = [
        {
          id: 1,
          title: "Kanban Improvement",
          type: TypeImprovement.KANBAN,
          _count: { likes: 5 },
          reviews: [],
          averageRating: 0,
        },
      ];

      prismaClient.improvement.findMany = jest.fn().mockResolvedValue(mockImprovements);
      prismaClient.improvement.count = jest.fn().mockResolvedValue(1);

      // Act
      const result = await kaizenHubService.getMyImprovement(queries, userId);

      // Assert
      expect(result).toEqual({
        data: mockImprovements.map((improvement) => ({
          ...improvement,
          reviews: undefined,
        })),
        totalPage: 1,
      });

      expect(prismaClient.improvement.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          type: TypeImprovement.KANBAN,
          OR: [{ isDraft: false }, { isDraft: null }],
        },
        include: {
          _count: {
            select: {
              likes: true,
            },
          },
          reviews: true,
        },
        orderBy: { createdAt: OrderBy.DESC },
        take: 10,
        skip: 0,
      });
    });

    it("should return only draft improvements when isDraft is true", async () => {
      // Arrange
      const userId = 1;
      const queries: ListImprovementDto = {
        page: 1,
        size: 10,
        isDraft: true,
        orderBy: OrderBy.DESC,
      };

      const mockImprovements = [
        {
          id: 1,
          title: "Draft Improvement",
          isDraft: true,
          _count: { likes: 0 },
          reviews: [],
          averageRating: 0,
        },
      ];

      prismaClient.improvement.findMany = jest.fn().mockResolvedValue(mockImprovements);
      prismaClient.improvement.count = jest.fn().mockResolvedValue(1);

      // Act
      const result = await kaizenHubService.getMyImprovement(queries, userId);

      // Assert
      expect(result).toEqual({
        data: mockImprovements.map((improvement) => ({
          ...improvement,
          reviews: undefined,
        })),
        totalPage: 1,
      });

      expect(prismaClient.improvement.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          isDraft: true,
        },
        include: {
          _count: {
            select: {
              likes: true,
            },
          },
          reviews: true,
        },
        orderBy: { createdAt: OrderBy.DESC },
        take: 10,
        skip: 0,
      });
    });

    it("should handle pagination correctly", async () => {
      // Arrange
      const userId = 1;
      const queries: ListImprovementDto = {
        page: 2,
        size: 5,
        orderBy: OrderBy.DESC,
      };

      const mockImprovements = [
        {
          id: 6,
          title: "Page 2 Improvement 1",
          _count: { likes: 5 },
          reviews: [],
          averageRating: 0,
        },
        {
          id: 7,
          title: "Page 2 Improvement 2",
          _count: { likes: 3 },
          reviews: [],
          averageRating: 0,
        },
      ];

      prismaClient.improvement.findMany = jest.fn().mockResolvedValue(mockImprovements);
      prismaClient.improvement.count = jest.fn().mockResolvedValue(12); // Total 12 items

      // Act
      const result = await kaizenHubService.getMyImprovement(queries, userId);

      // Assert
      expect(result).toEqual({
        data: mockImprovements.map((improvement) => ({
          ...improvement,
          reviews: undefined,
        })),
        totalPage: 3, // 12 items / 5 per page = 3 pages
      });

      expect(prismaClient.improvement.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          OR: [{ isDraft: false }, { isDraft: null }],
        },
        include: {
          _count: {
            select: {
              likes: true,
            },
          },
          reviews: true,
        },
        orderBy: { createdAt: OrderBy.DESC },
        take: 5,
        skip: 5, // Skip first page
      });
    });
  });
});
