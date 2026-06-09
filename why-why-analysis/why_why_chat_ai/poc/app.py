"""
なぜなぜ分析システムのStreamlitウェブアプリケーション
"""
from typing import Dict, Any, Optional, Union
import os
import sys
import time
import uuid
import dotenv
from loguru import logger
import streamlit as st
import streamlit_mermaid as stmd
from langchain_core.messages import AIMessage, HumanMessage, BaseMessage
from langgraph.constants import END
from langgraph.types import Command

from why_why_chat_ai.agent import get_default_config, why_nodes_to_mermaid
from .utils import setup_trace
from why_why_chat_ai.agent.models import (
    ProblemInput, Severity, DefectType, Frequency, InvestigationItem, VerificationResult, WhyNode
)
from why_why_chat_ai.agent.why_why_agent import WhyWhyAgentBuilder
from why_why_chat_ai.agent.dummy_agent import DummyWhyWhyAgentBuilder

# 環境変数の読み込み
dotenv.load_dotenv()

DEBUG_MODE = os.environ.get("DEBUG_MODE", False)
DEBUG_MODE = DEBUG_MODE if isinstance(DEBUG_MODE, bool) else str(DEBUG_MODE).lower() in ["true", "1", "t"]
# ダミーエージェントを使用するかどうか
USING_DUMMY_AGENT = False

if DEBUG_MODE:
    logger.add(sys.stdout, level="DEBUG")
else:
    logger.add(sys.stdout, level="INFO")

setup_trace()

# ページ設定
st.set_page_config(
    page_title="なぜなぜ分析 AI支援システム",
    page_icon="🔍",
    layout="centered",
    initial_sidebar_state="expanded"
)


# セッションIDの初期化
if "session_id" not in st.session_state:
    st.session_state["session_id"] = None

# アクション状態と日本語表示のマッピング
ACTION_DISPLAY_MAP = {
    "initial_analysis": "初期分析中",
    "deep_analysis": "詳細分析中",
    "info_request": "情報リクエスト中",
    "root_cause_analysis": "根本原因分析中",
    END: "完了"
}

# エージェント状態の初期化（WhyWhyAgentBuilder.Stateの構造に合わせている）
if "agent_state" not in st.session_state:
    st.session_state["agent_state"] = {
        "problem": None,
        "why_nodes": {},
        "chat_history": [],
        "root_causes": [],
    }

# エージェントビルダーの初期化
agent_builder: Union[DummyWhyWhyAgentBuilder, WhyWhyAgentBuilder]
if USING_DUMMY_AGENT:
    agent_builder = DummyWhyWhyAgentBuilder()
else:
    agent_builder = WhyWhyAgentBuilder()

# expander状態の初期化 (問題入力表示用)
if "expander_state" not in st.session_state:
    st.session_state["expander_state"] = True

# チャットのユーザー入力待機(中断状態)の初期化
if "interrupted" not in st.session_state:
    st.session_state["interrupted"] = False
# エージェント処理完了フラグの初期化
if "agent_processing_completed" not in st.session_state:
    st.session_state["agent_processing_completed"] = False

# アプリのタイトルと説明
st.title("なぜなぜ分析 AI支援システム")
st.markdown("""
このシステムは、ユーザーの入力した問題情報をもとに、AI支援による「なぜなぜ分析」を実施し、
真因（根本原因）の特定をサポートします。
""")

# サイドバー: デバック情報を表示
if DEBUG_MODE:
    with st.sidebar:
        st.write("DEBUG MODE")
        if USING_DUMMY_AGENT:
            st.warning("ダミーエージェントを使用中")
        st.markdown("---")
        st.header("セッション情報")
        session_id_display = st.session_state.get("session_id")
        if session_id_display:
            st.info(f"セッションID: {session_id_display or '未設定'}")
            if st.button("新規セッション開始"):
                # 状態をリセット
                st.session_state["session_id"] = None
                st.session_state["agent_state"] = {
                    "problem": None,
                    "details": [],
                    "why_nodes": {},
                    "chat_history": [],
                    "root_causes": [],
                }
                st.rerun()
        else:
            st.warning("セッションが開始されていません")
        st.header("Session State")
        for k, v in st.session_state.items():
            st.subheader(k)
            st.write(v if k != "agent" else str(v))


# メインコンテンツ
# 問題入力セクション (expander内に配置)
# セッションが開始されているかどうかでフォームの入力を無効化するフラグ
form_disabled = st.session_state["session_id"] is not None

