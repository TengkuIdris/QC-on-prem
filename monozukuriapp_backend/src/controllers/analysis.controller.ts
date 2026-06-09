import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  HttpException,
  Query,
  Delete,
  Options,
} from "@nestjs/common";
import { Subscription } from "rxjs";
import { Response, Request } from "express";
import { AnalysisService } from "../services/analysis.service";
import { ExportExcelService } from "../services/export-excel.service";
import { ProblemInput, CreateAnalysisResponse } from "../types/analysis.types";
import { createApiResponse } from "../utils/api-response.util";
import { setSseCorsHeaders } from "../utils/cors.util";
import { CognitoGuard } from "../modules/auth/jwt-auth.guard";
import { User } from "../decorators/user.decorator";
import { User as UserPrisma } from "@prisma/client";
import { Public } from "../decorators/public.decorator";

@Controller("threads")
@UseGuards(CognitoGuard)
export class AnalysisController {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly exportExcelService: ExportExcelService,
  ) { }

  @Get()
  async getThreads(@User() user: UserPrisma, @Query("page") page?: string, @Query("size") size?: string): Promise<any> {
    try {
      const userId = user.id;
      const pageNum = page ? parseInt(page) : 1;
      const pageSize = size ? parseInt(size) : 10;

      const result = await this.analysisService.getUserThreads(userId, pageNum, pageSize);

      return result;
    } catch (error) {
      throw new HttpException({ error: error.message }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post()
  async createThread(
    @Body() requestBody: { problem: ProblemInput; parent_id?: string },
    @User() user: UserPrisma,
  ): Promise<{ thread_id: string; created_at: string }> {
    try {
      const userId = user.id;
      const result = await this.analysisService.createAnalysisSession(
        requestBody.problem,
        userId,
        requestBody.parent_id,
      );

      return {
        thread_id: result.thread_id,
        created_at: result.created_at,
      };
    } catch (error) {
      throw new HttpException({ error: error.message }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(":threadId/note")
  async getThreadNote(@Param("threadId") threadId: string, @User() user: UserPrisma): Promise<any> {
    try {
      const userId = user.id;
      const result = await this.analysisService.getThreadNote(threadId, userId);

      return result;
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ error: error.message }, status);
    }
  }

  @Put(":threadId/note")
  async updateThreadNote(
    @Param("threadId") threadId: string,
    @Body() requestBody: { note: string },
    @User() user: UserPrisma,
  ): Promise<any> {
    try {
      const userId = user.id;
      const result = await this.analysisService.updateThreadNote(threadId, requestBody.note, userId);

      return result;
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ error: error.message }, status);
    }
  }

  @Patch(":threadId/first-answer")
  async updateFirstAnswer(
    @Param("threadId") threadId: string,
    @Body() requestBody: { first_answer: string | null },
    @User() user: UserPrisma,
  ): Promise<any> {
    try {
      const userId = user.id;
      const result = await this.analysisService.updateFirstAnswer(threadId, requestBody.first_answer ?? null, userId);
      return result;
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ error: error.message }, status);
    }
  }

  @Get(":parentId/children")
  async getChildThreads(@Param("parentId") parentId: string, @User() user: UserPrisma): Promise<any> {
    try {
      const userId = user.id;
      const result = await this.analysisService.getChildThreads(parentId, userId);

      return result;
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ error: error.message }, status);
    }
  }

  @Get("internal-cases")
  async getInternalCases(
    @User() user: UserPrisma,
    @Query("page") page?: string,
    @Query("size") size?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ): Promise<any> {
    try {
      const userId = user.id;
      const pageNum = page ? parseInt(page) : 1;
      const pageSize = size ? parseInt(size) : 10;

      const result = await this.analysisService.getInternalCases(userId, pageNum, pageSize, search, status);

      return result;
    } catch (error) {
      throw new HttpException({ error: error.message }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(":threadId")
  async getThread(@Param("threadId") threadId: string, @User() user: UserPrisma): Promise<any> {
    try {
      const userId = user.id;

      // Gọi AI service để lấy thread data
      const aiServiceResponse = await this.analysisService.getThreadFromAIService(threadId, userId);

      return aiServiceResponse;
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ error: error.message }, status);
    }
  }

  @Post(":threadId/stream")
  async streamAnalysis(
    @Param("threadId") threadId: string,
    @Body() requestBody: { user_message?: string; is_retry?: boolean },
    @User() user: UserPrisma,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const userId = user?.id;
      if (!userId) {
        res.status(HttpStatus.UNAUTHORIZED).json({ message: "User not authenticated" });
        return;
      }

      setSseCorsHeaders(res);

      res.header("Content-Type", "text/event-stream");
      res.header("Cache-Control", "no-cache");
      res.header("X-Accel-Buffering", "no");
      res.header("Content-Encoding", "identity");

      res.status(HttpStatus.OK);

      if (typeof (res as any).flushHeaders === "function") {
        (res as any).flushHeaders();
      } else {
        res.writeHead(HttpStatus.OK);
      }

      res.write(": connected\n\n");

      // Flush initial connection message
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }

      const keepAliveIntervalMs = 15000;

      let stream$;
      try {
        stream$ = this.analysisService.createSSEStream(threadId, userId, requestBody);
      } catch (error: any) {
        console.error(`Failed to create SSE stream:`, error);
        if (!res.writableEnded && !res.headersSent) {
          try {
            setSseCorsHeaders(res);
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify({ message: error?.message || "Failed to create stream", session_id: threadId })}\n\n`);
            if (typeof (res as any).flush === "function") {
              (res as any).flush();
            }
            res.end();
          } catch (endError) {
            console.error(`Failed to send error response:`, endError);
          }
        }
        return;
      }

      let closed = false;
      let subscription: Subscription | undefined;
      let latestPayload: any = null;
      const keepAliveTimer = setInterval(() => {
        if (!closed && !res.writableEnded) {
          res.write(`: keepalive ${Date.now()}\n\n`);
        }
      }, keepAliveIntervalMs);

      const cleanup = (reason: "complete" | "error" | "close") => {
        if (closed) {
          return;
        }
        closed = true;

        if (keepAliveTimer) {
          clearInterval(keepAliveTimer);
        }

        if (subscription) {
          subscription.unsubscribe();
        }

        if (!res.writableEnded) {
          const connectionEndPayload: any = {
            session_id: threadId,
            reason,
            last_event_type: latestPayload?.type ?? null,
            status: latestPayload?.data?.state?.status ?? latestPayload?.data?.status ?? null,
            timestamp: new Date().toISOString(),
            message:
              reason === "complete"
                ? "stream completed"
                : reason === "error"
                  ? "stream terminated"
                  : "stream closed",
          };

          if (latestPayload?.data?.state) {
            connectionEndPayload.state = latestPayload.data.state;
          }

          if (reason === "complete") {
            res.write('event: end\ndata: {"message":"stream completed"}\n\n');
          }

          res.write(`event: connection_end\n`);
          res.write(`data: ${JSON.stringify(connectionEndPayload)}\n\n`);

          res.end();
        }
      };

      subscription = stream$.subscribe({
        next: (message) => {
          try {
            if (closed || res.writableEnded) {
              return;
            }

            const payload = {
              ...message,
              session_id: message.session_id ?? threadId,
            };

            latestPayload = payload;

            if (payload.id) {
              res.write(`id: ${payload.id}\n`);
            }

            if (payload.type) {
              res.write(`event: ${payload.type}\n`);
            }

            res.write(`data: ${JSON.stringify(payload)}\n\n`);

            // Flush data immediately to ensure it's sent
            if (typeof (res as any).flush === "function") {
              (res as any).flush();
            }
          } catch (error: any) {
            console.error(`Error in stream next handler:`, error);
            if (!closed && !res.writableEnded) {
              try {
                const errorPayload = JSON.stringify({
                  message: error?.message || "Error writing to stream",
                  session_id: threadId,
                });
                res.write(`event: error\n`);
                res.write(`data: ${errorPayload}\n\n`);
                if (typeof (res as any).flush === "function") {
                  (res as any).flush();
                }
              } catch (writeError) {
                console.error(`Failed to write error to stream:`, writeError);
              }
            }
            cleanup("error");
          }
        },
        error: (error: Error) => {
          console.error(`Stream observable error:`, error);
          if (!closed && !res.writableEnded) {
            try {
              const payload = JSON.stringify({
                message: error.message ?? "Stream error",
                session_id: threadId,
              });
              res.write(`event: error\n`);
              res.write(`data: ${payload}\n\n`);
              if (typeof (res as any).flush === "function") {
                (res as any).flush();
              }
            } catch (writeError) {
              console.error(`Failed to write error to stream:`, writeError);
            }
          }
          cleanup("error");
        },
        complete: () => {
          console.log(`Stream observable completed for thread: ${threadId}`);
          cleanup("complete");
        },
      });

      const handleDisconnect = () => cleanup("close");

      req.on("close", handleDisconnect);
      res.on("close", handleDisconnect);
    } catch (error: any) {
      if (!res.writableEnded && !res.headersSent) {
        try {
          setSseCorsHeaders(res);
          res.status(HttpStatus.INTERNAL_SERVER_ERROR);
          res.header("Content-Type", "text/event-stream");
          res.write(`event: error\n`);
          res.write(`data: ${JSON.stringify({ message: error?.message || "Internal server error", session_id: threadId })}\n\n`);
          res.end();
        } catch (endError) {
          // Response already ended or headers already sent
        }
      } else if (!res.writableEnded) {
        // Headers already sent, just write error event
        try {
          res.write(`event: error\n`);
          res.write(`data: ${JSON.stringify({ message: error?.message || "Internal server error", session_id: threadId })}\n\n`);
          res.end();
        } catch (endError) {
          // Response already ended
        }
      }
    }
  }

  @Options(":threadId/stream")
  @Public()
  handleStreamOptions(@Res() res: Response) {
    setSseCorsHeaders(res);
    res.status(204).send();
  }

  @Delete(":threadId")
  async deleteThread(@Param("threadId") threadId: string, @User() user: UserPrisma): Promise<any> {
    return await this.analysisService.deleteAnalysisSession(threadId, user.id);
  }

  @Post("export-excel")
  async exportToExcel(@Body() body: { nodes: any[]; fileName?: string }, @Res() res: Response) {
    try {
      const { nodes, fileName } = body;
      const buffer = await this.exportExcelService.exportWhyWhyToExcel(nodes, fileName);

      // Generate filename if not provided: なぜなぜ分析_YYYYMMDD_HHMMSS.xlsx
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const defaultFileName = `なぜなぜ分析_${year}${month}${day}_${hours}${minutes}${seconds}.xlsx`;
      const finalFileName = fileName || defaultFileName;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalFileName)}"`);
      res.send(buffer);
    } catch (error) {
      throw new HttpException(
        { error: error.message || "Failed to export Excel" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(":threadId/visibility")
  async updateVisibilitySettings(
    @Param("threadId") threadId: string,
    @Body() requestBody: { public_scope: "private" | "group" | "company"; hide_author_name: boolean },
    @User() user: UserPrisma,
  ): Promise<any> {
    try {
      const userId = user.id;
      const result = await this.analysisService.updateVisibilitySettings(
        threadId,
        userId,
        requestBody.public_scope,
        requestBody.hide_author_name,
      );

      return { data: result };
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ error: error.message }, status);
    }
  }
}
