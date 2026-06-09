"""
データモデルのユニットテスト
"""
import json
import pytest
from pydantic import ValidationError

from why_why_chat_ai.agent.models import (
    Severity, DefectType, Frequency,
    InvestigationItem, VerificationResult,
    ProblemInput, WhyNode
)
from langchain_core.messages import SystemMessage, HumanMessage


def test_severity_enum():
    """Severityの列挙型テスト"""
    assert Severity.LOW.value == "軽微"
    assert Severity.MEDIUM.value == "中程度"
    assert Severity.HIGH.value == "重大"


def test_defect_type_enum():
    """DefectTypeの列挙型テスト"""
    assert DefectType.APPEARANCE.value == "外観"
    assert DefectType.DIMENSION.value == "寸法"
    assert DefectType.FUNCTION.value == "機能"
    assert DefectType.MATERIAL.value == "材質"
    assert DefectType.STRENGTH.value == "強度"
    assert DefectType.DURABILITY.value == "耐久性"
    assert DefectType.SAFETY.value == "安全性"
    assert DefectType.OTHER.value == "その他"


def test_frequency_enum():
    """Frequencyの列挙型テスト"""
    assert Frequency.FREQUENT.value == "多発"
    assert Frequency.OCCASIONAL.value == "散発"
    assert Frequency.RARE.value == "稀"
    assert Frequency.FIRST_TIME.value == "初めて"




def test_problem_input():
    """ProblemInputモデルのテスト"""
    # 必須フィールドのみのテスト
    problem = ProblemInput(title="生産ラインの停止")
    assert problem.title == "生産ラインの停止"
    assert problem.occurrence_date is None
    assert problem.process is None
    assert problem.location is None
    assert problem.severity is None
    assert problem.description is None

    # すべてのフィールドを含むテスト
    problem = ProblemInput(
        title="生産ラインの停止",
        occurrence_date="2025-02-27",
        process="組立ライン3",
        location="A工場",
        severity=Severity.HIGH,
        description="急に生産ラインが停止した"
    )
    assert problem.title == "生産ラインの停止"
    assert problem.occurrence_date == "2025-02-27"
    assert problem.process == "組立ライン3"
    assert problem.location == "A工場"
    assert problem.severity == Severity.HIGH
    assert problem.description == "急に生産ラインが停止した"

    # dict変換テスト
    problem_dict = problem.model_dump(mode="json")
    assert problem_dict["title"] == "生産ラインの停止"
    assert problem_dict["severity"] == "重大"


def test_problem_input_to_markdown():
    """ProblemInputのto_markdownメソッドのテスト"""
    # 基本情報のみのテスト
    problem = ProblemInput(
        title="生産ラインの停止",
        occurrence_date="2025-02-27",
        severity=Severity.HIGH
    )

    # デフォルトのヘッダーレベルのテスト
    markdown = problem.to_markdown()
    lines = markdown.split("\n")

    # ヘッダー内容の確認
    assert "## 1.1 Basic Information" in lines
    assert "### Problem Title" in lines
    assert "生産ラインの停止" in lines
    assert "### Occurrence Date" in lines
    assert "2025-02-27" in lines
    assert "### Severity & Impact" in lines
    assert "重大" in lines

    # base_levelを変えた場合のテスト
    markdown_level1 = problem.to_markdown(base_level=1)
    lines_level1 = markdown_level1.split("\n")

    # ヘッダーレベルが下がっていることを確認
    assert "# 1.1 Basic Information" in lines_level1
    assert "## Problem Title" in lines_level1

    # base_levelを上げた場合のテスト
    markdown_level3 = problem.to_markdown(base_level=3)
    lines_level3 = markdown_level3.split("\n")

    # ヘッダーレベルが上がっていることを確認
    assert "### 1.1 Basic Information" in lines_level3
    assert "#### Problem Title" in lines_level3

    # 5M1E分析を含む詳細なテスト
    problem_with_details = ProblemInput(
        title="生産ラインの停止",
        description="急に生産ラインが停止した",
        man_details="オペレーターが不在だった",
        machine_details="設備の故障が発生した"
    )

    markdown_with_details = problem_with_details.to_markdown()
    lines_with_details = markdown_with_details.split("\n")

    # 内容の確認
    assert "## 1.2 Detailed Description" in lines_with_details
    assert "急に生産ラインが停止した" in lines_with_details
    assert "## 2.1 5M1E Analysis" in lines_with_details
    assert "### Man（人）" in lines_with_details
    assert "オペレーターが不在だった" in lines_with_details
    assert "### Machine（機械）" in lines_with_details
    assert "設備の故障が発生した" in lines_with_details


