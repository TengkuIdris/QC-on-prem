from typing import TYPE_CHECKING, Optional, Dict, Any, Callable, List, Tuple
import json
import inspect
import uuid
from langchain_core.runnables import RunnableConfig

if TYPE_CHECKING:
    from why_why_chat_ai.agent.models import WhyNode


CONFIGURABLE = "configurable"
THREAD_ID = "thread_id"
CHECKPOINT_ID = "checkpoint_id"
RECURSION_LIMIT = "recursion_limit"


def get_default_config(additional_configurables: Optional[Dict[str, Any]] = None) -> RunnableConfig:
    """Generate default RunnableConfig whose thread_id is current timestamp

    Returns
    -------
    RunnableConfig
    """
    configurables = {THREAD_ID: uuid.uuid4().hex}
    if additional_configurables:
        configurables.update(additional_configurables)
    
    args = {
        CONFIGURABLE: configurables,
        RECURSION_LIMIT: 64
    }
    return RunnableConfig(args)


def create_config(
    thread_id: str,
    checkpoint_id: Optional[str] = None,
    additional_configurables: Optional[Dict[str, Any]] = None,
    recursion_limit: int = 64
) -> RunnableConfig:
    """Create RunnableConfig with specified parameters
    
    Parameters
    ----------
    thread_id : str
        The thread identifier for this conversation/analysis session
    checkpoint_id : Optional[str], optional
        Specific checkpoint to restore from, by default None
    additional_configurables : Optional[Dict[str, Any]], optional
        Additional configurable parameters, by default None
    recursion_limit : int, optional
        Maximum recursion depth for agent execution, by default 64
        
    Returns
    -------
    RunnableConfig
        Configured RunnableConfig instance
    """
    configurables = {THREAD_ID: thread_id}
        
    if checkpoint_id is not None:
        configurables[CHECKPOINT_ID] = checkpoint_id
        
    if additional_configurables:
        configurables.update(additional_configurables)
    
    return RunnableConfig({
        CONFIGURABLE: configurables,
        RECURSION_LIMIT: recursion_limit
    })


def extract_config_values(config: RunnableConfig) -> Dict[str, Any]:
    """Extract configurable values from RunnableConfig
    
    Parameters
    ----------
    config : RunnableConfig
        The configuration to extract values from
        
    Returns
    -------
    Dict[str, Any]
        Dictionary containing configurable values
    """
    return config.get(CONFIGURABLE, {}) if config else {}


def extract_func_args(func: Callable, kwargs: Dict[str, Any]) -> Dict[str, Any]:
    """
    指定された関数の引数に一致するキーと値をkwargsから抽出

    Parameters
    ----------
    func : callable
        引数を抽出したい関数
    kwargs : Dict[str, Any]
        キーワード引数の辞書

    Returns
    -------
    Dict[str, Any]
        指定された関数の引数に一致するキーと値の辞書
    """
    func_params = inspect.signature(func).parameters

    # func の引数に可変長キーワード引数が含まれている場合は、kwargs の任意の要素が該当するのでそのまま返す
    if any(param.kind == inspect.Parameter.VAR_KEYWORD for param in func_params.values()):
        return kwargs

    return {k: v for k, v in kwargs.items() if k in func_params}


DESCRIPTION_MARKDOWN_LIST = """
The results of the current 5 Whys analysis (なぜなぜ分析) that you have been doing.
The nested elements in the list are the causes that emerged from asking why the higher-level elements were further deepened.
The values enclosed in [] indicate the confidence of whether or not it is the root cause.
"""


def why_nodes_to_markdown_list(
    why_nodes: Dict[str, 'WhyNode'],
    root_id: Optional[str] = None,
    sort_roots: bool = False,
    sort_key: Optional[str] = None,
    add_description: bool = True,
) -> str:
    """
    WhyNode の集合から木構造または森（複数の木）を構築し、Markdown の入れ子リストとして表現する

    Parameters
    ----------
    why_nodes : Dict[str, WhyNode]
        WhyNode の集合（IDがキー）
    root_id : Optional[str], optional
        ルートノードのID。指定されない場合は、全てのルートノード（親を持たないノード）から森を構築する
    sort_roots : bool, optional
        複数のルートノードがある場合にソートするかどうか。デフォルトは False
    sort_key : Optional[str], optional
        ルートノードのソートに使用する WhyNode の属性名。デフォルトは None で 'name' が使われる
    add_description : bool, optional
        説明を追加するかどうか。デフォルトは True

    Returns
    -------
    str
        Markdown形式の入れ子リスト表現
    """
    why_nodes = {node_id: node for node_id, node in why_nodes.items() if node}  # None値を除外

    def _build_tree(node_id: str, depth: int = 0) -> str:
        if node_id not in why_nodes:
            return ""
        
        node = why_nodes[node_id]
        indent = "  " * depth
        confidence_value = f"{float(node.root_cause_confidence):.0%}" if node.root_cause_confidence else "-"
        result = f"{indent}- {node.name} [{confidence_value}]\n"
        
        # 子ノードを再帰的に処理
        for child_id in node.children_ids:
            result += _build_tree(child_id, depth + 1)
            
        return result

    # 特定のルートノードが指定された場合、そのルートからの木を構築
    if root_id is not None:
        return _build_tree(root_id)
    
    # ルートノードが指定されていない場合は、全てのルートノードから森を構築
    # ルートノードは親を持たないノード
    root_nodes = [(node_id, node) for node_id, node in why_nodes.items() if node.parent_id is None]
    
    # ルートノードが存在しない場合は空文字列を返す
    if not root_nodes:
        return ""
    
    # ルートノードをソートする場合
    if sort_roots:
        # ソートキーが指定されていなければ 'name' を使用
        key_attr = sort_key or 'name'
        root_nodes.sort(key=lambda x: getattr(x[1], key_attr, ''))
    
    result = ""
    # 説明を追加する
    if add_description:
        result += DESCRIPTION_MARKDOWN_LIST + "\n\n"
    # 各ルートノードから木を構築
    for node_id, _ in root_nodes:
        result += _build_tree(node_id)
    
    return result


