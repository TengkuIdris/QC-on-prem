"""
なぜなぜ分析システムのエントリーポイント
"""
import sys
import streamlit.web.cli as stcli
from pathlib import Path

def main():
    """
    メインエントリーポイント
    """
    # スクリプトのディレクトリを取得
    current_dir = Path(__file__).parent
    app_path = current_dir / "app.py"

    # Streamlitアプリケーションを実行
    sys.argv = ["streamlit", "run", str(app_path), "--server.port=8501", "--server.headless=true"]
    sys.exit(stcli.main())

if __name__ == "__main__":
    main()