def test_problem_input_to_markdown_extended():
    """ProblemInputのto_markdownメソッドの3.X以降のセクションをテスト"""
    from why_why_chat_ai.agent.models import DefectType, Frequency, InvestigationItem, VerificationResult

    # 3.1〜3.4の全てのセクションを含むProblemInputを作成
    problem = ProblemInput(
        title="生産ラインの停止",
        # 3.1 不具合の分類と重要度
        defect_types=[DefectType.FUNCTION, DefectType.SAFETY],
        other_defect_type="機械的な故障",
        frequency=Frequency.RARE,
        frequency_percentage="5",

        # 3.2 実施した調査・試験
        investigations=[
            InvestigationItem(
                date="2025-03-15",
                content="機械の状態確認",
                result="モーターに異常発熱を確認",
                investigator="田中"
            ),
            InvestigationItem(
                date="2025-03-16",
                content="電気系統の確認",
                result="配線に問題なし",
                investigator="鈴木"
            )
        ],

        # 3.3 直接原因
        direct_cause="モーターの寿命が尽き、オーバーヒートしたため",

        # 3.4 原因の検証結果
        verification=VerificationResult(
            method="新しいモーターに交換して間欠が解消されるか確認",
            result="交換後は正常に動作することを確認",
            date="2025-03-20",
            verifier="高橋"
        )
    )

    # Markdownに変換
    markdown = problem.to_markdown()
    lines = markdown.split("\n")

    # 3.1 不具合の分類と重要度の確認
    assert "## 3.1 Defect Classification and Severity" in lines
    assert "### Defect Type" in lines
    assert "機能, 安全性" in lines  # DefectType.FUNCTION.value, DefectType.SAFETY.value
    assert "### Other Defect Type" in lines
    assert "機械的な故障" in lines
    assert "### Frequency" in lines
    assert "稀" in lines  # Frequency.RARE.value
    assert "Occurrence Rate: 5%" in lines

    # 3.2 実施した調査・試験の確認
    assert "## 3.2 Investigations and Tests" in lines
    assert "### Investigation #1" in lines
    assert "- Date: 2025-03-15" in lines
    assert "- Content: 機械の状態確認" in lines
    assert "- Result: モーターに異常発熱を確認" in lines
    assert "- Investigator: 田中" in lines

    assert "### Investigation #2" in lines
    assert "- Date: 2025-03-16" in lines
    assert "- Content: 電気系統の確認" in lines
    assert "- Result: 配線に問題なし" in lines
    assert "- Investigator: 鈴木" in lines

    # 3.3 直接原因の確認
    assert "## 3.3 Direct Cause" in lines
    assert "モーターの寿命が尽き、オーバーヒートしたため" in lines

    # 3.4 原因の検証結果の確認
    assert "## 3.4 Verification Results" in lines
    assert "- Method: 新しいモーターに交換して間欠が解消されるか確認" in lines
    assert "- Result: 交換後は正常に動作することを確認" in lines
    assert "- Date: 2025-03-20" in lines
    assert "- Verifier: 高橋" in lines

    # __str__メソッドの確認
    str_output = str(problem)
    assert "## 3.1 Defect Classification and Severity" in str_output
    assert "## 3.3 Direct Cause" in str_output
    assert "## 3.4 Verification Results" in str_output





