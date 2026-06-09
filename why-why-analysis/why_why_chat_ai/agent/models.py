"""
なぜなぜ分析システムのデータモデル
"""
from enum import Enum
from textwrap import dedent
from typing import List, Optional
from pydantic import BaseModel, Field


class Severity(Enum):
    """
    問題の重大度を表す列挙型
    """
    LOW = "軽微"
    MEDIUM = "中程度"
    HIGH = "重大"




class DefectType(Enum):
    """
    不具合分類を表す列挙型
    """
    APPEARANCE = "外観"
    DIMENSION = "寸法"
    FUNCTION = "機能"
    MATERIAL = "材質"
    STRENGTH = "強度"
    DURABILITY = "耐久性"
    SAFETY = "安全性"
    OTHER = "その他"


class Frequency(Enum):
    """
    発生頻度を表す列挙型
    """
    FREQUENT = "多発"
    OCCASIONAL = "散発"
    RARE = "稀"
    FIRST_TIME = "初めて"


class InvestigationItem(BaseModel):
    """
    調査・試験項目モデル
    """
    date: Optional[str] = Field(None, description="実施日")
    content: Optional[str] = Field(None, description="調査・試験内容")
    result: Optional[str] = Field(None, description="結果")
    investigator: Optional[str] = Field(None, description="実施者")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "date": "2025-03-15",
                    "content": "機械の状態確認",
                    "result": "モーターに異常発熱を確認",
                    "investigator": "田中"
                }
            ]
        }
    }


class VerificationResult(BaseModel):
    """
    検証結果モデル
    """
    method: Optional[str] = Field(None, description="検証方法")
    result: Optional[str] = Field(None, description="結果")
    date: Optional[str] = Field(None, description="実施日")
    verifier: Optional[str] = Field(None, description="実施者")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "method": "新しいモーターに交換して正常動作するか確認",
                    "result": "交換後は正常に動作することを確認",
                    "date": "2025-03-20",
                    "verifier": "高橋"
                }
            ]
        }
    }

    def __str__(self):
        return dedent(f"""
        Verification Method: {self.method}
        Result: {self.result}
        Date: {self.date}
        Verifier: {self.verifier}
        """)