with st.expander("問題情報の入力", expanded=st.session_state["expander_state"]):
    # フォームの中にテキストエリアと他のフォーム要素を配置
    with st.form("problem_input_form"):
        # 1.1 基本情報
        st.subheader("1.1 基本情報")
        title = st.text_input("不具合概要 / 問題のタイトル", help="例: ライン停止、部品の欠品、品質検査でNG発生など", disabled=form_disabled)

        col1, col2 = st.columns(2)
        with col1:
            product_name = st.text_input("製品名", disabled=form_disabled)

            # 日付と時間を個別に入力させる
            st.markdown("不具合発見日時")
            date_col, time_col = st.columns(2)
            with date_col:
                # 日付入力
                occurrence_date_val = st.date_input("日付", value=None, disabled=form_disabled, help="不具合を発見した日付")
            with time_col:
                # 時間入力
                occurrence_time_val = st.time_input("時刻", value=None, disabled=form_disabled, help="不具合を発見した時刻")

            process = st.text_input("対象工程 / ライン番号", disabled=form_disabled)

        with col2:
            location = st.text_input("発生場所 (工場名・エリア)", disabled=form_disabled)
            severity = st.selectbox(
                "緊急度・影響度",
                ["選択してください", "軽微", "中程度", "重大"],
                index=0,
                disabled=form_disabled
            )

        # 1.2 不具合の詳細説明
        st.subheader("1.2 不具合の詳細説明")
        description = st.text_area("問題の詳細説明（不具合の状態、症状、現象を具体的に記述）", height=150, disabled=form_disabled)

        # 2.1 5M1E分析
        st.subheader("2.1 5M1E分析")
        st.markdown("各要素について異常がある場合は詳細を入力してください")

        # 5M1E分析の詳細

        # Man（人）
        st.markdown("###### ■ Man（人）:")
        man_details = st.text_area("作業者の技能、教育、手順の遵守", height=70, disabled=form_disabled)
        # Machine（機械）
        st.markdown("###### ■ Machine（機械）:")
        machine_details = st.text_area("設備の状態、精度、メンテナンス", height=70, disabled=form_disabled)
        # Material（材料）
        st.markdown("###### ■ Material（材料）:")
        material_details = st.text_area("原材料、部品の品質、変更", height=70, disabled=form_disabled)
        # Method（方法）
        st.markdown("###### ■ Method（方法）:")
        method_details = st.text_area("作業標準、手順、条件", height=70, disabled=form_disabled)
        # Measurement（測定）
        st.markdown("###### ■ Measurement（測定）:")
        measurement_details = st.text_area("検査方法、判定基準、校正", height=70, disabled=form_disabled)
        # Environment（環境）
        st.markdown("###### ■ Environment（環境）:")
        environment_details = st.text_area("温度、湿度、清浄度、照明", height=70, disabled=form_disabled)

        # 2.2 時系列分析
        st.subheader("2.2 時系列分析")
        timeline_analysis = st.text_area(
            "関連する工程の変更履歴、過去の類似不具合発生状況などを記述してください。", height=100, disabled=form_disabled)

        # 3.1 不具合の分類と重要度
        st.subheader("3.1 不具合の分類と重要度")
        defect_types = st.multiselect(
            "不具合分類",
            ["外観", "寸法", "機能", "材質", "強度", "耐久性", "安全性", "その他"],
            disabled=form_disabled
        )
        other_defect_type = st.text_input("その他の不具合分類の詳細", disabled=form_disabled)

        frequency = st.selectbox(
            "発生頻度",
            ["選択してください", "多発", "散発", "稀", "初めて"],
            index=0,
            disabled=form_disabled
        )
        frequency_percentage = st.text_input("発生頻度の割合（%）", disabled=form_disabled)

        # 3.2 実施した調査・試験
        st.subheader("3.2 実施した調査・試験")

        # 調査1
        col_inv1_1, col_inv1_2, col_inv1_3, col_inv1_4 = st.columns([1, 3, 3, 1])
        with col_inv1_1:
            investigation_date_1 = st.date_input("実施日 #1", value=None, disabled=form_disabled)
        with col_inv1_2:
            investigation_content_1 = st.text_input("調査・試験内容 #1", disabled=form_disabled)
        with col_inv1_3:
            investigation_result_1 = st.text_input("結果 #1", disabled=form_disabled)
        with col_inv1_4:
            investigator_1 = st.text_input("実施者 #1", disabled=form_disabled)

        # 調査2
        col_inv2_1, col_inv2_2, col_inv2_3, col_inv2_4 = st.columns([1, 3, 3, 1])
        with col_inv2_1:
            investigation_date_2 = st.date_input("実施日 #2", value=None, disabled=form_disabled)
        with col_inv2_2:
            investigation_content_2 = st.text_input("調査・試験内容 #2", disabled=form_disabled)
        with col_inv2_3:
            investigation_result_2 = st.text_input("結果 #2", disabled=form_disabled)
        with col_inv2_4:
            investigator_2 = st.text_input("実施者 #2", disabled=form_disabled)

        # 調査3
        col_inv3_1, col_inv3_2, col_inv3_3, col_inv3_4 = st.columns([1, 3, 3, 1])
        with col_inv3_1:
            investigation_date_3 = st.date_input("実施日 #3", value=None, disabled=form_disabled)
        with col_inv3_2:
            investigation_content_3 = st.text_input("調査・試験内容 #3", disabled=form_disabled)
        with col_inv3_3:
            investigation_result_3 = st.text_input("結果 #3", disabled=form_disabled)
        with col_inv3_4:
            investigator_3 = st.text_input("実施者 #3", disabled=form_disabled)
        # TODO 実施した調査・試験を追加できるようにする

        # 3.3 直接原因
        st.subheader("3.3 直接原因")
        direct_cause = st.text_area("不具合発生の直接的な技術的原因が分かっている場合は記載してください。", height=100, disabled=form_disabled)

        # 3.4 原因の検証結果
        st.subheader("3.4 原因の検証結果")
        col_ver_1, col_ver_2, col_ver_3, col_ver_4 = st.columns([2, 2, 1, 1])
        with col_ver_1:
            verification_method = st.text_input("検証方法", disabled=form_disabled)
        with col_ver_2:
            verification_result = st.text_input("結果", disabled=form_disabled)
        with col_ver_3:
            verification_date = st.date_input("実施日", value=None, disabled=form_disabled)
        with col_ver_4:
            verifier = st.text_input("実施者", disabled=form_disabled)

        # フォームが無効化されている場合は異なるメッセージを表示
        if form_disabled:
            st.info("分析が開始されています。問題情報は編集できません。")
        else:
            st.info("「分析開始」をクリックすると、AIによるなぜなぜ分析が開始されます。")
        # フォームボタンは常に表示するが、分析開始済みの場合は無効にする
        submitted = st.form_submit_button("分析開始", type="primary", disabled=form_disabled)

    if submitted and title:
        # 調査・試験項目の作成
        investigations = []
        if investigation_content_1:
            investigations.append(InvestigationItem(
                date=investigation_date_1.isoformat() if investigation_date_1 else None,
                content=investigation_content_1,
                result=investigation_result_1 if investigation_result_1 else None,
                investigator=investigator_1 if investigator_1 else None
            ))
        if investigation_content_2:
            investigations.append(InvestigationItem(
                date=investigation_date_2.isoformat() if investigation_date_2 else None,
                content=investigation_content_2,
                result=investigation_result_2 if investigation_result_2 else None,
                investigator=investigator_2 if investigator_2 else None
            ))
        if investigation_content_3:
            investigations.append(InvestigationItem(
                date=investigation_date_3.isoformat() if investigation_date_3 else None,
                content=investigation_content_3,
                result=investigation_result_3 if investigation_result_3 else None,
                investigator=investigator_3 if investigator_3 else None
            ))

        # 検証結果の作成
        verification_result_obj = None
        if verification_method or verification_result or verification_date or verifier:
            verification_result_obj = VerificationResult(
                method=verification_method if verification_method else None,
                result=verification_result if verification_result else None,
                date=verification_date.isoformat() if verification_date else None,
                verifier=verifier if verifier else None
            )

        # 不具合分類の処理
        defect_type_list = None
        if defect_types:
            defect_type_list = []
            for dt in defect_types:
                if dt == "外観":
                    defect_type_list.append(DefectType.APPEARANCE)
                elif dt == "寸法":
                    defect_type_list.append(DefectType.DIMENSION)
                elif dt == "機能":
                    defect_type_list.append(DefectType.FUNCTION)
                elif dt == "材質":
                    defect_type_list.append(DefectType.MATERIAL)
                elif dt == "強度":
                    defect_type_list.append(DefectType.STRENGTH)
                elif dt == "耐久性":
                    defect_type_list.append(DefectType.DURABILITY)
                elif dt == "安全性":
                    defect_type_list.append(DefectType.SAFETY)
                elif dt == "その他":
                    defect_type_list.append(DefectType.OTHER)

        # 発生頻度の処理
        freq = None
        if frequency != "選択してください":
            if frequency == "多発":
                freq = Frequency.FREQUENT
            elif frequency == "散発":
                freq = Frequency.OCCASIONAL
            elif frequency == "稀":
                freq = Frequency.RARE
            elif frequency == "初めて":
                freq = Frequency.FIRST_TIME

        # 問題情報の作成
        problem = ProblemInput(
            title=title,
            product_name=product_name if product_name else None,
            # 日付と時間を統合して日時文字列を生成
            occurrence_date=f"{occurrence_date_val.isoformat()} {occurrence_time_val.isoformat()}" if occurrence_date_val and occurrence_time_val else None,
            process=process if process else None,
            location=location if location else None,
            severity=Severity.HIGH if severity == "重大" else (
                Severity.MEDIUM if severity == "中程度" else (
                    Severity.LOW if severity == "軽微" else None
                )
            ),
            description=description if description else None,
            # 5M1E分析
            man_details=man_details if man_details else None,
            machine_details=machine_details if machine_details else None,
            material_details=material_details if material_details else None,
            method_details=method_details if method_details else None,
            measurement_details=measurement_details if measurement_details else None,
            environment_details=environment_details if environment_details else None,
            # 時系列分析
            timeline_analysis=timeline_analysis if timeline_analysis else None,
            # 不具合の分類と重要度
            defect_types=defect_type_list,
            other_defect_type=other_defect_type if other_defect_type else None,
            frequency=freq,
            frequency_percentage=frequency_percentage if frequency_percentage else None,
            # 調査・試験
            investigations=investigations if investigations else None,
            # 直接原因
            direct_cause=direct_cause if direct_cause else None,
            # 原因の検証結果
            verification=verification_result_obj
        )

        # セッションの作成
        session_id = str(uuid.uuid4())
        st.session_state["session_id"] = session_id
        st.session_state["agent_state"]["problem"] = problem  # 問題情報を保存

        # ログにセッションIDを出力（デバッグ用）
        print(f"INFO: セッションID {session_id} が設定されました")

        # expanderを閉じる
        st.session_state["expander_state"] = False
        st.rerun()


