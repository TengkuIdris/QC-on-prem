"""
ロギングとOpenTelemetryの設定モジュール
"""
import logging
import os
import sys
import uuid
from contextvars import ContextVar
from typing import Any, Dict, Optional

import structlog
from opentelemetry import trace
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.cloud_monitoring import CloudMonitoringMetricsExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased, ParentBased
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.trace import StatusCode
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from why_why_chat_ai.api.config import settings

# コンテキスト変数
request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
trace_id_var: ContextVar[Optional[str]] = ContextVar("trace_id", default=None)
span_id_var: ContextVar[Optional[str]] = ContextVar("span_id", default=None)


def add_google_cloud_logging_fields(_, __, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Google Cloud Loggingとの統合のためのフィールドを追加
    """
    trace_id = trace_id_var.get()
    span_id = span_id_var.get()

    if trace_id:
        # Google Cloud Trace形式でtraceフィールドを追加
        event_dict["logging.googleapis.com/trace"] = f"projects/{settings.gcp_project_id}/traces/{trace_id}"
        event_dict["trace_id"] = trace_id

    if span_id:
        event_dict["logging.googleapis.com/spanId"] = span_id
        event_dict["span_id"] = span_id
        event_dict["logging.googleapis.com/trace_sampled"] = True

    # Cloud Error Reporting用のserviceContext
    if event_dict.get("level", "").upper() in ["ERROR", "CRITICAL"]:
        event_dict["serviceContext"] = {
            "service": settings.api_title,
            "version": settings.api_version,
        }

    return event_dict


def setup_logging() -> None:
    """
    構造化ロギングの設定
    """
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.contextvars.merge_contextvars,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        add_google_cloud_logging_fields,
    ]

    # 環境に応じたレンダラーを選択
    if settings.is_development:
        # 開発環境では見やすいコンソール出力
        processors.append(structlog.dev.ConsoleRenderer())
    else:
        # 本番環境ではJSON出力
        processors.append(structlog.processors.JSONRenderer())

    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # 標準ロギングの設定
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.DEBUG if settings.is_development else logging.INFO,
    )


def setup_opentelemetry() -> None:
    """
    OpenTelemetryの設定
    """
    # OTEL_SDK_DISABLEDがtrueの場合はスキップ
    if os.getenv("OTEL_SDK_DISABLED", "").lower() == "true":
        logging.info("OpenTelemetry is disabled by OTEL_SDK_DISABLED environment variable")
        return

    # リソース定義
    resource = Resource(attributes={
        "service.name": settings.api_title,
        "service.version": settings.api_version,
        "deployment.environment": settings.environment,
        "cloud.provider": "gcp",
        "cloud.platform": "cloud_run",
    })

    # サンプリング設定
    sampler = ParentBased(
        root=TraceIdRatioBased(settings.otel_trace_sampling_rate)
    )

    # TracerProviderの設定
    tracer_provider = TracerProvider(
        resource=resource,
        sampler=sampler
    )

    # Google Cloud Traceエクスポーター
    if settings.gcp_project_id:
        cloud_trace_exporter = CloudTraceSpanExporter(
            project_id=settings.gcp_project_id
        )
        tracer_provider.add_span_processor(
            BatchSpanProcessor(cloud_trace_exporter)
        )

    # OTLP HTTPエクスポーター（オプション）
    if settings.otlp_endpoint:
        otlp_exporter = OTLPSpanExporter(
            endpoint=settings.otlp_endpoint,
            headers={"Authorization": f"Bearer {settings.otlp_auth_token}"}
            if settings.otlp_auth_token else None
        )
        tracer_provider.add_span_processor(
            BatchSpanProcessor(otlp_exporter)
        )

    trace.set_tracer_provider(tracer_provider)

    # MeterProviderの設定
    if settings.gcp_project_id:
        cloud_monitoring_exporter = CloudMonitoringMetricsExporter(
            project_id=settings.gcp_project_id
        )

        metric_reader = PeriodicExportingMetricReader(
            exporter=cloud_monitoring_exporter,
            export_interval_millis=60000,  # 60秒
        )

        meter_provider = MeterProvider(
            resource=resource,
            metric_readers=[metric_reader],
            views=[],
        )

        # グローバルMeterProviderとして設定
        from opentelemetry import metrics
        metrics.set_meter_provider(meter_provider)


def request_hook(span, scope):
    """
    FastAPIのリクエストフック。スパンにカスタム属性を追加する。
    """
    if span and span.is_recording():
        # リクエストヘッダーから有用な情報を抽出
        headers = dict(scope.get("headers", []))

        # User-Agentを追加
        user_agent = headers.get(b"user-agent", b"").decode("utf-8", errors="ignore")
        if user_agent:
            span.set_attribute("http.user_agent", user_agent)

        # X-Request-IDを追加
        request_id = headers.get(b"x-request-id", b"").decode("utf-8", errors="ignore")
        if request_id:
            span.set_attribute("http.request_id", request_id)

        # カスタムヘッダーの例（必要に応じて追加）
        # x_forwarded_for = headers.get(b"x-forwarded-for", b"").decode("utf-8", errors="ignore")
        # if x_forwarded_for:
        #     span.set_attribute("http.client_ip", x_forwarded_for)


def response_hook(span, scope, message):
    """
    FastAPIのレスポンスフック。レスポンス情報をスパンに追加する。
    """
    if span and span.is_recording():
        # レスポンスのステータスコード情報は既に自動的に記録されているが、
        # 必要に応じて追加の情報を記録できる
        pass


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    リクエストIDとOpenTelemetryトレース情報を付与するミドルウェア
    """

    async def dispatch(self, request: Request, call_next):
        # リクエストIDの生成または取得
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        request_id_var.set(request_id)

        # OpenTelemetryのトレース情報を取得
        span = trace.get_current_span()
        if span.is_recording():
            trace_context = span.get_span_context()
            trace_id = format(trace_context.trace_id, '032x')
            span_id = format(trace_context.span_id, '016x')

            trace_id_var.set(trace_id)
            span_id_var.set(span_id)

            # スパンに属性を追加
            span.set_attribute("request.id", request_id)
            span.set_attribute("http.method", request.method)
            span.set_attribute("http.target", str(request.url.path))
            span.set_attribute("http.user_agent", request.headers.get("user-agent", ""))

        logger = structlog.get_logger()

        # リクエスト開始ログ
        logger.info(
            "Request started",
            request_id=request_id,
            method=request.method,
            path=str(request.url.path),
            user_agent=request.headers.get("user-agent"),
            client_host=request.client.host if request.client else None,
        )

        try:
            response: Response = await call_next(request)
            response.headers["X-Request-ID"] = request_id

            # レスポンス完了ログ
            logger.info(
                "Request completed",
                request_id=request_id,
                status_code=response.status_code,
            )

            # OpenTelemetryスパンのステータス設定
            if span.is_recording():
                span.set_attribute("http.status_code", response.status_code)
                if response.status_code >= 400:
                    span.set_status(StatusCode.ERROR)
                else:
                    span.set_status(StatusCode.OK)

            return response

        except Exception as exc:
            # エラーログ
            logger.error(
                "Request failed",
                request_id=request_id,
                error=str(exc),
                exc_info=True,
            )

            # OpenTelemetryスパンにエラー情報を記録
            if span.is_recording():
                span.record_exception(exc)
                span.set_status(StatusCode.ERROR, str(exc))

            raise
        finally:
            # コンテキスト変数をクリア
            request_id_var.set(None)
            trace_id_var.set(None)
            span_id_var.set(None)


def generate_uvicorn_log_config() -> Dict[str, Any]:
    """
    Uvicorn用のログ設定を生成
    """
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": "structlog.stdlib.ProcessorFormatter",
                "processor": structlog.dev.ConsoleRenderer() if settings.is_development else structlog.processors.JSONRenderer(),
                "foreign_pre_chain": [
                    structlog.contextvars.merge_contextvars,
                    structlog.processors.TimeStamper(fmt="iso"),
                    structlog.stdlib.add_logger_name,
                    structlog.stdlib.add_log_level,
                    add_google_cloud_logging_fields,
                ],
            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
        },
        "loggers": {
            "uvicorn": {
                "handlers": ["default"],
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn.error": {
                "handlers": ["default"],
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn.access": {
                "handlers": ["default"],
                "level": "INFO",
                "propagate": False,
            },
        },
    }