def test_why_node():
    """WhyNodeモデルのテスト"""
    node = WhyNode(
        id="node1",
        name="モーターが故障した",
        root_cause_confidence=0.8,
        level=1,
        parent_id=None,
        children_ids=["node2", "node3"],
        is_root_cause=False,
        supporting_facts="モーターから異音がした, 摩耗の跡がある"
    )
    assert node.id == "node1"
    assert node.name == "モーターが故障した"
    assert node.root_cause_confidence == 0.8
    assert node.level == 1
    assert node.parent_id is None
    assert node.children_ids == ["node2", "node3"]
    assert node.is_root_cause is False
    assert node.supporting_facts == "モーターから異音がした, 摩耗の跡がある"

    # dict変換テスト
    node_dict = node.model_dump()
    assert node_dict["id"] == "node1"
    assert node_dict["root_cause_confidence"] == 0.8


def test_investigation_item():
    """InvestigationItemモデルのテスト"""
    # 全フィールドを指定したテスト
    item = InvestigationItem(
        date="2025-03-15",
        content="機械の状態確認",
        result="モーターに異常発熱を確認",
        investigator="田中"
    )
    assert item.date == "2025-03-15"
    assert item.content == "機械の状態確認"
    assert item.result == "モーターに異常発熱を確認"
    assert item.investigator == "田中"

    # 空のインスタンスのテスト
    empty_item = InvestigationItem()
    assert empty_item.date is None
    assert empty_item.content is None
    assert empty_item.result is None
    assert empty_item.investigator is None

    # JSONシリアライゼーションテスト
    item_dict = item.model_dump(mode="json")
    assert item_dict["date"] == "2025-03-15"
    assert item_dict["content"] == "機械の状態確認"


def test_verification_result():
    """VerificationResultモデルのテスト"""
    # 全フィールドを指定したテスト
    verification = VerificationResult(
        method="新しいモーターに交換して正常動作するか確認",
        result="交換後は正常に動作することを確認",
        date="2025-03-20",
        verifier="高橋"
    )
    assert verification.method == "新しいモーターに交換して正常動作するか確認"
    assert verification.result == "交換後は正常に動作することを確認"
    assert verification.date == "2025-03-20"
    assert verification.verifier == "高橋"

    # __str__メソッドのテスト
    str_output = str(verification)
    assert "Verification Method: 新しいモーターに交換して正常動作するか確認" in str_output
    assert "Result: 交換後は正常に動作することを確認" in str_output
    assert "Date: 2025-03-20" in str_output
    assert "Verifier: 高橋" in str_output

    # 空のインスタンスのテスト
    empty_verification = VerificationResult()
    assert empty_verification.method is None
    assert empty_verification.result is None
    assert empty_verification.date is None
    assert empty_verification.verifier is None


def test_problem_input_validation():
    """ProblemInputのバリデーションテスト"""
    # 必須フィールドがない場合のエラーテスト
    with pytest.raises(ValidationError) as exc_info:
        ProblemInput()

    errors = exc_info.value.errors()
    assert len(errors) == 1
    assert errors[0]["type"] == "missing"
    assert "title" in str(errors[0])

    # 正常なケース
    problem = ProblemInput(title="テスト問題")
    assert problem.title == "テスト問題"
    assert problem.language == "Japanese"