def show_analysis_result(container):
    """なぜなぜ分析の結果を表示（現在の状態を反映）"""
    # 問題情報とwhy_nodesを取得
    problem = st.session_state["agent_state"].get("problem", None)
    why_nodes = {i: n for i, n in st.session_state["agent_state"].get("why_nodes", {}).items() if n}  # None を除外
    if not why_nodes:
        logger.debug("why_nodesがまだ無いので分析結果を表示できません")
        return

    # 問題ノードを作成
    if problem:
        # 全why_nodesのコピーを作成して反映させる
        display_nodes = why_nodes.copy()

        # 問題ノードを追加（レベル0に設定）
        problem_node_id = f"problem_{uuid.uuid4().hex}"
        problem_node = WhyNode(
            id=problem_node_id,
            name=problem.title,
            root_cause_confidence=1.0,
            level=0,  # 問題はレベル0に設定
            parent_id=None,
            children_ids=[],
            is_root_cause=False,
            supporting_facts=""
        )
        display_nodes[problem_node_id] = problem_node

        # 親がないノード（parent_idがNone）を問題ノードの子として設定
        for node_id, node in why_nodes.items():
            if node.parent_id is None:
                display_nodes[node_id].parent_id = problem_node_id
                problem_node.children_ids.append(node_id)
                #logger.debug(f"ノード{node_id} は問題ノードの子です")

        # 変更したdisplay_nodesを使ってMermaidグラフを生成
        mermaid_text = why_nodes_to_mermaid(display_nodes)
    else:
        logger.debug("問題が設定されていないため、そのまま処理")
        mermaid_text = why_nodes_to_mermaid(why_nodes)

    if not mermaid_text:
        return
    with container:
        st.markdown("### なぜなぜ分析結果")
        logger.debug(f"Mermaid text:\n```mermaid\n{mermaid_text}\n```")
        stmd.st_mermaid(mermaid_text, width="2000px", show_controls=True)
        # 生成される図は横幅が長いため、小さく表示されるのを防ぐために width を大きくしている


