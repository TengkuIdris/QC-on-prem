"""
POCアプリケーション用のユーティリティ関数
"""
from opentelemetry.trace import get_tracer_provider, set_tracer_provider
from opentelemetry.sdk.trace import TracerProvider, SpanProcessor, SynchronousMultiSpanProcessor
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from openinference.instrumentation.langchain import LangChainInstrumentor
import google.auth
from google.cloud.trace_v2 import TraceServiceClient
from google.cloud.aiplatform import initializer
from vertexai.reasoning_engines import _utils
from vertexai.preview.reasoning_engines.templates.langchain import _override_active_span_processor


def setup_trace():
    """Google Cloud Trace にトレースを送信するための設定"""
    _project = initializer.global_config.project
    _location = initializer.global_config.location 
    credentials, _ = google.auth.default()
    span_exporter = CloudTraceSpanExporter(
        project_id=_project,
        client=TraceServiceClient(credentials=credentials.with_quota_project(_project)),
    )
    span_processor: SpanProcessor = SimpleSpanProcessor(span_exporter=span_exporter)
    tracer_provider: TracerProvider = get_tracer_provider()
    # Get the appropriate tracer provider
    if _utils.is_noop_or_proxy_tracer_provider(tracer_provider):
        tracer_provider = TracerProvider()
        set_tracer_provider(tracer_provider)
    # Avoids OpenTelemetry client already exists error.
    _override_active_span_processor(tracer_provider, SynchronousMultiSpanProcessor())
    tracer_provider.add_span_processor(span_processor)
    # Keep the instrumentation up-to-date.
    instrumentor = LangChainInstrumentor()
    if instrumentor.is_instrumented_by_opentelemetry:
        instrumentor.uninstrument()
    instrumentor.instrument()