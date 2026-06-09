import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { prismaClient } from "prisma/client/instance";
import { CreateImprovementDto } from "./dto/createImprovement.dto";
import { httpErrors } from "src/exceptions/index.exceptions";
import { AwsS3Service } from "../s3/s3.service";
import { ListImprovementDto } from "./dto/improvementList.dto";
import { pagination } from "src/helpers/pagination.helper";
import { Mode } from "src/types/enums/queries.enum";
import { Favorite, Improvement, Like, MetricsEnum, Prisma } from "@prisma/client";
import { getExceptionTransaction, handleThrowExceptionTransaction } from "src/helpers/exceptionTransaction";
import { UpdateUserInfoDto } from "./dto/updateUserInfo.dto";
import { OrderBy } from "src/types/enums/orderBy.enum";
import { TypeListImprovement } from "src/types/enums/typeImprovement.enum";
import { TypeAction } from "src/types/enums/favorite.enum";
import { CreateReviewDto } from "./dto/createReview.dto";
import { ListImprovementSearchDto } from "./dto/listImprovementSearch.dto";
import { ListReviewDto } from "./dto/listReview.dto";
import { Cron } from "@nestjs/schedule";

@Injectable()
export class KaizenhubService {
  constructor(private readonly awsS3Service: AwsS3Service) {}
  private readonly logger = new Logger(KaizenhubService.name);