def show_chat(message: BaseMessage, container):
    if isinstance(message, AIMessage):
        container.chat_message("assistant").write(message.content)
    elif isinstance(message, HumanMessage):
        container.chat_message("user").write(message.content)



def stream_agent(state: Optional[Dict[str, Any]] = None, message_container = None):
    """
    エージェントの分析処理をストリーミング形式で実行し、進捗状況をリアルタイムに表示する関数

    Args:
        state: エージェントの初期状態を含む辞書。Noneの場合はセッション状態から取得
        message_container: 出力先のStreamlitコンテナ。Noneの場合はデフォルトのstを使用
    """
    message_container = message_container or st
    state = state or st.session_state.get("agent_state", {})
    agent = st.session_state.get("agent") or agent_builder.build(debug=True)
    config = st.session_state.get("agent_config") or get_default_config()
    st.session_state["agent_config"] = config
    with st.status("分析中...", expanded=True) as status:
        for event in agent.stream(state, config):
            label = list(event.keys())[0]
            # イベントから思考プロセス（thought）を抽出 - イベントの構造によって抽出方法が異なる
            thought = event[label].get("thought", None) if isinstance(event.get(label), dict) else \
                event[label][0].value["thought"] if isinstance(event[label], tuple) else None
            if thought:
                # 思考プロセスを表示
                display_label = label if label != "__interrupt__" else "info_request"  # 割り込み発生時は表示ラベルを「info_request」に変更
                st.markdown(f'**{display_label}:**\n{thought}')
                time.sleep(2)  # ユーザーが読む時間を確保
            # 現在の状態をセッションに保存
            snapshot = agent.get_state(config)
            st.session_state["agent_state"] = snapshot.values
            st.session_state["agent"] = agent
            if label == "__interrupt__":
                # 割り込みイベント発生時には質問を表示してユーザーからの入力を待機する
                logger.debug("INTERRUPT")
                st.session_state["interrupted"] = True
                # 質問をチャット履歴に追加
                st.session_state["agent_state"]["chat_history"].append(
                    AIMessage(content=event[label][0].value["question"]))
                st.rerun()  # 画面を更新して割り込み処理に移行
                return
        # 分析完了時のステータス更新
        status.update(label="分析完了", expanded=False, state="complete")

    # 最終状態をセッションに反映
    snapshot = agent.get_state(config)
    st.session_state["agent_state"] = snapshot.values
    st.session_state["agent"] = agent
    # 処理完了フラグをセット - UI状態遷移のトリガーとなる
    st.session_state["agent_processing_completed"] = True
    st.rerun()  # 画面を更新して結果を表示

