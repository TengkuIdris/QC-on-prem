"""
AgentClient の is_retry パラメータの統合テスト。
LangGraph のタイムトラベル機能が正しく動作することを検証。
"""
import asyncio
import logging

import pytest
import structlog
from langgraph.types import Command

from why_why_chat_ai.agent.models import ProblemInput
from why_why_chat_ai.api.services.agent_client import AgentClient

# ログレベルを設定
logging.getLogger("google").setLevel(logging.WARNING)

logger = structlog.get_logger(__name__)


@pytest.mark.integration
@pytest.mark.requires_vertex_ai
@pytest.mark.vertex_ai_dev
@pytest.mark.asyncio
async def test_is_retry_with_time_travel():
    """
    is_retry=True 時に LangGraph のタイムトラベル機能が正しく動作することを検証。
    
    シナリオ:
    1. 問題情報を入力してエージェントを開始
    2. エージェントから質問 (__interrupt__ イベント内の info_request) が来る
    3. ユーザーが最初の回答を送信
    4. その後 is_retry=True で新しい回答を送信
    5. 正しく過去の状態に戻って新しい回答が処理されることを確認
    """
    
    # AgentClient を初期化
    client = AgentClient()
    await client.set_up()
    
    # テスト用の問題情報
    problem = ProblemInput(
        title="製造ラインで部品の組み付け不良が発生",
        # エージェントに突っ込まれるようにあえてデータは少なく
    )
    
    thread_id = "test-thread-retry-001"
    
    # ステップ1: 問題情報を送信してエージェントを開始
    logger.info("ステップ1: 問題情報を送信")
    events_step1 = []
    
    async for event in client.astream(
        input_data={"problem": problem},
        thread_id=thread_id
    ):
        events_step1.append(event)
        logger.debug(f"Event: {list(event.keys())}")
        if "__interrupt__" in event:
            # LangGraphでは info_request は __interrupt__ として返される
            logger.info("✅ info_request (__interrupt__) を受信しました")
            interrupt_data = event["__interrupt__"]
            if hasattr(interrupt_data, 'value') and isinstance(interrupt_data.value, dict):
                logger.debug(f"Question: {interrupt_data.value.get('question', 'N/A')}")
            break
    
    # __interrupt__ (info_request) が返ってくることを確認
    info_request_found = any("__interrupt__" in event for event in events_step1)
    assert info_request_found, "エージェントからの質問 (__interrupt__) が見つかりません"
    
    # ステップ2: 最初のユーザー回答
    logger.info("ステップ2: 最初のユーザー回答を送信")
    first_answer = "ギアの組み付け時に手順書通りに作業していなかった可能性があります。"
    
    events_step2 = []
    async for event in client.astream(
        input_data=Command(resume={"response": first_answer}),
        thread_id=thread_id
    ):
        events_step2.append(event)
        logger.debug(f"Event after first answer: {list(event.keys())}")
        # 次の __interrupt__ まで処理
        if "__interrupt__" in event:
            logger.info("✅ 2回目の質問を受信")
            break
    
    # ストリーミングが完了するまで少し待つ（状態が永続化される時間を確保）
    await asyncio.sleep(0.5)
    
    # 状態を確認
    state_after_first = await client.get_thread_state(thread_id)
    chat_history_after_first = state_after_first.get("chat_history", [])
    
    # chat_historyの構造をデバッグ出力
    logger.info(f"chat_history の長さ: {len(chat_history_after_first)}")
    for i, msg in enumerate(chat_history_after_first):
        logger.info(f"chat_history[{i}]: type={type(msg)}, content={repr(msg)}")
    
    # 最初の回答が履歴に含まれていることを確認
    # chat_history は BaseMessage または dict のリスト
    first_answer_in_history = False
    for msg in chat_history_after_first:
        # BaseMessage オブジェクトの場合
        if hasattr(msg, 'content') and msg.content == first_answer:
            first_answer_in_history = True
            break
        # dict の場合
        elif isinstance(msg, dict) and msg.get('content') == first_answer:
            first_answer_in_history = True
            break
    
    assert first_answer_in_history, f"最初の回答が会話履歴に含まれていません。chat_history={chat_history_after_first}"
    logger.info(f"✅ 最初の回答が履歴に追加されました（履歴数: {len(chat_history_after_first)}）")
    
    # ステップ3: is_retry=True で新しい回答を送信
    logger.info("ステップ3: is_retry=True で新しい回答を送信")
    revised_answer = "ギアの組み付け時に、専用治具を使用せずに手作業で位置合わせを行っていました。また、作業者は新人で十分な訓練を受けていませんでした。"
    
    # 履歴を直接確認してタイムトラベル前の状態を記録
    pre_retry_history = list(client.agent.get_state_history(config={"configurable": {"thread_id": thread_id}}))
    logger.info(f"is_retry 前の履歴数: {len(pre_retry_history)}")
    
    events_step3 = []
    async for event in client.astream(
        input_data=Command(resume={"response": revised_answer}),
        thread_id=thread_id,
        is_retry=True  # ここが重要！
    ):
        events_step3.append(event)
        logger.debug(f"Event after retry: {list(event.keys())}")
        if "__interrupt__" in event or "final_result" in event:
            logger.info(f"✅ 最終イベント: {list(event.keys())}")
            break
    
    # ストリーミングが完了するまで少し待つ
    await asyncio.sleep(1.0)
    
    # 最終状態を確認
    final_state = await client.get_thread_state(thread_id)
    final_chat_history = final_state.get("chat_history", [])
    
    # chat_historyの構造をデバッグ出力
    logger.info(f"最終 chat_history の長さ: {len(final_chat_history)}")
    for i, msg in enumerate(final_chat_history):
        logger.info(f"final_chat_history[{i}]: type={type(msg)}, content={repr(msg)}")
    
    # 検証1: 新しい回答が処理されていること
    chat_contents = [msg.content if hasattr(msg, 'content') else msg.get('content') for msg in final_chat_history]
    assert revised_answer in chat_contents, \
        "修正後の回答が会話履歴に含まれていません。\nfinal_chat_history:\n" \
        + "\n".join(f'[{i}]{m.type}\n{m.content}' for i, m in enumerate(final_chat_history))
    assert first_answer not in chat_contents, \
        "修正されるべき最初の回答が会話履歴に含まれています。\nfinal_chat_history:\n" \
        + "\n".join(f'[{i}]{m.type}\n{m.content}' for i, m in enumerate(final_chat_history))
    logger.info("✅ 修正後の回答が正しく処理されました")
    
    # 検証2: エージェントの履歴を直接確認（タイムトラベルが機能したか）
    post_retry_history = list(client.agent.get_state_history(config={"configurable": {"thread_id": thread_id}}))
    logger.info(f"is_retry 後の履歴数: {len(post_retry_history)}")
    
    # 履歴に複数のチェックポイントが存在することを確認
    assert len(post_retry_history) >= 3, f"履歴が少なすぎます: {len(post_retry_history)}"
    
    # 検証3: why_nodes の進行状況を確認
    why_nodes = final_state.get("why_nodes", [])
    logger.info(f"最終的な why_nodes 数: {len(why_nodes)}")
    
    # エージェントが新しい情報を基に分析を進めたことを確認
    if why_nodes:
        # ノードの内容に新しい情報が反映されているか確認
        # why_nodesがリストか辞書かを確認
        if isinstance(why_nodes, dict):
            nodes_content = " ".join([
                (node.name if hasattr(node, 'name') else node.get("name", "")) + " " + 
                (node.supporting_facts if hasattr(node, 'supporting_facts') else node.get("supporting_facts", ""))
                for node in why_nodes.values()
            ])
        else:  # リストの場合
            nodes_content = " ".join([
                (node.name if hasattr(node, 'name') else node.get("name", "")) + " " + 
                (node.supporting_facts if hasattr(node, 'supporting_facts') else node.get("supporting_facts", ""))
                for node in why_nodes
            ])
        logger.info("分析内容に以下のキーワードが含まれているか確認: 治具、新人、訓練")
        # この検証は緩くする（エージェントの応答は変動する可能性があるため）
        assert "治具" in nodes_content or "新人" in nodes_content or "訓練" in nodes_content
        logger.info("✅ 新しい回答の内容が分析に反映されています")
    
    logger.info("✅ is_retry テスト成功: LangGraph のタイムトラベル機能が正しく動作しました")
    logger.info(f"最終的な会話履歴数: {len(final_chat_history)}")


if __name__ == "__main__":
    # 直接実行用
    
    # pytestのログ設定を適用
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # 非同期テスト実行
    asyncio.run(test_is_retry_with_time_travel())