def test_problem_input_with_complex_data():
    """ProblemInputの複雑なデータテスト"""
    investigation = InvestigationItem(
        date="2025-03-15",
        content="機械の状態確認",
        result="モーターに異常発熱を確認",
        investigator="田中"
    )

    verification = VerificationResult(
        method="新しいモーターに交換して正常動作するか確認",
        result="交換後は正常に動作することを確認",
        date="2025-03-20",
        verifier="高橋"
    )

    problem = ProblemInput(
        title="生産ラインの停止",
        product_name="自動車部品A",
        occurrence_date="2025-03-15 14:30",
        process="組立ライン3",
        location="A工場",
        severity=Severity.HIGH,
        description="組立ラインが突然停止した",
        defect_types=[DefectType.FUNCTION, DefectType.SAFETY],
        frequency=Frequency.RARE,
        frequency_percentage="2",
        investigations=[investigation],
        direct_cause="モーターの冷却ファンが故障し、オーバーヒートした",
        verification=verification,
        language="Japanese"
    )

    # 各フィールドの確認
    assert problem.title == "生産ラインの停止"
    assert problem.product_name == "自動車部品A"
    assert problem.severity == Severity.HIGH
    assert DefectType.FUNCTION in problem.defect_types
    assert DefectType.SAFETY in problem.defect_types
    assert problem.frequency == Frequency.RARE
    assert len(problem.investigations) == 1
    assert problem.investigations[0].content == "機械の状態確認"
    assert problem.verification.method == "新しいモーターに交換して正常動作するか確認"

    # JSONシリアライゼーションテスト
    problem_dict = problem.model_dump(mode="json")
    assert problem_dict["severity"] == "重大"
    assert "機能" in problem_dict["defect_types"]
    assert "安全性" in problem_dict["defect_types"]
    assert problem_dict["frequency"] == "稀"


def test_why_node_validation():
    """WhyNodeのバリデーションテスト"""
    # 必須フィールドがない場合のエラーテスト
    with pytest.raises(ValidationError) as exc_info:
        WhyNode()

    errors = exc_info.value.errors()
    assert len(errors) == 3  # id, name, levelが必須

    # 正常なケース
    node = WhyNode(
        id="node_001",
        name="モーターが故障した",
        level=1
    )
    assert node.id == "node_001"
    assert node.name == "モーターが故障した"
    assert node.level == 1
    assert node.parent_id is None
    assert node.children_ids == []
    assert node.supporting_facts == ""
    assert node.is_root_cause is False
    assert node.root_cause_confidence is None
    assert node.root_cause_judgement == ""
    assert node.recurrence_prevention_measures == ""


def test_why_node_with_full_data():
    """WhyNodeの全データテスト"""
    node = WhyNode(
        id="node_001",
        name="モーターが故障した",
        level=1,
        parent_id=None,
        children_ids=["node_002", "node_003"],
        supporting_facts="モーターから異音が発生し、温度センサーが80度を超える値を示していた",
        is_root_cause=False,
        root_cause_confidence=0.7,
        root_cause_judgement="直接的な原因ではあるが、さらに深い原因があると考えられる",
        recurrence_prevention_measures="定期的なモーター点検の頻度を上げる"
    )

    assert node.id == "node_001"
    assert node.name == "モーターが故障した"
    assert node.level == 1
    assert node.parent_id is None
    assert node.children_ids == ["node_002", "node_003"]
    assert "モーターから異音" in node.supporting_facts
    assert node.is_root_cause is False
    assert node.root_cause_confidence == 0.7
    assert "直接的な原因" in node.root_cause_judgement
    assert "定期的なモーター点検" in node.recurrence_prevention_measures

    # JSONシリアライゼーションテスト
    node_dict = node.model_dump(mode="json")
    assert node_dict["id"] == "node_001"
    assert node_dict["root_cause_confidence"] == 0.7
    assert node_dict["children_ids"] == ["node_002", "node_003"]