class ProblemInput(BaseModel):
    """
    初期入力情報モデル
    """
    # 1.1 基本情報
    title: str = Field(..., description="不具合概要/問題のタイトル")
    product_name: Optional[str] = Field(None, description="製品名")
    occurrence_date: Optional[str] = Field(None, description="不具合発見日時")
    process: Optional[str] = Field(None, description="対象工程/ライン番号")
    location: Optional[str] = Field(None, description="発生場所（工場名・エリア）")
    severity: Optional[Severity] = Field(None, description="緊急度・影響度")

    # 1.2 不具合の詳細説明
    description: Optional[str] = Field(None, description="問題の詳細説明")

    # 2.1 5M1E分析
    man_details: Optional[str] = Field(None, description="Man（人）の詳細")
    machine_details: Optional[str] = Field(None, description="Machine（機械）の詳細")
    material_details: Optional[str] = Field(None, description="Material（材料）の詳細")
    method_details: Optional[str] = Field(None, description="Method（方法）の詳細")
    measurement_details: Optional[str] = Field(None, description="Measurement（測定）の詳細")
    environment_details: Optional[str] = Field(None, description="Environment（環境）の詳細")
    # TODO *_detials という名前は冗長

    # 2.2 時系列分析
    timeline_analysis: Optional[str] = Field(None, description="時系列分析")

    # 3.1 不具合の分類と重要度
    defect_types: Optional[List[DefectType]] = Field(None, description="不具合分類")
    other_defect_type: Optional[str] = Field(None, description="その他の不具合分類の詳細")
    frequency: Optional[Frequency] = Field(None, description="発生頻度")
    frequency_percentage: Optional[str] = Field(None, description="発生頻度の割合（%）")

    # 3.2 実施した調査・試験
    investigations: Optional[List[InvestigationItem]] = Field(None, description="実施した調査・試験")

    # 3.3 直接原因
    direct_cause: Optional[str] = Field(None, description="直接原因")

    # 3.4 原因の検証結果
    verification: Optional[VerificationResult] = Field(None, description="原因の検証結果")

    # 4.1 その他
    language: Optional[str] = Field("Japanese", description="入出力言語 (例: Japanese, English)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "title": "生産ラインの停止",
                    "product_name": "自動車部品A",
                    "occurrence_date": "2025-03-15 14:30",
                    "process": "組立ライン3",
                    "location": "A工場",
                    "severity": "重大",
                    "description": "午後2時30分頃、組立ライン3が突然停止した。警告音が鳴り、制御盤にエラーコードE001が表示された。",
                    "man_details": "オペレーターが昼休み明けで、設備の状態確認を怠った可能性がある",
                    "machine_details": "組立用ロボットのモーターから異音が発生していた",
                    "material_details": "使用中の部品に異常は見られない",
                    "method_details": "定期点検の手順は正しく実施されていた",
                    "measurement_details": "温度センサーが80度を超える値を示していた",
                    "environment_details": "工場内温度は正常範囲内、湿度も問題なし",
                    "timeline_analysis": "14:00 昼休み明け作業開始\n14:20 異音を確認\n14:30 ライン停止",
                    "defect_types": ["機能"],
                    "frequency": "稀",
                    "frequency_percentage": "2",
                    "investigations": [
                        {
                            "date": "2025-03-15",
                            "content": "モーターの状態確認",
                            "result": "モーターに異常発熱を確認",
                            "investigator": "田中"
                        }
                    ],
                    "direct_cause": "モーターの冷却ファンが故障し、オーバーヒートした",
                    "verification": {
                        "method": "冷却ファンを交換して正常動作するか確認",
                        "result": "交換後は正常に動作することを確認",
                        "date": "2025-03-16",
                        "verifier": "高橋"
                    },
                    "language": "Japanese"
                }
            ]
        }
    }

    def __str__(self):
        return self.to_markdown(base_level=2)

    def to_markdown(self, base_level: int = 2) -> str:
        """Convert problem information to a Markdown formatted string

        Parameters
        ----------
        base_level : int, optional
            Base level for headers, default is 2 (## level)
            If 1, headers will be like '# , ## , ### ', if 2, like '## , ### , #### '

        Returns
        -------
        str
            Markdown formatted string with the problem details
        """
        md = []

        # ヘッダーレベルを生成するヘルパー関数
        def h(level: int, text: str) -> str:
            return f"{'#' * (base_level + level - 1)} {text}"

        # 1.1 Basic Information
        md.append(h(1, "1.1 Basic Information"))
        md.append(f"{h(2, "Problem Title")}\n{self.title}")

        if self.product_name:
            md.append(f"{h(2, "Product Name")}\n{self.product_name}")

        if self.occurrence_date:
            md.append(f"{h(2, "Occurrence Date")}\n{self.occurrence_date}")

        if self.process:
            md.append(f"{h(2, "Target Process/Line Number")}\n{self.process}")

        if self.location:
            md.append(f"{h(2, "Location")}\n{self.location}")

        if self.severity:
            md.append(f"{h(2, "Severity & Impact")}\n{self.severity.value}")

        # 1.2 Detailed Description
        if self.description:
            md.append(h(1, "1.2 Detailed Description"))
            md.append(self.description)

        # 2.1 5M1E Analysis
        has_5m1e = any([
            self.man_details, self.machine_details, self.material_details,
            self.method_details, self.measurement_details, self.environment_details
        ])

        if has_5m1e:
            md.append(h(1, "2.1 5M1E Analysis"))

            if self.man_details:
                md.append(h(2, "Man（人）"))
                md.append(self.man_details)

            if self.machine_details:
                md.append(h(2, "Machine（機械）"))
                md.append(self.machine_details)

            if self.material_details:
                md.append(h(2, "Material（材料）"))
                md.append(self.material_details)

            if self.method_details:
                md.append(h(2, "Method（方法）"))
                md.append(self.method_details)

            if self.measurement_details:
                md.append(h(2, "Measurement（測定）"))
                md.append(self.measurement_details)

            if self.environment_details:
                md.append(h(2, "Environment（環境）"))
                md.append(self.environment_details)

        # 2.2 Timeline Analysis
        if self.timeline_analysis:
            md.append(h(1, "2.2 Timeline Analysis"))
            md.append(self.timeline_analysis)

        # 3.1 Defect Classification and Severity
        has_defect_info = any([
            self.defect_types, self.other_defect_type,
            self.frequency, self.frequency_percentage
        ])

        if has_defect_info:
            md.append(h(1, "3.1 Defect Classification and Severity"))

            if self.defect_types:
                md.append(h(2, "Defect Type"))
                defect_types_str = ", ".join([dt.value for dt in self.defect_types])
                md.append(defect_types_str)

            if self.other_defect_type:
                md.append(h(2, "Other Defect Type"))
                md.append(self.other_defect_type)

            if self.frequency:
                md.append(h(2, "Frequency"))
                md.append(self.frequency.value)

                if self.frequency_percentage:
                    md.append(f"Occurrence Rate: {self.frequency_percentage}%")

        # 3.2 Investigations and Tests
        if self.investigations and len(self.investigations) > 0:
            md.append(h(1, "3.2 Investigations and Tests"))

            for i, inv in enumerate(self.investigations, 1):
                md.append(h(2, f"Investigation #{i}"))

                if inv.date:
                    md.append(f"- Date: {inv.date}")

                if inv.content:
                    md.append(f"- Content: {inv.content}")

                if inv.result:
                    md.append(f"- Result: {inv.result}")

                if inv.investigator:
                    md.append(f"- Investigator: {inv.investigator}")

        # 3.3 Direct Cause
        if self.direct_cause:
            md.append(h(1, "3.3 Direct Cause"))
            md.append(self.direct_cause)

        # 3.4 Verification Results
        if self.verification:
            md.append(h(1, "3.4 Verification Results"))

            if self.verification.method:
                md.append(f"- Method: {self.verification.method}")

            if self.verification.result:
                md.append(f"- Result: {self.verification.result}")

            if self.verification.date:
                md.append(f"- Date: {self.verification.date}")

            if self.verification.verifier:
                md.append(f"- Verifier: {self.verification.verifier}")

        return "\n\n".join(md)





