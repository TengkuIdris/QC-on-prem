# PowerShellスクリプト: create_pages_structure.ps1
# このスクリプトは、pagesディレクトリ内のフォルダやファイルを自動生成します。

# ベースディレクトリの設定
$baseDir = "src/pages"

# フォルダとファイルのリスト
$structure = @(
    "HomePage/HomePage.tsx",
    "HomePage/HomePage.test.tsx",
    "HomePage/HomePage.stories.tsx",
    "UserPage/UserPage.tsx",
    "UserPage/UserPage.test.tsx",
    "UserPage/UserPage.stories.tsx",
    "YourProjectsPage/YourProjectsPage.tsx",
    "YourProjectsPage/YourProjectsPage.test.tsx",
    "YourProjectsPage/YourProjectsPage.stories.tsx",
    "SettingsPage/SettingsPage.tsx",
    "SettingsPage/SettingsPage.test.tsx",
    "SettingsPage/SettingsPage.stories.tsx"
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
