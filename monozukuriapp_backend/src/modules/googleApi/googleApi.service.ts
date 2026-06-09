import { HttpService } from "@nestjs/axios";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { GoogleAuth } from "google-auth-library";
import { firstValueFrom } from "rxjs";
import { tokenCache } from "src/configs/nodeCache.config";
import { httpErrors } from "src/exceptions/index.exceptions";

@Injectable()
export class GoogleApiService {
  constructor(private readonly httpService: HttpService) {}

  public async getOpenAPIAccessToken() {
    const cachedToken = tokenCache.get("access_token") as string;
    if (cachedToken) {
      return cachedToken;
    }

    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      },
      scopes: "https://www.googleapis.com/auth/cloud-platform",
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    tokenCache.set("access_token", accessToken.token, 3600);

    return accessToken.token;
  }

  public async getFishboneAssistantResponse(
    queryId: string,
    userId: number,
    diagrams: string,
    problem: string,
    language?: string,
  ) {
    const accessToken = await this.getOpenAPIAccessToken();

    try {
      const apiUrl = `${process.env.FISHBONE_ASSISTANT_API_URL}${process.env.FISHBONE_ASSISTANT_API_PATH}`;
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };
      const data = {
        input: {
          input: {
            diagrams: diagrams,
            problem: problem,
            user_id: userId,
            query_id: queryId,
            lang: language || "Japanese",
          },
        },
      };

      const response = await firstValueFrom(this.httpService.post(apiUrl, data, { headers }));

      if (response.data && response.data.output && response.data.output.diagram) {
        try {
          const diagram = JSON.parse(response.data.output.diagram);
          if (Array.isArray(diagram)) {
            const diagramWithIds = this.addIdsToFishboneNodes(diagram);
            response.data.output.diagram = JSON.stringify(diagramWithIds);
          }
        } catch (error) {
          console.error("Error parsing fishbone diagram:", error);
        }
      }

      return response.data;
    } catch (error) {
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_EXECUTING_GOOGLE_API,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async countTokensGeminiAPIFromText(text: string) {
    const accessToken = await this.getOpenAPIAccessToken();

    const location = "us-central1";
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const modelId = "gemini-2.5-pro";
    const apiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:countTokens`;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const data = {
      contents: [
        {
          parts: [
            {
              text: text,
            },
          ],
        },
      ],
    };

    try {
      const response = await firstValueFrom(this.httpService.post(apiUrl, data, { headers }));
      return response.data.totalTokens;
    } catch (error) {
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_EXECUTING_GOOGLE_API,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private generateRandomId(): number {
    return Math.floor(Math.random() * 1000000000) + 1;
  }

  private addIdsToFishboneNodes(nodes: any[]): any[] {
    return nodes.map((node) => ({
      id: this.generateRandomId(),
      ...node,
      children: node.children ? this.addIdsToFishboneNodes(node.children) : [],
    }));
  }
}
