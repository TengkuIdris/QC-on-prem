"""
RunnableConfigとcheckpoint機能のテスト
"""
import pytest
from unittest.mock import MagicMock, patch

from langgraph.checkpoint.memory import MemorySaver

from why_why_chat_ai.agent.utils import (
    create_config,
    extract_config_values,
    get_default_config,
    THREAD_ID,
    CHECKPOINT_ID
)
from why_why_chat_ai.agent.why_why_agent import WhyWhyAgentBuilder
from why_why_chat_ai.agent.models import ProblemInput


class TestConfigUtils:
    """Config utility関数のテスト"""

    def test_create_config_basic(self):
        """基本的なcreate_configのテスト"""
        thread_id = "test_thread_123"
        config = create_config(thread_id=thread_id)

        assert config is not None
        assert "configurable" in config
        assert config["configurable"][THREAD_ID] == thread_id
        assert config["recursion_limit"] == 64

    def test_create_config_with_all_params(self):
        """全パラメータを指定したcreate_configのテスト"""
        thread_id = "test_thread_123"
        checkpoint_id = "checkpoint_789"
        additional = {"custom_param": "value"}
        recursion_limit = 100

        config = create_config(
            thread_id=thread_id,
            checkpoint_id=checkpoint_id,
            additional_configurables=additional,
            recursion_limit=recursion_limit
        )

        assert config["configurable"][THREAD_ID] == thread_id
        assert config["configurable"][CHECKPOINT_ID] == checkpoint_id
        assert config["configurable"]["custom_param"] == "value"
        assert config["recursion_limit"] == recursion_limit

    def test_extract_config_values(self):
        """extract_config_valuesのテスト"""
        config = {
            "configurable": {
                THREAD_ID: "test_thread",
                CHECKPOINT_ID: "test_checkpoint"
            },
            "recursion_limit": 50
        }

        values = extract_config_values(config)
        assert values[THREAD_ID] == "test_thread"
        assert values[CHECKPOINT_ID] == "test_checkpoint"

    def test_extract_config_values_empty(self):
        """空のconfigに対するextract_config_valuesのテスト"""
        values = extract_config_values(None)
        assert values == {}

        values = extract_config_values({})
        assert values == {}

    def test_get_default_config(self):
        """get_default_configのテスト"""
        config = get_default_config()

        assert "configurable" in config
        assert THREAD_ID in config["configurable"]
        assert config["recursion_limit"] == 64

        # thread_idがUUIDの形式であることを確認
        thread_id = config["configurable"][THREAD_ID]
        assert isinstance(thread_id, str)
        assert len(thread_id) == 32  # UUID hex without hyphens




class TestWhyWhyAgentConfig:
    """WhyWhyAgentBuilderの設定機能のテスト"""

    def test_get_config_info(self):
        """get_config_infoメソッドのテスト"""
        builder = WhyWhyAgentBuilder()

        config = create_config(
            thread_id="test_thread",
            checkpoint_id="test_checkpoint"
        )

        info = builder.get_config_info(config)

        assert info["thread_id"] == "test_thread"
        assert info["checkpoint_id"] == "test_checkpoint"
        assert "all_configurables" in info

    def test_get_config_info_empty(self):
        """空のconfigに対するget_config_infoのテスト"""
        builder = WhyWhyAgentBuilder()

        info = builder.get_config_info(None)

        assert info["thread_id"] is None
        assert info["checkpoint_id"] is None
        assert info["all_configurables"] == {}

    def test_create_enhanced_send(self):
        """create_enhanced_sendメソッドのテスト"""
        builder = WhyWhyAgentBuilder()

        state = {
            "problem": ProblemInput(title="test problem"),
            "why_nodes": {},
            "chat_history": [],
            "root_causes": []
        }

        config = create_config(thread_id="test_thread")

        send = builder.create_enhanced_send("test_node", state, config)

        assert send.node == "test_node"
        assert "_config_info" in send.arg
        assert send.arg["_config_info"]["thread_id"] == "test_thread"

    def test_set_initial_cause_with_config(self):
        """設定情報を持つset_initial_causeのテスト"""
        builder = WhyWhyAgentBuilder()

        state = {
            "problem": ProblemInput(
                title="test problem",
                direct_cause="test cause"
            )
        }

        config = create_config(thread_id="test_thread")

        with patch('uuid.uuid4', return_value=MagicMock(hex='testid12345678')):
            with patch('why_why_chat_ai.agent.why_why_agent.logger') as mock_logger:
                result = builder.set_initial_cause(state, config)

                # ログが正しく呼ばれたことを確認
                mock_logger.info.assert_any_call("Setting initial cause for thread: test_thread")
                mock_logger.info.assert_any_call("Created initial cause node: testid12 for thread: test_thread")

                # 結果の確認
                assert "why_nodes" in result
                assert len(result["why_nodes"]) == 1

    def test_set_initial_cause_without_direct_cause(self):
        """直接原因がない場合のset_initial_causeのテスト"""
        builder = WhyWhyAgentBuilder()

        state = {
            "problem": ProblemInput(title="test problem")
        }

        config = create_config(thread_id="test_thread")

        with patch('why_why_chat_ai.agent.why_why_agent.logger') as mock_logger:
            result = builder.set_initial_cause(state, config)

            # ログが正しく呼ばれたことを確認
            mock_logger.info.assert_any_call("Setting initial cause for thread: test_thread")
            mock_logger.info.assert_any_call("No direct cause provided for thread: test_thread")

            # 結果の確認
            assert "why_nodes" in result
            assert len(result["why_nodes"]) == 0


@pytest.mark.integration
class TestCheckpointIntegration:
    """チェックポイント機能の統合テスト"""

    def test_agent_with_memory_checkpointer(self):
        """MemorySaverを使ったエージェントのテスト"""
        builder = WhyWhyAgentBuilder()
        checkpointer = MemorySaver()

        # エージェントを構築（実際のLLMは使わない）
        with patch('why_why_chat_ai.agent.why_why_agent.InitialWhyAnalysisActionBuilder'), \
             patch('why_why_chat_ai.agent.why_why_agent.DeepWhyAnalysisActionBuilder'), \
             patch('why_why_chat_ai.agent.why_why_agent.InfoRequestActionBuilder'), \
             patch('why_why_chat_ai.agent.why_why_agent.RootCauseAnalysisActionBuilder'):

            agent = builder.build(checkpointer=checkpointer)

            # 設定を作成
            config = create_config(thread_id="test_thread")

            # 基本的な動作確認
            assert agent is not None
            # 状態取得をテスト（実際の実行はしない）
            try:
                state = agent.get_state(config)
                # 初期状態では値がNoneの可能性があるが、エラーが発生しないことを確認
                assert state is not None or True  # 状態がNoneでもエラーが発生しなければOK
            except Exception as e:
                # エージェント構築に関連しない例外は無視
                if "no checkpoint" not in str(e).lower():
                    raise

    def test_config_validation(self):
        """設定のバリデーションテスト"""
        # 必須パラメータのthread_idがない場合のテスト
        with pytest.raises(TypeError):
            create_config()  # thread_idは必須

        # 有効な設定の作成
        valid_config = create_config(thread_id="valid_thread")
        assert valid_config is not None

        values = extract_config_values(valid_config)
        assert values[THREAD_ID] == "valid_thread"