def test_why_node_hierarchy():
    """WhyNodeの階層構造テスト"""
    # 親ノード
    parent_node = WhyNode(
        id="parent_001",
        name="生産ラインが停止した",
        level=1,
        children_ids=["child_001", "child_002"]
    )

    # 子ノードその1
    child_node1 = WhyNode(
        id="child_001",
        name="モーターが故障した",
        level=2,
        parent_id="parent_001"
    )

    # 子ノードその2
    child_node2 = WhyNode(
        id="child_002",
        name="センサーが誤動作した",
        level=2,
        parent_id="parent_001"
    )

    # 関係の確認
    assert "child_001" in parent_node.children_ids
    assert "child_002" in parent_node.children_ids
    assert child_node1.parent_id == "parent_001"
    assert child_node2.parent_id == "parent_001"
    assert child_node1.level == parent_node.level + 1
    assert child_node2.level == parent_node.level + 1


def test_chat_message():
    """LangChainメッセージクラスのテスト"""
    # SystemMessageテスト
    message = SystemMessage(content="モーターの点検はいつ行われましたか？")

    assert message.content == "モーターの点検はいつ行われましたか？"
    assert message.type == "system"

    # HumanMessageテスト
    user_message = HumanMessage(content="2ヶ月前に実施されました")

    assert user_message.content == "2ヶ月前に実施されました"
    assert user_message.type == "human"


def test_json_serialization_severity_enum():
    """
    Severity EnumのJSONシリアライゼーションテスト
    Enum の value を直接シリアライズする
    """
    severity = Severity.HIGH
    severity_json = json.dumps(severity.value, ensure_ascii=False)
    assert "重大" in severity_json


def test_json_serialization_defect_type_enum():
    """DefectType EnumのJSONシリアライゼーションテスト"""
    defect_type = DefectType.FUNCTION
    defect_type_json = json.dumps(defect_type.value, ensure_ascii=False)
    assert "機能" in defect_type_json


def test_json_serialization_frequency_enum():
    """Frequency EnumのJSONシリアライゼーションテスト"""
    frequency = Frequency.RARE
    frequency_json = json.dumps(frequency.value, ensure_ascii=False)
    assert "稀" in frequency_json


def test_json_serialization_investigation_item():
    """InvestigationItemのJSONシリアライゼーションテスト"""
    investigation = InvestigationItem(
        date="2025-03-15",
        content="機械の状態確認",
        result="モーターに異常発熱を確認",
        investigator="田中"
    )
    investigation_dict = investigation.model_dump(mode="json")
    investigation_json = json.dumps(investigation_dict, ensure_ascii=False)
    assert "2025-03-15" in investigation_json
    assert "機械の状態確認" in investigation_json
    assert "モーターに異常発熱を確認" in investigation_json
    assert "田中" in investigation_json


def test_json_serialization_verification_result():
    """VerificationResultのJSONシリアライゼーションテスト"""
    verification = VerificationResult(
        method="新しいモーターに交換して正常動作するか確認",
        result="交換後は正常に動作することを確認",
        date="2025-03-20",
        verifier="高橋"
    )
    verification_dict = verification.model_dump(mode="json")
    verification_json = json.dumps(verification_dict, ensure_ascii=False)
    assert "新しいモーターに交換" in verification_json
    assert "交換後は正常に動作" in verification_json
    assert "2025-03-20" in verification_json
    assert "高橋" in verification_json


