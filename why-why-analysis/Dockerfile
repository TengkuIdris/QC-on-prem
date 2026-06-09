FROM python:3.12-slim

WORKDIR /app

# システム依存パッケージのインストール
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libc-dev libpq-dev git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
# uvをインストール
RUN pip install --no-cache-dir uv

# 依存パッケージのインストール
COPY pyproject.toml .
COPY uv.lock .
# `--frozen` を外したのは、on-prem 対応で pyproject.toml に langchain-openai を
# 追加したため uv.lock がズレている可能性があるため。再現性を優先するなら
# ホスト側で `uv lock` を再生成してから --frozen を戻してください。
RUN uv sync

# 仮想環境のPythonとパッケージを使用するようPATHを設定
ENV PATH="/app/.venv/bin:$PATH"

# アプリケーションのコードをコピー
COPY . .

# 不要なビルドツールを削除（libpq-devは残す）
RUN apt-get purge -y --auto-remove gcc libc-dev

# ポートの公開
EXPOSE 8080

# アプリケーションの実行
CMD ["python", "-m", "why_why_chat_ai.api"]