def why_nodes_to_mermaid(why_nodes: Dict[str, 'WhyNode'], root_id: Optional[str] = None, sort_roots: bool = False, sort_key: Optional[str] = None) -> str:
    """
    WhyNode の集合から木構造または森（複数の木）を構築し、Mermaidのグラフコードとして表現する

    Parameters
    ----------
    why_nodes : Dict[str, WhyNode]
        WhyNode の集合（IDがキー）
    root_id : Optional[str], optional
        ルートノードのID。指定されない場合は、全てのルートノード（親を持たないノード）から森を構築する
    sort_roots : bool, optional
        複数のルートノードがある場合にソートするかどうか。デフォルトは False
    sort_key : Optional[str], optional
        ルートノードのソートに使用する WhyNode の属性名。デフォルトは None で 'name' が使われる

    Returns
    -------
    str
        Mermaid形式のグラフコード
    """
    # 空チェック
    if not why_nodes:
        return ""
    
    nodes_by_level: Dict[int, List['WhyNode']] = {}
    node_id_to_index: Dict[str, Tuple[int, int]] = {}
    mermaid_nodes: List[str] = []
    node_styles: List[str] = []
    
    why_nodes = {node_id: node for node_id, node in why_nodes.items() if node}  # None値を除外

    for node_id, node in why_nodes.items():
        level = node.level
        
        # レベルごとのノードリスト初期化
        if level not in nodes_by_level:
            nodes_by_level[level] = []
            
        # このノードのインデックスを記録
        index = len(nodes_by_level[level])
        nodes_by_level[level].append(node)
        node_id_to_index[node.id] = (level, index)
        
        # Mermaidノード定義
        mermaid_node_id = f"L{level}N{index}"
        node_color = "fill:#50C878" if node.is_root_cause else "fill:#6495ED"
        
        # 確信度テキスト
        confidence_text = ""
        if level > 0:  # レベル0が問題、レベル1以上が原因の想定
            confidence_value = (f"{node.root_cause_confidence:.0%}" 
                             if isinstance(node.root_cause_confidence, float) 
                             else f"{float(node.root_cause_confidence):.0%}")
            confidence_text = f"<br>確信度: {confidence_value}"
        
        # ノード定義をリストに追加
        mermaid_nodes.append(
            f"    {mermaid_node_id}[\"{node.name}{confidence_text}\"]:::{mermaid_node_id}Style"
        )
        
        # スタイル定義をリストに追加
        stroke_color = ",stroke:#2E8B57" if node.is_root_cause else ",stroke:#4169E1"
        node_styles.append(
            f"    classDef {mermaid_node_id}Style {node_color}{stroke_color},stroke-width:2px,color:white,border-radius:8px,font-size:20px"
        )
    
    # 接続を定義
    connections = []
    for node_id, node in why_nodes.items():
        if node.parent_id and node.parent_id in why_nodes:
            if node.parent_id in node_id_to_index and node.id in node_id_to_index:
                parent_level, parent_idx = node_id_to_index[node.parent_id]
                child_level, child_idx = node_id_to_index[node.id]
                connections.append(
                    f"    L{parent_level}N{parent_idx} --> L{child_level}N{child_idx}"
                )
    
    # Mermaidコードの組み立て
    mermaid_code = "flowchart TD\n"
    mermaid_code += "\n".join(mermaid_nodes) + "\n"
    mermaid_code += "\n".join(connections) + "\n"
    mermaid_code += "\n".join(node_styles)
    
    # グラフ全体の設定
    mermaid_config = {
        'theme': 'dark',
        'themeVariables': {
            'fontSize': '20px',
            'fontFamily': 'Arial, sans-serif'
        }
    }
    
    return f"""%%{{init: {json.dumps(mermaid_config)}}}%%\n{mermaid_code}"""