def test_json_serialization_problem_input():
    """ProblemInputのJSONシリアライゼーションテスト"""
    investigation = InvestigationItem(
        date="2025-03-15",
        content="機械の状態確認",
        result="モーターに異常発熱を確認",
        investigator="田中"
    )

    verification = VerificationResult(
        method="新しいモーターに交換して正常動作するか確認",
        result="交換後は正常に動作することを確認",
        date="2025-03-20",
        verifier="高橋"
    )

    problem = ProblemInput(
        title="生産ラインの停止",
        product_name="自動車部品A",
        occurrence_date="2025-03-15 14:30",
        process="組立ライン3",
        location="A工場",
        severity=Severity.HIGH,
        description="組立ラインが突然停止した",
        man_details="オペレーターが不在だった",
        machine_details="設備の故障が発生した",
        material_details="使用中の部品に異常は見られない",
        method_details="定期点検の手順は正しく実施されていた",
        measurement_details="温度センサーが80度を超える値を示していた",
        environment_details="工場内温度は正常範囲内",
        timeline_analysis="14:00 昼休み明け作業開始\n14:20 異音を確認\n14:30 ライン停止",
        defect_types=[DefectType.FUNCTION, DefectType.SAFETY],
        other_defect_type="機械的な故障",
        frequency=Frequency.RARE,
        frequency_percentage="5",
        investigations=[investigation],
        direct_cause="モーターの冷却ファンが故障し、オーバーヒートした",
        verification=verification,
        language="Japanese"
    )
    problem_dict = problem.model_dump(mode="json")
    problem_json = json.dumps(problem_dict, ensure_ascii=False)

    # 基本情報の確認
    assert "生産ラインの停止" in problem_json
    assert "自動車部品A" in problem_json
    assert "2025-03-15 14:30" in problem_json
    assert "組立ライン3" in problem_json
    assert "A工場" in problem_json
    assert "重大" in problem_json
    assert "組立ラインが突然停止した" in problem_json

    # 5M1E分析の確認
    assert "オペレーターが不在だった" in problem_json
    assert "設備の故障が発生した" in problem_json
    assert "使用中の部品に異常は見られない" in problem_json
    assert "定期点検の手順は正しく実施されていた" in problem_json
    assert "温度センサーが80度を超える値を示していた" in problem_json
    assert "工場内温度は正常範囲内" in problem_json

    # 時系列分析の確認
    assert "14:00 昼休み明け作業開始" in problem_json
    assert "14:20 異音を確認" in problem_json
    assert "14:30 ライン停止" in problem_json

    # 不具合分類の確認
    assert "機能" in problem_json
    assert "安全性" in problem_json
    assert "機械的な故障" in problem_json
    assert "稀" in problem_json
    assert "5" in problem_json

    # 調査・試験の確認
    assert "機械の状態確認" in problem_json
    assert "モーターに異常発熱を確認" in problem_json
    assert "田中" in problem_json

    # 直接原因の確認
    assert "モーターの冷却ファンが故障し、オーバーヒートした" in problem_json

    # 検証結果の確認
    assert "新しいモーターに交換して正常動作するか確認" in problem_json
    assert "交換後は正常に動作することを確認" in problem_json
    assert "高橋" in problem_json

    # 言語設定の確認
    assert "Japanese" in problem_json


def test_json_serialization_why_node():
    """WhyNodeのJSONシリアライゼーションテスト"""
    why_node = WhyNode(
        id="node_001",
        name="モーターが故障した",
        level=1,
        parent_id=None,
        children_ids=["node_002", "node_003"],
        supporting_facts="モーターから異音が発生し、温度センサーが80度を超える値を示していた",
        is_root_cause=False,
        root_cause_confidence=0.7,
        root_cause_judgement="直接的な原因ではあるが、さらに深い原因があると考えられる",
        recurrence_prevention_measures="定期的なモーター点検の頻度を上げる"
    )
    why_node_dict = why_node.model_dump(mode="json")
    why_node_json = json.dumps(why_node_dict, ensure_ascii=False)

    # 基本情報の確認
    assert "node_001" in why_node_json
    assert "モーターが故障した" in why_node_json
    assert "1" in why_node_json
    assert "null" in why_node_json  # parent_id
    assert "node_002" in why_node_json
    assert "node_003" in why_node_json

    # 詳細情報の確認
    assert "モーターから異音が発生し、温度センサーが80度を超える値を示していた" in why_node_json
    assert "false" in why_node_json  # is_root_cause
    assert "0.7" in why_node_json  # root_cause_confidence
    assert "直接的な原因ではあるが、さらに深い原因があると考えられる" in why_node_json
    assert "定期的なモーター点検の頻度を上げる" in why_node_json


