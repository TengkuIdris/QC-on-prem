# PowerShellスクリプト: create_features_structure.ps1
# このスクリプトは、featuresディレクトリ内のフォルダやファイルを自動生成します。

# ベースディレクトリの設定
$baseDir = "src/features"

# フォルダとファイルのリスト
$structure = @(
    "pareto/components/ParetoChart.tsx",
    "pareto/components/ParetoControls.tsx",
    "pareto/hooks/useParetoData.ts",
    "pareto/services/paretoLambda.ts",
    "pareto/utils/paretoCalculations.ts",
    "pareto/types/pareto.d.ts",
    "pareto/selectors/paretoSelectors.ts",
    "pareto/ParetoPage.tsx",
    "pareto/paretoSlice.ts",
    "diagram/components/DiagramChart.tsx",
    "diagram/components/DiagramControls.tsx",
    "diagram/hooks/useDiagramData.ts",
    "diagram/services/diagramLambda.ts",
    "diagram/utils/diagramCalculations.ts",
    "diagram/types/diagram.d.ts",
    "diagram/selectors/diagramSelectors.ts",
    "diagram/DiagramPage.tsx",
    "diagram/diagramSlice.ts",
    "whywhy/components/WhyWhyChart.tsx",
    "whywhy/components/WhyWhyControls.tsx",
    "whywhy/hooks/useWhyWhyData.ts",
    "whywhy/services/whywhyLambda.ts",
    "whywhy/utils/whywhyCalculations.ts",
    "whywhy/types/whywhy.d.ts",
    "whywhy/selectors/whywhySelectors.ts",
    "whywhy/WhyWhyPage.tsx",
    "whywhy/whywhySlice.ts",
    "fta/components/FtaChart.tsx",
    "fta/components/FtaControls.tsx",
    "fta/hooks/useFtaData.ts",
    "fta/services/ftaLambda.ts",
    "fta/utils/ftaCalculations.ts",
    "fta/types/fta.d.ts",
    "fta/selectors/ftaSelectors.ts",
    "fta/FtaPage.tsx",
    "fta/ftaSlice.ts"
)

# ディレクトリとファイルの作成
foreach ($item in $structure) {
    $fullPath = Join-Path -Path $baseDir -ChildPath $item
    $dir = Split-Path -Parent $fullPath

    if (-Not (Test-Path $dir)) {
        Write-Output "Creating directory: $dir"
        New-Item -Path $dir -ItemType Directory
    }

    if (-Not (Test-Path $fullPath)) {
        Write-Output "Creating file: $fullPath"
        New-Item -Path $fullPath -ItemType File
    }
}

Write-Output "Directory and file structure creation completed."