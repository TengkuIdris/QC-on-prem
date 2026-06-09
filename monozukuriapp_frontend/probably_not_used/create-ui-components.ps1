# Define the base directory for ui components
$BASE_DIR = "./src/components/ui"

# Define the components and their files
$COMPONENTS = @{
    Button = "Button.tsx Button.test.tsx Button.stories.tsx Button.module.css"
    Input = "Input.tsx Input.test.tsx Input.stories.tsx Input.module.css"
    Modal = "Modal.tsx Modal.test.tsx Modal.stories.tsx Modal.module.css"
    Form = "Form.tsx Form.test.tsx Form.stories.tsx Form.module.css"
    Table = "Table.tsx Table.test.tsx Table.stories.tsx Table.module.css"
    Chart = "Chart.tsx Chart.test.tsx Chart.stories.tsx Chart.module.css"
    Card = "Card.tsx Card.test.tsx Card.stories.tsx Card.module.css"
    Dropdown = "Dropdown.tsx Dropdown.test.tsx Dropdown.stories.tsx Dropdown.module.css"
    Tooltip = "Tooltip.tsx Tooltip.test.tsx Tooltip.stories.tsx Tooltip.module.css"
    Spinner = "Spinner.tsx Spinner.test.tsx Spinner.stories.tsx Spinner.module.css"
    Breadcrumb = "Breadcrumb.tsx Breadcrumb.test.tsx Breadcrumb.stories.tsx Breadcrumb.module.css"
    Avatar = "Avatar.tsx Avatar.test.tsx Avatar.stories.tsx Avatar.module.css"
    Badge = "Badge.tsx Badge.test.tsx Badge.stories.tsx Badge.module.css"
    Alert = "Alert.tsx Alert.test.tsx Alert.stories.tsx Alert.module.css"
}

# Create directories and files
foreach ($COMPONENT in $COMPONENTS.Keys) {
    $COMPONENT_DIR = "$BASE_DIR/$COMPONENT"
    
    # Create the component directory
    if (-not (Test-Path -Path $COMPONENT_DIR)) {
        New-Item -ItemType Directory -Path $COMPONENT_DIR
    }
    
    # Create each file in the component directory if it does not exist
    foreach ($FILE in $COMPONENTS[$COMPONENT].Split(" ")) {
        $FILE_PATH = "$COMPONENT_DIR/$FILE"
        if (-not (Test-Path -Path $FILE_PATH)) {
            New-Item -ItemType File -Path $FILE_PATH
            Write-Output "Created $FILE_PATH"
        } else {
            Write-Output "Skipped $FILE_PATH (already exists)"
        }
    }
}

Write-Output "UI components structure created successfully."