def test_json_serialization_edge_case_problem_input():
    """ProblemInputのエッジケースJSONシリアライゼーションテスト"""
    # 空のProblemInput（必須フィールドのみ）
    empty_problem = ProblemInput(title="テスト")
    empty_problem_dict = empty_problem.model_dump(mode="json")
    empty_problem_json = json.dumps(empty_problem_dict, ensure_ascii=False)
    assert "テスト" in empty_problem_json
    assert "null" in empty_problem_json  # オプショナルフィールド


def test_json_serialization_edge_case_investigation_item():
    """InvestigationItemのエッジケースJSONシリアライゼーションテスト"""
    # 空のInvestigationItem
    empty_investigation = InvestigationItem()
    empty_investigation_dict = empty_investigation.model_dump(mode="json")
    empty_investigation_json = json.dumps(empty_investigation_dict, ensure_ascii=False)
    assert "null" in empty_investigation_json


def test_json_serialization_edge_case_verification_result():
    """VerificationResultのエッジケースJSONシリアライゼーションテスト"""
    # 空のVerificationResult
    empty_verification = VerificationResult()
    empty_verification_dict = empty_verification.model_dump(mode="json")
    empty_verification_json = json.dumps(empty_verification_dict, ensure_ascii=False)
    assert "null" in empty_verification_json


def test_json_serialization_edge_case_why_node():
    """WhyNodeのエッジケースJSONシリアライゼーションテスト"""
    # 最小限のWhyNode
    minimal_why_node = WhyNode(
        id="minimal",
        name="最小限のノード",
        level=1
    )
    minimal_why_node_dict = minimal_why_node.model_dump(mode="json")
    minimal_why_node_json = json.dumps(minimal_why_node_dict, ensure_ascii=False)
    assert "minimal" in minimal_why_node_json
    assert "最小限のノード" in minimal_why_node_json
    assert "1" in minimal_why_node_json
    assert "[]" in minimal_why_node_json  # 空のchildren_ids
    assert "false" in minimal_why_node_json  # is_root_cause
    assert "null" in minimal_why_node_json  # root_cause_confidence


def test_json_serialization_round_trip_problem_input():
    """ProblemInputのJSONシリアライゼーションラウンドトリップテスト"""
    original_problem = ProblemInput(
        title="ラウンドトリップテスト",
        severity=Severity.MEDIUM,
        defect_types=[DefectType.FUNCTION],
        frequency=Frequency.OCCASIONAL
    )

    # シリアライズ
    problem_dict = original_problem.model_dump(mode="json")
    problem_json = json.dumps(problem_dict, ensure_ascii=False)

    # デシリアライズ
    problem_dict_restored = json.loads(problem_json)
    restored_problem = ProblemInput(**problem_dict_restored)

    # 比較
    assert restored_problem.title == original_problem.title
    assert restored_problem.severity == original_problem.severity
    assert restored_problem.defect_types == original_problem.defect_types
    assert restored_problem.frequency == original_problem.frequency


def test_json_serialization_round_trip_why_node():
    """WhyNodeのJSONシリアライゼーションラウンドトリップテスト"""
    original_why_node = WhyNode(
        id="round_trip_test",
        name="ラウンドトリップテストノード",
        level=2,
        root_cause_confidence=0.85,
        is_root_cause=True
    )

    # シリアライズ
    why_node_dict = original_why_node.model_dump(mode="json")
    why_node_json = json.dumps(why_node_dict, ensure_ascii=False)

    # デシリアライズ
    why_node_dict_restored = json.loads(why_node_json)
    restored_why_node = WhyNode(**why_node_dict_restored)

    # 比較
    assert restored_why_node.id == original_why_node.id
    assert restored_why_node.name == original_why_node.name
    assert restored_why_node.level == original_why_node.level
    assert restored_why_node.root_cause_confidence == original_why_node.root_cause_confidence
    assert restored_why_node.is_root_cause == original_why_node.is_root_cause