  private async validateCreateAndUpdate(relatedDocumentIds: number[], stepIds: number[]) {
    if (relatedDocumentIds && relatedDocumentIds.length > 0) {
      const existingDocuments = await prismaClient.relatedDocuments.findMany({
        where: {
          id: { in: relatedDocumentIds },
        },
      });

      if (existingDocuments.length !== relatedDocumentIds.length) {
        this.logger.error("Some related documents do not exist");
        throw new HttpException(httpErrors.RELATED_DOCUMENT_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
    }

    if (stepIds && stepIds.length > 0) {
      const existingSteps = await prismaClient.implementationSteps.findMany({
        where: {
          id: { in: stepIds },
        },
      });

      if (existingSteps.length !== stepIds.length) {
        this.logger.error("Some implementation steps do not exist");
        throw new HttpException(httpErrors.IMPLEMENTATION_STEP_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
    }
  }

  async validateTitle(title: string, id?: number) {
    if (title?.trim()) {
      const conflictTitleImprovement = await prismaClient.improvement.findFirst({
        where: {
          title: title?.trim(),
          ...(id && { id: { not: id } }),
        },
      });

      if (conflictTitleImprovement) {
        this.logger.error("Improvement title already exists");
        throw new HttpException(httpErrors.IMPROVEMENT_TITLE_ALREADY_EXIST, HttpStatus.BAD_REQUEST);
      }
    }
  }

  async createImprovement(userId: number, createImprovementDto: CreateImprovementDto) {
    const { tags, afterMetrics, beforeMetrics, relatedDocumentIds, stepIds } = createImprovementDto;

    await this.validateTitle(createImprovementDto.title);

    await this.validateCreateAndUpdate(relatedDocumentIds, stepIds);

    let improvement: Improvement;
    try {
      await prismaClient.$transaction(async (tx) => {
        try {
          improvement = await tx.improvement.create({
            data: {
              userId,
              title: createImprovementDto.title?.trim(),
              company: createImprovementDto.companyName?.trim(),
              department: createImprovementDto.department?.trim(),
              email: createImprovementDto.email?.trim(),
              fullName: createImprovementDto.fullName?.trim(),
              prepDays: createImprovementDto.prepDays,
              execDays: createImprovementDto.execDays,
              tips: createImprovementDto.tip?.trim(),
              caution: createImprovementDto.caution?.trim(),
              summary: createImprovementDto.summary?.trim(),
              categoriesId: createImprovementDto.category,
              isDraft: createImprovementDto.isDraft,
            },
          });
        } catch (error) {
          this.logger.error("Error occurred while creating improvement", error);
          throw handleThrowExceptionTransaction(httpErrors.AN_ERROR_OCCURRED_WHILE_CREATE_IMPROVEMENT);
        }

        if (relatedDocumentIds && relatedDocumentIds.length > 0) {
          try {
            const updateRelatedDocumentPromises = [];

            for (const element of relatedDocumentIds) {
              updateRelatedDocumentPromises.push(
                tx.relatedDocuments.update({
                  where: { id: element },
                  data: { improvementId: improvement.id },
                }),
              );
            }
            console.log("Related documents updated successfully", improvement);

            await Promise.all(updateRelatedDocumentPromises);
          } catch (error) {
            this.logger.error("Error occurred while updating related documents", error);
            throw handleThrowExceptionTransaction(httpErrors.AN_ERROR_OCCURRED_WHILE_UPDATE_RELATED_DOCUMENTS);
          }
        }

        if (afterMetrics && afterMetrics.length > 0) {
          try {
            const metricPromises = [];
            for (const metric of afterMetrics) {
              metricPromises.push(
                tx.metrics.create({
                  data: {
                    improvementId: improvement.id,
                    type: MetricsEnum.AFTER,
                    value: +metric.value,
                    label: metric.name?.trim(),
                  },
                }),
              );
            }

            await Promise.all(metricPromises);
          } catch (error) {
            this.logger.error("Error occurred while creating after metrics", error);
            throw handleThrowExceptionTransaction(httpErrors.AN_ERROR_OCCURRED_WHILE_CREATE_METRIC);
          }
        }

        if (beforeMetrics && beforeMetrics.length > 0) {
          try {
            const metricPromises = [];
            for (const metric of beforeMetrics) {
              metricPromises.push(
                tx.metrics.create({
                  data: {
                    improvementId: improvement.id,
                    type: MetricsEnum.BEFORE,
                    value: +metric.value,
                    label: metric.name?.trim(),
                  },
                }),
              );
            }

            await Promise.all(metricPromises);
          } catch (error) {
            this.logger.error("Error occurred while creating before metrics", error);
            throw handleThrowExceptionTransaction(httpErrors.AN_ERROR_OCCURRED_WHILE_CREATE_METRIC);
          }
        }

        if (stepIds && stepIds.length > 0) {
          try {
            const stepPromises = [];
            for (const stepId of stepIds) {
              stepPromises.push(
                tx.implementationSteps.update({
                  where: { id: stepId },
                  data: { improvementId: improvement.id },
                }),
              );
            }
            await Promise.all(stepPromises);
          } catch (error) {
            this.logger.error("Error occurred while creating implementation steps", error);
            throw handleThrowExceptionTransaction(httpErrors.AN_ERROR_OCCURRED_WHILE_CREATE_IMPLEMENTATION_STEPS);
          }
        }

        if (tags && tags.length > 0) {
          try {
            const tagIds: number[] = [];
            for (const tag of tags) {
              const foundTag = await tx.label.findFirst({ where: { title: tag } });
              if (foundTag) {
                tagIds.push(foundTag.id);
              } else {
                const createTag = await tx.label.create({
                  data: { title: tag },
                });
                tagIds.push(createTag.id);
              }
            }

            const labelPromises = [];
            for (const tagId of tagIds) {
              labelPromises.push(
                tx.labelAndImprovement.create({
                  data: { labelId: tagId, improvementId: improvement.id },
                }),
              );
            }

            await Promise.all(labelPromises);
          } catch (error) {
            this.logger.error("Error occurred while creating labels", error);
            throw handleThrowExceptionTransaction(httpErrors.AN_ERROR_OCCURRED_WHILE_CREATE_LABEL);
          }
        }
      });
    } catch (error) {
      this.logger.error("Error occurred while creating improvement in transaction", error);
      const _error = getExceptionTransaction(error.message);
      throw new HttpException(_error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return improvement;
  }

  async getImprovementList(queries: ListImprovementSearchDto, userId?: number) {
    const { page, size, title, orderBy, label } = queries;
    const [skip, take, _orderBy] = pagination(page, size, orderBy);

    const and: Prisma.ImprovementWhereInput[] = [];

    and.push({ NOT: { isDraft: true } });

    if (userId) {
      and.push({ userId });
    }

    if (title) {
      and.push({
        OR: [
          { title: { contains: title, mode: "insensitive" } },
          { summary: { contains: title, mode: "insensitive" } },
          { description: { contains: title, mode: "insensitive" } },
          { categories: { is: { name: { contains: title, mode: "insensitive" } } } },
        ],
      });
    }

    if (label?.length) {
      and.push({
        labels: {
          some: {
            label: { title: { in: label } },
          },
        },
      });
    }

    const where: Prisma.ImprovementWhereInput = and.length ? { AND: and } : {};

    const [improvements, count] = await Promise.all([
      prismaClient.improvement.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: _orderBy },
        include: { categories: true, relatedDocuments: true },
      }),
      prismaClient.improvement.count({ where }),
    ]);

    return {
      data: improvements,
      totalPage: Math.ceil(count / size),
    };
  }

  async getUserPosts(userId: number, queries: ListImprovementSearchDto) {
    const foundUser = await prismaClient.user.findUnique({ where: { id: userId } });
    if (!foundUser) throw new HttpException(httpErrors.USER_NOT_EXISTED, HttpStatus.NOT_FOUND);

    const result = await this.getImprovementList(queries, userId);

    return { ...result, user: foundUser };
  }

  async getLabelList() {
    const labels = await prismaClient.label.findMany({
      where: {
        improvements: {
          some: {
            improvement: {
              isDraft: { not: true },
            },
          },
        },
      },
      select: {
        title: true,
      },
    });
    return labels;
  }

  async getMyImprovement(queries: ListImprovementDto, userId: number) {
    const { page, size, type, title, isDraft, orderBy } = queries;
    const [skip, take] = pagination(page, size, orderBy);

    let orderByCondition;
    switch (queries.typeList) {
      case TypeListImprovement.Like:
        orderByCondition = [
          {
            likes: {
              _count: OrderBy.DESC,
            },
          },
          {
            createdAt: OrderBy.DESC,
          },
        ];
        break;
      case TypeListImprovement.View:
        orderByCondition = [
          {
            views: OrderBy.DESC,
          },
          {
            createdAt: OrderBy.DESC,
          },
        ];
        break;
      default:
        orderByCondition = { createdAt: OrderBy.DESC };
    }

    const improvements = await prismaClient.improvement.findMany({
      where: {
        userId: userId,
        ...(type && { type }),
        ...(title && { title: { contains: title, mode: Mode.INSENSITIVE } }),
        ...(isDraft === true ? { isDraft: true } : { OR: [{ isDraft: false }, { isDraft: null }] }),
      },
      include: {
        reviews: true,
        _count: {
          select: {
            likes: true,
          },
        },
        categories: true,
        relatedDocuments: true,
      },
      orderBy: orderByCondition,
      take,
      skip,
    });

    const count = await prismaClient.improvement.count({
      where: {
        userId: userId,
        ...(type && { type }),
        ...(title && { title: { contains: title, mode: Mode.INSENSITIVE } }),
        ...(isDraft === true ? { isDraft: true } : { OR: [{ isDraft: false }, { isDraft: null }] }),
      },
    });

    //measure average rating of improvement
    const result = improvements.map((improvement) => {
      const totalRate = improvement.reviews.reduce((acc, review) => acc + review.rate, 0);
      const averageRating =
        improvement.reviews.length > 0 ? Math.round((totalRate / improvement.reviews.length) * 2) / 2 : 0;

      // return improvement with averageRating, except reviews
      return {
        ...improvement,
        averageRating,
        reviews: undefined,
      };
    });

    return {
      data: result,
      totalPage: Math.ceil(count / size),
    };
  }

  async getImprovementDetail(id: number, userId?: number, isViewed?: boolean) {
    let improvement: Improvement & { favorites: Favorite[]; likes: Like[] };

    try {
      if (isViewed) {
        await prismaClient.improvement.update({ where: { id }, data: { views: { increment: 1 } } });
      }

      improvement = await prismaClient.improvement.findUnique({
        where: { id },
        include: {
          labels: {
            select: {
              label: true,
            },
          },
          categories: true,
          implementationSteps: true,
          metrics: true,
          relatedDocuments: true,
          ...(userId && {
            favorites: {
              where: { userId },
            },
            likes: {
              where: { userId },
            },
          }),
          _count: {
            select: {
              likes: true,
              reviews: true,
            },
          },
          user: true,
        },
      });
    } catch (error) {
      const _error = getExceptionTransaction(error.message);
      throw new HttpException(_error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!improvement) {
      throw new HttpException(httpErrors.IMPROVEMENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return {
      ...improvement,
      favorites: undefined,
      likes: undefined,
      ...(userId && { isFavorite: improvement.favorites?.length > 0 }),
      ...(userId && { isLike: improvement.likes?.length > 0 }),
    };
  }

  async updateImprovement(userId: number, id: number, createImprovementDto: CreateImprovementDto) {
    const { tags, afterMetrics, beforeMetrics, relatedDocumentIds, stepIds } = createImprovementDto;

    const improvement = await prismaClient.improvement.findUnique({
      where: { id },
    });

    if (!improvement) {
      throw new HttpException(httpErrors.IMPROVEMENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (improvement.userId !== userId) {
      throw new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN);
    }

    await this.validateTitle(createImprovementDto.title, id);

    await this.validateCreateAndUpdate(relatedDocumentIds, stepIds);

    try {
      await prismaClient.$transaction(async (tx) => {
        try {
          await tx.improvement.update({
            where: { id },
            data: {
              userId: userId,
              title: createImprovementDto.title?.trim(),
              company: createImprovementDto.companyName?.trim(),
              department: createImprovementDto.department?.trim(),
              email: createImprovementDto.email?.trim(),
              fullName: createImprovementDto.fullName?.trim(),
              prepDays: createImprovementDto.prepDays,
              execDays: createImprovementDto.execDays,
              tips: createImprovementDto.tip?.trim(),
              caution: createImprovementDto.caution?.trim(),
              summary: createImprovementDto.summary?.trim(),
              categoriesId: createImprovementDto.category,
              isDraft: createImprovementDto.isDraft,
            },
          });
        } catch (error) {
          throw handleThrowExceptionTransaction(httpErrors.AN_ERROR_OCCURRED_WHILE_UPDATING_DATA_IN_THE_DATABASE);
        }

        // Update related documents
        try {
          // Delete existing related documents
          await tx.relatedDocuments.deleteMany({
            where: { improvementId: improvement.id },
          });

          if (relatedDocumentIds && relatedDocumentIds.length > 0) {
            const updateRelatedDocumentPromises = [];

            for (const element of relatedDocumentIds) {
              updateRelatedDocumentPromises.push(
                tx.relatedDocuments.update({
                  where: { id: element },
                  data: { improvementId: improvement.id },
                }),
              );
            }

            await Promise.all(updateRelatedDocumentPromises);
          }
        } catch (error) {
          throw handleThrowExceptionTransaction(httpErrors.AN_ERROR_OCCURRED_WHILE_CREATE_RELATED_DOCUMENTS);
        }

        // Update after metrics
        if (afterMetrics && afterMetrics.length > 0) {
          try {
            // Delete existing after metrics
            await tx.metrics.deleteMany({
              where: {
                improvementId: improvement.id,
                type: MetricsEnum.AFTER,
              },
            });

            // Create new after metrics
            const metricPromises = [];
            for (const metric of afterMetrics) {
              metricPromises.push(
                tx.metrics.create({
                  data: {
                    improvementId: improvement.id,
                    type: MetricsEnum.AFTER,
                    value: +metric.value,
                    label: metric.name?.trim(),
                  },
                }),
              );
            }

            await Promise.all(metricPromises);
          } catch (error) {
            this.logger.error("Error occurred while creating after metrics", error);
            throw handleThrowExceptionTransaction(httpErrors.AN_ERROR_OCCURRED_WHILE_CREATE_METRIC);
          }
        }

        // Update before metrics
        if (beforeMetrics && beforeMetrics.length > 0) {
          try {
            // Delete existing before metrics
            await tx.metrics.deleteMany({
              where: {
                improvementId: improvement.id,
                type: MetricsEnum.BEFORE,
              },
            });

            // Create new before metrics
            const metricPromises = [];
            for (const metric of beforeMetrics) {
              metricPromises.push(
                tx.metrics.create({
                  data: {
                    improvementId: improvement.id,
                    type: MetricsEnum.BEFORE,
                    value: +metric.value,
                    label: metric.name?.trim(),
                  },
                }),
              );
            }

            await Promise.all(metricPromises);
          } catch (error) {
            throw handleThrowExceptionTransaction(httpErrors.AN_ERROR_OCCURRED_WHILE_CREATE_METRIC);
          }
        }

        try {
          await tx.implementationSteps.updateMany({
            where: { improvementId: improvement.id },
            data: { improvementId: null },
          });

          if (stepIds && stepIds.length > 0) {
            const stepPromises = [];
            for (const stepId of stepIds) {
              stepPromises.push(
                tx.implementationSteps.update({
                  where: {
                    id: stepId,
                  },
                  data: { improvementId: improvement.id },
                }),
              );
            }
            await Promise.all(stepPromises);
          }
        } catch (error) {
          this.logger.error("Error occurred while updating implementation steps", error);
          throw handleThrowExceptionTransaction(httpErrors.AN_ERROR_OCCURRED_WHILE_UPDATE_IMPLEMENTATION_STEPS);
        }

        // Update tags
        if (tags && tags.length > 0) {
          try {
            const tagIds: number[] = [];
            for (const tag of tags) {
              const foundTag = await tx.label.findFirst({ where: { title: tag } });
              if (foundTag) {
                tagIds.push(foundTag.id);
              } else {
                const createTag = await tx.label.create({
                  data: { title: tag },
                });
                tagIds.push(createTag.id);
              }
            }

            // Delete unused labels for this improvement
            await tx.labelAndImprovement.deleteMany({
              where: {
                improvementId: improvement.id,
                labelId: {
                  notIn: tagIds,
                },
              },
            });

            // Create new label associations
            const labelPromises = [];
            for (const tagId of tagIds) {
              // Check if label is already associated with improvement
              const existingLabelAndImprovement = await tx.labelAndImprovement.findFirst({
                where: {
                  labelId: tagId,
                  improvementId: improvement.id,
                },
              });

              // Create if not existed
              if (!existingLabelAndImprovement) {
                labelPromises.push(
                  tx.labelAndImprovement.create({
                    data: { labelId: tagId, improvementId: improvement.id },
                  }),
                );
              }
            }

            await Promise.all(labelPromises);
          } catch (error) {
            throw handleThrowExceptionTransaction(httpErrors.AN_ERROR_OCCURRED_WHILE_CREATE_LABEL);
          }
        }
      });
    } catch (error) {
      const _error = getExceptionTransaction(error.message);
      throw new HttpException(_error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return this.getImprovementDetail(improvement.id);
  }

  async getFavoriteImprovements(userId: number, queries: ListImprovementDto) {
    const { page, size, orderBy } = queries;
    const [skip, take] = pagination(page, size, orderBy);

    let orderByCondition;
    switch (queries.typeList) {
      case TypeListImprovement.Like:
        orderByCondition = [
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
        ];
        break;
      case TypeListImprovement.View:
        orderByCondition = [
          {
            improvement: {
              views: OrderBy.DESC,
            },
          },
          {
            improvement: {
              createdAt: OrderBy.DESC,
            },
          },
        ];
        break;
      default:
        orderByCondition = { improvement: { createdAt: OrderBy.DESC } };
    }

    const favoriteImprovements = await prismaClient.favorite.findMany({
      where: {
        userId,
      },
      include: {
        improvement: {
          include: {
            _count: {
              select: {
                likes: true,
              },
            },
            categories: true,
          },
        },
      },
      orderBy: orderByCondition,
      take,
      skip,
    });

    const improvements = favoriteImprovements
      .map((favorite) => favorite.improvement)
      .filter((improvement): improvement is NonNullable<typeof improvement> => improvement !== null);

    const count = await prismaClient.favorite.count({
      where: {
        userId,
      },
    });

    return {
      data: improvements,
      totalPage: Math.ceil(count / size),
    };
  }

  async updateUserInfo(userId: number, updateUserInfoDto: UpdateUserInfoDto) {
    //just update company, department, except email
    const user = await prismaClient.user.update({
      where: {
        id: userId,
      },
      data: {
        full_name: updateUserInfoDto.fullName.trim(),
      },
    });
    return user;
  }

  /*
    get improvements created in the last 7 days, sort by likes DESC, and just include likes count
  */
  async getImprovementsByWeek(queries: ListImprovementDto) {
    const { page, size } = queries;
    const [skip, take, _orderBy] = pagination(page, size, OrderBy.DESC);
    //const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const improvements = await prismaClient.improvement.findMany({
      where: {
        //createdAt: { gte: oneWeekAgo },
        OR: [{ isDraft: null }, { isDraft: false }],
      },
      //include likes count
      include: {
        _count: {
          select: {
            // likes: true,
            favorites: true,
          },
        },
        categories: true,
        relatedDocuments: true,
      },
      orderBy: [
        {
          // likes: {
          //   _count: _orderBy,
          // },
          favorites: {
            _count: _orderBy,
          },
        },
        {
          createdAt: _orderBy,
        },
      ],
      take,
      skip,
    });

    const count = await prismaClient.improvement.count({
      where: {
        //createdAt: { gte: oneWeekAgo },
        OR: [{ isDraft: null }, { isDraft: false }],
      },
    });
    return {
      data: improvements,
      totalPage: Math.ceil(count / size),
    };
  }

  private getThisWeekRange() {
    const tzOffsetMs = 7 * 60 * 60 * 1000;
    const now = new Date();
    const localNowMs = now.getTime() + tzOffsetMs;
    const localNow = new Date(localNowMs);

    const localDay = localNow.getDay();
    const daysFromMon = (localDay + 6) % 7;

    const startOfDayMs =
      localNowMs -
      (localNow.getHours() * 3600000 +
        localNow.getMinutes() * 60000 +
        localNow.getSeconds() * 1000 +
        localNow.getMilliseconds());

    const weekStartLocalMs = startOfDayMs - daysFromMon * 86400000;
    const weekEndLocalMs = weekStartLocalMs + 7 * 86400000 - 1;

    const weekStart = new Date(weekStartLocalMs - tzOffsetMs);
    const weekEnd = new Date(weekEndLocalMs - tzOffsetMs);
    return { weekStart, weekEnd };
  }

  async getLargestLikedImprovementsByWeek(size: number) {
    const { weekStart, weekEnd } = this.getThisWeekRange();

    const grouped = await prismaClient.favorite.groupBy({
      by: ["improvementId"],
      _count: { improvementId: true },
      where: {
        improvement: {
          isDraft: { not: true },
        },
        createdAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      orderBy: {
        _count: {
          improvementId: "desc",
        },
      },
      take: size,
    });

    const ids = grouped.map((g) => g.improvementId);
    if (ids.length === 0) return [];

    const rank = new Map(ids.map((id, i) => [id, i]));
    const weeklyMap = new Map(grouped.map((g) => [g.improvementId, Number(g._count.improvementId)]));

    const items = await prismaClient.improvement.findMany({
      where: { id: { in: ids } },
      include: {
        user: true,
        categories: true,
        relatedDocuments: true,
        _count: { select: { likes: true } },
      },
    });

    return items
      .map((i) => ({ ...i, weeklyLikes: weeklyMap.get(i.id) ?? 0 }))
      .sort((a, b) => {
        const rankA = rank.get(a.id) ?? 0;
        const rankB = rank.get(b.id) ?? 0;
        return rankA - rankB;
      });
  }

  async toggleFavoriteImprovement(userId: number, improvementId: number) {
    const improvement = await prismaClient.improvement.findUnique({ where: { id: improvementId } });

    if (!improvement) {
      throw new HttpException(httpErrors.IMPROVEMENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    try {
      const existingFavorite = await prismaClient.favorite.findFirst({
        where: { userId, improvementId },
      });
      let type: TypeAction;
      if (existingFavorite) {
        await prismaClient.favorite.delete({ where: { improvementId_userId: { improvementId, userId } } });
        type = TypeAction.UN_FAVORITE;
      } else {
        await prismaClient.favorite.create({ data: { userId, improvementId } });
        type = TypeAction.FAVORITE;
      }
      return { type };
    } catch (error) {
      const _error = getExceptionTransaction(error.message);
      throw new HttpException(_error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async toggleLikeImprovement(userId: number, improvementId: number) {
    const improvement = await prismaClient.improvement.findUnique({ where: { id: improvementId } });

    if (!improvement) {
      throw new HttpException(httpErrors.IMPROVEMENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    try {
      const existingLike = await prismaClient.like.findFirst({
        where: { improvementId, userId },
      });

      let type: TypeAction;

      if (existingLike) {
        await prismaClient.like.delete({
          where: { improvementId_userId: { improvementId, userId } },
        });
        type = TypeAction.UN_LIKE;
      } else {
        await prismaClient.like.create({ data: { userId, improvementId } });
        type = TypeAction.LIKE;
      }

      return { type };
    } catch (error) {
      const _error = getExceptionTransaction(error.message);
      throw new HttpException(_error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createReview(userId: number, createReviewDto: CreateReviewDto) {
    const improvement = await prismaClient.improvement.findUnique({ where: { id: createReviewDto.improvementId } });
    if (!improvement) {
      throw new HttpException(httpErrors.IMPROVEMENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    try {
      return await prismaClient.$transaction(async (tx) => {
        return await tx.review.create({
          data: {
            ...createReviewDto,
            userId,
          },
        });
      });
    } catch (error) {
      const _error = getExceptionTransaction(error.message);
      throw new HttpException(_error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getReviewListOfImprovement(improvementId: number, queries: ListReviewDto) {
    const { page, size, orderBy } = queries;
    const [skip, take, _orderBy] = pagination(page, size, orderBy);

    const improvement = await prismaClient.improvement.findUnique({
      where: { id: improvementId },
      include: { relatedDocuments: true },
    });
    if (!improvement) {
      throw new HttpException(httpErrors.IMPROVEMENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const reviews = await prismaClient.review.findMany({
      where: {
        improvementId,
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: _orderBy,
      },
      take,
      skip,
    });

    const count = await prismaClient.review.count({
      where: {
        improvementId,
      },
    });

    return {
      data: {
        reviews: reviews.map((review) => ({
          ...review,
          user: undefined,
          author: review.user.name,
        })),
        improvement,
      },
      totalPage: Math.ceil(count / size),
      count: count,
    };
  }

  @Cron("0 0 0 * * *")
  async cleanup() {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);

      const promises = [];

      const relatedDocuments = await prismaClient.relatedDocuments.findMany({
        where: {
          improvementId: null,
          createdAt: { lt: startOfYesterday },
        },
      });

      const implementationSteps = await prismaClient.implementationSteps.findMany({
        where: {
          improvementId: null,
          createdAt: { lt: startOfYesterday },
        },
      });

      for (const element of relatedDocuments) {
        promises.push(this.awsS3Service.deleteFile(element.url));
      }

      for (const element of implementationSteps) {
        promises.push(this.awsS3Service.deleteFile(element.url));
      }

      await Promise.allSettled([
        ...promises,
        prismaClient.relatedDocuments.deleteMany({
          where: {
            id: {
              in: relatedDocuments.map((doc) => doc.id),
            },
            createdAt: { lt: startOfYesterday },
          },
        }),
        prismaClient.implementationSteps.deleteMany({
          where: {
            id: {
              in: implementationSteps.map((step) => step.id),
            },
            createdAt: { lt: startOfYesterday },
          },
        }),
      ]);
    } catch (error) {
      this.logger.error("Error occurred during cleanup", error);
    }
  }
}
