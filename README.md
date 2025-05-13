# Azkaban Workflow Designer

A web-based visual workflow designer for creating, editing, and managing Azkaban workflows. This application provides an intuitive drag-and-drop interface for building complex data processing pipelines.

Available on : https://codehopperreddit.github.io/azkaban_flow_gen/

## Features

### 🎨 Visual Workflow Design
- **Intuitive Node-Based Interface**: Create workflows using visual nodes and connections
- **Multiple Job Categories**: Support for various job types including:
  - Start/End jobs
  - Spark
  - Shell/Python scripts
  - Landing flows
  - Merge operations
- **Enhanced Connection Ports**: Highly visible connection points for easy linking between nodes
- **Real-time Property Inspector**: Edit node properties in real-time with a dedicated inspector panel

### 📂 File Operations
- **Save/Load Workflows**: Export workflows as JSON files for reuse
- **Job List Import**: Upload TXT files containing job names for batch creation
- **ZIP Project Import**: Import existing Azkaban projects from ZIP files with full dependency parsing
- **Smart Design Mode**: Automatically create landing flows when importing job lists

### 📊 Export Capabilities
- **Excel Export**: Generate spreadsheet documentation of your workflows
- **Azkaban Flow 2.0 Format**: Export directly to Azkaban's native format
- **Azkaban Project ZIP**: Create complete Azkaban project packages ready for deployment
- **Project Merging**: Combine multiple Azkaban projects into a single workflow

### ⚙️ Advanced Features
- **Undo/Redo Support**: Full command history with undo/redo functionality
- **Auto-Layout**: Intelligent automatic arrangement of workflow nodes
- **Configuration Management**: Customizable default settings and deployment targets
- **Job Templates**: Quick access to common job types (Start, End, Merge)

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No installation required - runs entirely in the browser

### Usage

1. **Open the Application**: Simply open the HTML file in your web browser
2. **Create Nodes**: Use the "Add Job" menu to add different types of nodes
3. **Connect Nodes**: Click and drag between the connection ports (green circles) to create links
4. **Edit Properties**: Click a node to select it and use the inspector panel to modify its properties
5. **Save Your Work**: Use File > Save Workflow to export your design as JSON

## Interface Overview

### Navbar
- **File Menu**: Save, load, import, and export operations
- **Edit Menu**: Standard editing operations (undo, redo, cut, copy, paste)
- **Add Job Menu**: Quick access to create new nodes
- **View Menu**: Layout and visualization options
- **Deploy Button**: Deploy workflows to configured targets
- **Rename End Job**: Toggle to automatically rename end jobs

### Main Canvas
- **Diagram Area**: Main workspace with grid background
- **Inspector Panel**: Properties editor for selected nodes
- **Connection Ports**: Enhanced green circles on each node for easy linking

### Supported File Formats

#### Import Formats
- **JSON**: Workflow Designer native format
- **TXT**: Simple job lists (one job per line)
- **ZIP**: Azkaban project archives

#### Export Formats
- **JSON**: Native workflow format
- **Excel**: Documentation spreadsheet
- **Azkaban Flow**: Flow 2.0 format
- **ZIP**: Complete Azkaban project package

## Configuration

Access the configuration editor via File > Edit Config to customize:
- Default job types
- Deployment targets
- Project descriptions
- Other application preferences

## Advanced Features

### Smart Design Mode
When importing job lists, enable Smart Design to automatically:
- Create a landing job at the beginning
- Connect all imported jobs to the landing job
- Add proper start and end jobs
- Apply intelligent layout

### Job Categories and Colors
- **Start Jobs** (Green): Entry points for workflows
- **End Jobs** (Red): Workflow termination points
- **Normal Jobs** (White): General purpose jobs
- **Spark Jobs** (Blue): Spark processing tasks
- **Shell Jobs** (Purple): Shell script execution
- **Python Jobs** (Orange): Python script execution
- **Landing Jobs** (Cyan): Data landing operations
- **Merge Jobs** (Brown): Data merge operations

### Keyboard Shortcuts
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Ctrl+C**: Copy selection
- **Ctrl+V**: Paste selection
- **Ctrl+X**: Cut selection
- **Delete**: Delete selection

## Tips and Best Practices

1. **Use Descriptive Names**: Give your jobs meaningful names for better organization
2. **Color Code by Function**: Take advantage of categories to visually group related jobs
3. **Add Comments**: Use the comments field to document job purposes and configurations
4. **Test Layouts**: Use the auto-layout feature to optimize your workflow visualization
5. **Save Frequently**: Export your work regularly to prevent data loss
6. **Use Templates**: Start with predefined job types and customize as needed

## Troubleshooting

### Common Issues
- **Links won't connect**: Ensure you're dragging from one port to another
- **Properties not updating**: Click outside the inspector field to apply changes
- **File import errors**: Check that your files are in the correct format
- **Layout issues**: Try the auto-arrange feature from the View menu



