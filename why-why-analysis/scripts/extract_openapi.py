#!/usr/bin/env python3
"""
FastAPI アプリケーションから OpenAPI 仕様を抽出するスクリプト
"""
import json
import sys
from pathlib import Path
from why_why_chat_ai.api.app import create_app

# プロジェクトのルートディレクトリをPYTHONPATHに追加
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def main():
    """OpenAPI仕様を抽出してファイルに保存"""
    # FastAPIアプリケーションを作成
    app = create_app()

    # OpenAPI仕様を取得
    openapi_schema = app.openapi()

    # ファイルに保存
    output_path = project_root / "openapi_v3.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2, ensure_ascii=False)

    print(f"OpenAPI 3.0 仕様を {output_path} に保存しました")

    # 基本情報を表示
    print("\nAPI情報:")
    print(f"  タイトル: {openapi_schema['info']['title']}")
    print(f"  バージョン: {openapi_schema['info']['version']}")
    print(f"  OpenAPIバージョン: {openapi_schema['openapi']}")

    # エンドポイント一覧
    print("\nエンドポイント一覧:")
    for path, methods in openapi_schema['paths'].items():
        for method, details in methods.items():
            print(f"  {method.upper()} {path}")
            if 'summary' in details:
                print(f"    Summary: {details['summary']}")
            if 'tags' in details:
                print(f"    Tags: {', '.join(details['tags'])}")

if __name__ == "__main__":
    main()