class WhyNode(BaseModel):
    """
    なぜなぜ分析における原因の木構造の一つのノードを表すモデル
    """
    id: str = Field(..., description="ノードの一意な識別子")
    name: str = Field(..., description="原因の名前")
    level: int = Field(..., description="原因の階層レベル（1～5）")
    parent_id: Optional[str] = Field(None, description="親ノードのID")
    children_ids: List[str] = Field(default_factory=list, description="子ノードのIDリスト")
    supporting_facts: str = Field("", description="裏付けとなる事実")

    is_root_cause: bool = Field(False, description="真因候補かどうか")
    root_cause_confidence: Optional[float] = Field(None, description="真因かどうかの確信度（0.0～1.0）")
    root_cause_judgement: str = Field("", description="真因判断理由")
    recurrence_prevention_measures: str = Field("", description="再発防止策")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "node_001",
                    "name": "モーターが故障した",
                    "level": 1,
                    "parent_id": None,
                    "children_ids": ["node_002", "node_003"],
                    "supporting_facts": "モーターから異音が発生し、温度センサーが80度を超える値を示していた",
                    "is_root_cause": False,
                    "root_cause_confidence": 0.7,
                    "root_cause_judgement": "直接的な原因ではあるが、さらに深い原因があると考えられる",
                    "recurrence_prevention_measures": "定期的なモーター点検の頻度を上げる"
                },
                {
                    "id": "node_002",
                    "name": "冷却ファンが故障した",
                    "level": 2,
                    "parent_id": "node_001",
                    "children_ids": ["node_004"],
                    "supporting_facts": "冷却ファンが回転せず、モーターの温度が上昇していた",
                    "is_root_cause": True,
                    "root_cause_confidence": 0.9,
                    "root_cause_judgement": "冷却ファンの故障が根本原因と判断される",
                    "recurrence_prevention_measures": "冷却ファンの予防保全計画を策定し、定期交換を実施する"
                }
            ]
        }
    }