# 分析プロセスセクション
if st.session_state["session_id"]:
    interrupted = st.session_state["interrupted"]
    completed = st.session_state["agent_processing_completed"]

    message_container = st.container()
    # チャット履歴を表示
    chat_history = st.session_state["agent_state"].get("chat_history", [])
    for msg in chat_history[:len(chat_history) if completed else -1]:
        show_chat(msg, message_container)
    # 分析結果を表示
    show_analysis_result(message_container)
    # 分析完了していない場合、最後のメッセージだけ分析結果の下に表示 （∵ ユーザーへの質問）
    if not completed and len(chat_history) > 0:
        show_chat(chat_history[-1], message_container)

    if not completed:
        if not interrupted:
            # エージェントの構築と実行
            # 初期状態は session_state から取得
            stream_agent(message_container=message_container)
        else:
            # チャット入力欄
            user_input = st.chat_input("メッセージを入力してください") #, disabled=not interrupted or completed)
            if user_input:
                # ユーザーメッセージを表示
                message_container.chat_message("user").write(user_input)
                human_command = Command(resume={"response": user_input})
                stream_agent(human_command, message_container=message_container)
    else:
        # 真因と対策ページ
        st.header("真因と推奨対策")

        # 真因のみを取得
        root_cause_nodes = [node for _, node in st.session_state["agent_state"]["why_nodes"].items() if node and node.is_root_cause]

        # 確信度でソート
        root_cause_nodes.sort(key=lambda x: x.root_cause_confidence, reverse=True)

        for i, node in enumerate(root_cause_nodes):
            confidence_text = f"{node.root_cause_confidence:.0%}" if isinstance(node.root_cause_confidence, float) else f"{float(node.root_cause_confidence):.0%}"
            with st.expander(f"真因候補 {i+1}: {node.name} (確信度: {confidence_text})", expanded=i==0):
                st.subheader(node.name)

                st.markdown("##### 裏付けとなる事実と判断理由")
                st.write(node.supporting_facts)
                st.write(node.root_cause_judgement)

                st.markdown("##### 推奨アクション")
                st.write(node.recurrence_prevention_measures)
