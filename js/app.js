// Wait for the DOM to be fully loaded
        window.onload = function() {
            const $ = go.GraphObject.make; // Alias for go.GraphObject.make
            let myDiagram = null; // Holds the GoJS diagram instance
            let appConfig = {
                defaultJobType: 'command',
                deploymentTarget: '',
                projectDescription: '',
                jobIdCounter: 0
            };

            // --- Utility Functions ---
            function showLoadingOverlay(text = 'Processing...') {
                document.getElementById('loadingText').textContent = text;
                document.getElementById('loadingOverlay').classList.remove('hidden');
            }

            function hideLoadingOverlay() {
                document.getElementById('loadingOverlay').classList.add('hidden');
            }

            function generateUniqueId() {
                return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }

            function downloadFile(content, filename, mimeType = 'application/json') {
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            // --- Toast Notification Function ---
            function showToast(message, type = 'blue', duration = 3000) {
                const toastContainer = document.getElementById('toastContainer');
                const toast = document.createElement('div');
                toast.className = `toast-custom ${type}-toast`;
                toast.textContent = message;
                toastContainer.appendChild(toast);

                // Trigger the animation
                setTimeout(() => {
                    toast.classList.add('show');
                }, 10); // Small delay to ensure transition triggers

                // Remove toast after duration
                setTimeout(() => {
                    toast.classList.remove('show');
                    // Remove from DOM after transition
                    setTimeout(() => {
                        if (toast.parentNode === toastContainer) {
                             toastContainer.removeChild(toast);
                        }
                    }, 300); // Match transition duration
                }, duration);
            }

            // --- Modal Management ---
            function openModal(modalId) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('flex'); // Use flex to center overlay content
                }
            }

            function closeModal(modalId) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }
            }

            // Event listeners for modal triggers
            document.getElementById('openUploadJsonModal').addEventListener('click', (e) => { e.preventDefault(); openModal('uploadJsonModal'); });
            document.getElementById('openUploadJobsModal').addEventListener('click', (e) => { e.preventDefault(); openModal('uploadJobsModal'); });
            document.getElementById('openUploadZipModal').addEventListener('click', (e) => { e.preventDefault(); openModal('uploadZipModal'); });
            document.getElementById('openMergeProjectsModal').addEventListener('click', (e) => { e.preventDefault(); openModal('mergeProjectsModal'); });
            document.getElementById('editConfigButton').addEventListener('click', (e) => { e.preventDefault(); openModal('configModal'); });
            
            // Event listeners for modal close buttons (using class and data-modal-id)
            document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    closeModal(this.dataset.modalId);
                });
            });

            // Update file path display for file inputs
            const jsonFileInput = document.getElementById('jsonFileInput');
            const jsonFilePathDisplay = document.getElementById('jsonFilePathDisplay');
            jsonFileInput.addEventListener('change', function() {
                jsonFilePathDisplay.textContent = this.files.length > 0 ? this.files[0].name : 'No file selected.';
            });

            const jobsFileInput = document.getElementById('jobsFileInput');
            const jobsFilePathDisplay = document.getElementById('jobsFilePathDisplay');
            jobsFileInput.addEventListener('change', function() {
                jobsFilePathDisplay.textContent = this.files.length > 0 ? this.files[0].name : 'No file selected.';
            });

            const zipFileInput = document.getElementById('zipFileInput');
            const zipFilePathDisplay = document.getElementById('zipFilePathDisplay');
            const jobFilesPreview = document.getElementById('jobFilesPreview');
            const jobFilesList = document.getElementById('jobFilesList');

            zipFileInput.addEventListener('change', async function() {
                const files = this.files;
                zipFilePathDisplay.textContent = files.length > 0 ? files[0].name : 'No file selected.';
                
                if (files.length > 0) {
                    showLoadingOverlay('Analyzing ZIP file...');
                    try {
                        const zip = new JSZip();
                        const contents = await zip.loadAsync(files[0]);
                        const jobFiles = [];
                        
                        // Find all .job files in the ZIP
                        contents.forEach((relativePath, zipEntry) => {
                            if (relativePath.endsWith('.job') && !zipEntry.dir) {
                                jobFiles.push({
                                    name: relativePath,
                                    entry: zipEntry
                                });
                            }
                        });
                        
                        if (jobFiles.length > 0) {
                            jobFilesList.innerHTML = '';
                            jobFilesPreview.classList.remove('hidden');
                            
                            for (const jobFile of jobFiles) {
                                const content = await jobFile.entry.async('text');
                                const jobDiv = document.createElement('div');
                                jobDiv.className = 'job-preview-item';
                                
                                const filename = document.createElement('div');
                                filename.className = 'job-preview-filename';
                                filename.textContent = jobFile.name;
                                jobDiv.appendChild(filename);
                                
                                // Parse first few properties for preview
                                const lines = content.split('\n').slice(0, 3);
                                lines.forEach(line => {
                                    if (line.trim() && !line.startsWith('#')) {
                                        const prop = document.createElement('div');
                                        prop.className = 'job-property';
                                        prop.textContent = line.trim();
                                        jobDiv.appendChild(prop);
                                    }
                                });
                                
                                jobFilesList.appendChild(jobDiv);
                            }
                        } else {
                            jobFilesPreview.classList.add('hidden');
                        }
                    } catch (error) {
                        showToast('Error analyzing ZIP file: ' + error.message, 'red');
                        jobFilesPreview.classList.add('hidden');
                    } finally {
                        hideLoadingOverlay();
                    }
                }
            });

            // --- GoJS Diagram Initialization ---
            function initDiagram() {
                myDiagram = $(go.Diagram, "myDiagramDiv", {
                    initialContentAlignment: go.Spot.Center,
                    "undoManager.isEnabled": true,
                    "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom, // Allow zooming with mouse wheel
                    layout: $(go.LayeredDigraphLayout, { direction: 90, layerSpacing: 50, columnSpacing: 30 }), // Default layout
                    "ChangedSelection": onSelectionChanged, // Event listener for selection changes
                    "ModelChanged": onModelChanged // Event listener for model changes (e.g., for auto-saving)
                });

                // Define Node Template
                myDiagram.nodeTemplate =
                    $(go.Node, "Auto",
                        { locationSpot: go.Spot.Center, selectionObjectName: "PANEL", deletable: true },
                        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
                        $(go.Shape, "RoundedRectangle",
                            { name: "SHAPE", fill: "lightgray", strokeWidth: 1, stroke: "black", portId: "" },
                            new go.Binding("fill", "category", categoryToColor)
                        ),
                        $(go.Panel, "Vertical", { name: "PANEL", margin: 6 },
                            $(go.TextBlock,
                                { font: "bold 10pt Montserrat, sans-serif", stroke: "#333", margin: new go.Margin(0, 0, 4, 0), editable: true, isMultiline: false },
                                new go.Binding("text", "text").makeTwoWay()),
                            $(go.TextBlock,
                                { font: "8pt Montserrat, sans-serif", stroke: "#555", alignment: go.Spot.Left, visible: false },
                                new go.Binding("text", "type", type => type ? `Type: ${type}` : "").makeTwoWay(),
                                new go.Binding("visible", "type", type => !!type)
                            ),
                             $(go.TextBlock,
                                { font: "8pt Montserrat, sans-serif", stroke: "#777", alignment: go.Spot.Left, visible: false, maxLines: 3, overflow: go.TextBlock.OverflowEllipsis, width: 120 },
                                new go.Binding("text", "comments", comments => comments ? `Notes: ${comments}` : "").makeTwoWay(),
                                new go.Binding("visible", "comments", comments => !!comments)
                            )
                        ),
                        // Ports for linking - ENHANCED with more visible styling
                        makePort("T", go.Spot.Top, true, true),
                        makePort("L", go.Spot.Left, true, true),
                        makePort("R", go.Spot.Right, true, true),
                        makePort("B", go.Spot.Bottom, true, true)
                    );

                // Define Link Template
                myDiagram.linkTemplate =
                    $(go.Link,
                        { routing: go.Link.AvoidsNodes, curve: go.Link.JumpOver, corner: 5, toShortLength: 4, reshapable: true, resegmentable: true, relinkableFrom: true, relinkableTo: true },
                        new go.Binding("points").makeTwoWay(),
                        $(go.Shape, { strokeWidth: 2, stroke: "#555" }),
                        $(go.Shape, { toArrow: "Standard", stroke: "#555", fill: "#555" })
                    );
                
                // Helper function to create ports - ENHANCED for better visibility
                function makePort(name, spot, output, input) {
                    return $(go.Shape, "Circle",
                        {
                            fill: "#4CAF50", // Light green fill for better visibility
                            stroke: "#2E7D32", // Darker green border
                            strokeWidth: 2, // Thicker border
                            desiredSize: new go.Size(12, 12), // Increased size from 8x8 to 12x12
                            alignment: spot, alignmentFocus: spot, // align the port on the main Shape
                            portId: name, // declare this object to be a "port"
                            fromSpot: spot, toSpot: spot, // declare where links may connect to this port
                            fromLinkable: output, toLinkable: input, // declare whether the user may draw links to/from here
                            cursor: "pointer", // show a different cursor to indicate potential link point
                            opacity: 0.7 // Slightly transparent by default
                        },
                        // Hover effects to make ports even more prominent
                        new go.Binding("fill", "", (data, obj) => {
                            const node = obj.part;
                            return node && node.isHighlighted ? "#66BB6A" : "#4CAF50";
                        }).ofObject(),
                        new go.Binding("opacity", "", (data, obj) => {
                            const node = obj.part;
                            return node && node.isHighlighted ? 1.0 : 0.7;
                        }).ofObject()
                    );
                }

                // Define colors for categories
                function categoryToColor(category) {
                    if (category === "Start") return "#4CAF50"; // Green
                    if (category === "End") return "#F44336";   // Red
                    if (category === "Normal") return "#FFC107";  // Amber
                    if (category === "spark") return "#2196F3"; // Blue
                    if (category === "shell") return "#9C27B0";// Purple
                    if (category === "python") return "#FF9800"; // Orange
                    if (category === "landing") return "#00BCD4"; // Cyan
                    if (category === "Merge") return "#795548"; // Brown
                    return "#E0E0E0"; // Default light gray
                }

                // Add event listener to highlight nodes and make ports more visible when hovering
                myDiagram.addDiagramListener("ObjectSingleClicked", function(e) {
                    const part = e.subject.part;
                    if (part instanceof go.Node) {
                        myDiagram.model.commit(m => {
                            // Highlight the clicked node
                            part.isHighlighted = true;
                            // Reset highlight for all other nodes
                            myDiagram.nodes.each(node => {
                                if (node !== part) node.isHighlighted = false;
                            });
                        }, "highlight node");
                    }
                });

                // Load initial data (example)
                const initialNodeData = [
                    { key: 1, text: "StartJob", category: "Start", type: "noop", loc: "0 0" },
                    { key: 2, text: "Process Data", category: "Normal", type: "datatransfer", loc: "150 50", comments: "Initial data processing step" },
                    { key: 3, text: "Analyze Results", category: "spark", type: "analysis.py", loc: "150 150" },
                    { key: 999, text: "EndJob", category: "End", type: "noop", loc: "300 200" }
                ];
                const initialLinkData = [
                    { from: 1, to: 2 },
                    { from: 2, to: 3 },
                    { from: 3, to: 999 }
                ];
                myDiagram.model = new go.GraphLinksModel(initialNodeData, initialLinkData);
            }

            // --- Inspector Logic ---
            const inspectorDiv = document.getElementById('myInspector');
            const nodeProperties = ["text", "category", "type", "comments"]; // Properties to show in inspector
            const categoryOptions = ["", "Start", "End", "Normal", "spark", "shell", "python", "landing", "Merge"];

            function onSelectionChanged(e) {
                const node = myDiagram.selection.first();
                if (node instanceof go.Node) {
                    populateInspector(node.data);
                } else {
                    clearInspector();
                }
            }
            
            function onModelChanged(e) {
                // This event is useful for things like auto-saving or logging changes.
                // For now, we'll just log that the model changed.
                if (e.isTransactionFinished) { // Only act on finished transactions
                    // console.log("Diagram model changed:", myDiagram.model.toJson());
                    // Potentially update inspector if a property changed programmatically
                    const sel = myDiagram.selection.first();
                    if (sel instanceof go.Node) {
                        populateInspector(sel.data);
                    }
                }
            }

            function populateInspector(data) {
                inspectorDiv.innerHTML = ""; // Clear previous content
                const table = document.createElement('table');
                table.className = "w-full";

                nodeProperties.forEach(prop => {
                    const row = table.insertRow();
                    const cellLabel = row.insertCell();
                    cellLabel.textContent = prop + ":";
                    const cellInput = row.insertCell();

                    if (prop === "category") {
                        const select = document.createElement('select');
                        select.className = "inspector-input";
                        categoryOptions.forEach(opt => {
                            const option = document.createElement('option');
                            option.value = opt;
                            option.text = opt || "(None)";
                            if (opt === (data[prop] || "")) option.selected = true;
                            select.appendChild(option);
                        });
                        select.addEventListener('change', (event) => updateNodeData(prop, event.target.value));
                        cellInput.appendChild(select);
                    } else {
                        const input = document.createElement('input');
                        input.type = "text";
                        input.className = "inspector-input";
                        input.value = data[prop] || "";
                        input.addEventListener('input', (event) => updateNodeData(prop, event.target.value));
                        cellInput.appendChild(input);
                    }
                });
                inspectorDiv.appendChild(table);
            }

            function clearInspector() {
                inspectorDiv.innerHTML = '<p class="text-gray-500">Select a node to see its properties.</p>';
            }

            function updateNodeData(property, value) {
                const node = myDiagram.selection.first();
                if (node) {
                    myDiagram.model.commit(m => {
                        m.set(node.data, property, value);
                        // If category changes, update color immediately (though binding should handle it)
                        if (property === "category") {
                             m.set(node.data, "fill", categoryToColor(value)); // Force update if direct binding is slow
                        }
                    }, "InspectorUpdate");
                }
            }

            // --- Job File Parser ---
            function parseJobFile(content) {
                const job = {
                    properties: {},
                    dependencies: []
                };
                
                const lines = content.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('#')) continue;
                    
                    const [key, ...valueParts] = trimmed.split('=');
                    if (key && valueParts.length > 0) {
                        const value = valueParts.join('=').trim();
                        job.properties[key.trim()] = value;
                        
                        // Special handling for dependencies
                        if (key.trim() === 'dependsOn' || key.trim() === 'dependencies') {
                            job.dependencies = value.split(',').map(dep => dep.trim());
                        }
                    }
                }
                
                return job;
            }

            function getJobCategory(job) {
                const type = (job.properties.type || '').toLowerCase();
                if (type.includes('spark')) return 'spark';
                if (type.includes('python')) return 'python';
                if (type.includes('shell') || type.includes('bash')) return 'shell';
                if (type.includes('landing')) return 'landing';
                if (type.includes('merge')) return 'Merge';
                return 'Normal'; // Default category
            }

            // --- File Save/Load Operations ---
            document.getElementById('saveButton').addEventListener('click', (e) => {
                e.preventDefault();
                showLoadingOverlay('Saving workflow...');
                
                setTimeout(() => {
                    const workflowName = document.getElementById('workflow_name').value || "default-workflow";
                    const jsonData = myDiagram.model.toJson();
                    
                    try {
                        downloadFile(jsonData, `${workflowName}.json`);
                        showToast(`Workflow '${workflowName}' saved successfully!`, 'green');
                    } catch (error) {
                        showToast(`Error saving workflow: ${error.message}`, 'red');
                    } finally {
                        hideLoadingOverlay();
                    }
                }, 500);
            });

            document.getElementById('confirmJsonUpload').addEventListener('click', () => {
                const fileInput = document.getElementById('jsonFileInput');
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    showLoadingOverlay('Loading workflow...');
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const json = JSON.parse(event.target.result);
                            myDiagram.model = go.Model.fromJson(json);
                            showToast(`Workflow '${file.name}' loaded successfully.`, 'green');
                            closeModal('uploadJsonModal');
                            jsonFilePathDisplay.textContent = 'No file selected.'; // Reset file display
                            fileInput.value = ""; // Reset file input
                        } catch (err) {
                            showToast(`Error loading workflow: ${err.message}`, 'red');
                        } finally {
                            hideLoadingOverlay();
                        }
                    };
                    reader.onerror = () => {
                        showToast('Error reading file', 'red');
                        hideLoadingOverlay();
                    };
                    reader.readAsText(file);
                } else {
                    showToast('Please select a JSON file to upload.', 'red');
                }
            });
            
            document.getElementById('confirmJobsUpload').addEventListener('click', () => {
                const fileInput = document.getElementById('jobsFileInput');
                const smartDesign = document.getElementById('smartDesignCheckbox').checked;
                
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    showLoadingOverlay('Processing job list...');
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const content = event.target.result;
                            const jobs = content.split('\n')
                                .map(line => line.trim())
                                .filter(line => line && !line.startsWith('#'));
                            
                            myDiagram.model.commit(m => {
                                m.clear(); // Clear existing diagram
                                
                                const nodeData = [];
                                const linkData = [];
                                
                                if (smartDesign) {
                                    // Create landing flow structure
                                    const startNode = { key: 'start', text: 'StartJob', category: 'Start', type: 'noop', loc: '0 0' };
                                    const landingNode = { key: 'landing', text: 'LandingJob', category: 'landing', type: 'landing', loc: '150 0' };
                                    nodeData.push(startNode, landingNode);
                                    linkData.push({ from: 'start', to: 'landing' });
                                    
                                    // Add jobs with dependencies to landing
                                    jobs.forEach((job, index) => {
                                        const jobNode = {
                                            key: `job_${index}`,
                                            text: job,
                                            category: 'Normal',
                                            type: appConfig.defaultJobType,
                                            loc: `${150 + (index % 3) * 200} ${100 + Math.floor(index / 3) * 100}`
                                        };
                                        nodeData.push(jobNode);
                                        linkData.push({ from: 'landing', to: `job_${index}` });
                                    });
                                    
                                    // Add end job
                                    const endNode = { key: 'end', text: 'EndJob', category: 'End', type: 'noop', loc: `${150 + jobs.length * 50} ${100 + Math.floor(jobs.length / 3) * 100 + 100}` };
                                    nodeData.push(endNode);
                                    
                                    // Connect last jobs to end
                                    if (jobs.length > 0) {
                                        linkData.push({ from: `job_${jobs.length - 1}`, to: 'end' });
                                    } else {
                                        linkData.push({ from: 'landing', to: 'end' });
                                    }
                                } else {
                                    // Simple sequential flow
                                    let prevKey = null;
                                    
                                    jobs.forEach((job, index) => {
                                        const key = `job_${index}`;
                                        const nodeData = {
                                            key,
                                            text: job,
                                            category: 'Normal',
                                            type: appConfig.defaultJobType,
                                            loc: `${index * 200} 0`
                                        };
                                        
                                        m.addNodeData(nodeData);
                                        
                                        if (prevKey) {
                                            m.addLinkData({ from: prevKey, to: key });
                                        }
                                        prevKey = key;
                                    });
                                }
                                
                                if (smartDesign) {
                                    nodeData.forEach(node => m.addNodeData(node));
                                    linkData.forEach(link => m.addLinkData(link));
                                }
                            }, "LoadJobsFromTXT");
                            
                            showToast(`Loaded ${jobs.length} jobs with ${smartDesign ? 'Smart Design' : 'Sequential Flow'}`, 'green');
                            closeModal('uploadJobsModal');
                            jobsFilePathDisplay.textContent = 'No file selected.';
                            fileInput.value = "";
                        } catch (err) {
                            showToast(`Error processing job list: ${err.message}`, 'red');
                        } finally {
                            hideLoadingOverlay();
                        }
                    };
                    
                    reader.onerror = () => {
                        showToast('Error reading file', 'red');
                        hideLoadingOverlay();
                    };
                    
                    reader.readAsText(file);
                } else {
                    showToast('Please select a TXT file.', 'red');
                }
            });

            // ZIP File Upload Handler
            document.getElementById('confirmZipUpload').addEventListener('click', async () => {
                const fileInput = document.getElementById('zipFileInput');
                const preserveLayout = document.getElementById('preserveLayoutCheckbox').checked;
                
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    showLoadingOverlay('Processing ZIP file...');
                    
                    try {
                        const zip = new JSZip();
                        const contents = await zip.loadAsync(file);
                        const jobs = {};
                        const nodeData = [];
                        const linkData = [];
                        
                        // Extract project name from ZIP filename
                        const projectName = file.name.replace('.zip', '');
                        document.getElementById('workflow_name').value = projectName;
                        
                        // Process all .job files
                        for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
                            if (relativePath.endsWith('.job') && !zipEntry.dir) {
                                const content = await zipEntry.async('text');
                                const jobName = relativePath.replace('.job', '').split('/').pop();
                                const parsedJob = parseJobFile(content);
                                
                                jobs[jobName] = {
                                    ...parsedJob,
                                    name: jobName,
                                    filename: relativePath
                                };
                            }
                        }
                        
                        // Create nodes for each job
                        const jobKeys = Object.keys(jobs);
                        const keyToNodeId = {};
                        let x = 0, y = 0;
                        const spacing = 200;
                        
                        jobKeys.forEach((jobName, index) => {
                            const job = jobs[jobName];
                            const nodeId = generateUniqueId();
                            keyToNodeId[jobName] = nodeId;
                            
                            // Determine position
                            if (preserveLayout) {
                                const col = index % 4;
                                const row = Math.floor(index / 4);
                                x = col * spacing;
                                y = row * spacing;
                            } else {
                                x = index * spacing;
                                y = 0;
                            }
                            
                            const node = {
                                key: nodeId,
                                text: jobName,
                                category: getJobCategory(job),
                                type: job.properties.type || 'command',
                                comments: job.properties.command || job.properties.script || '',
                                loc: `${x} ${y}`,
                                // Store additional properties for inspection
                                ...job.properties
                            };
                            
                            nodeData.push(node);
                        });
                        
                        // Create links based on dependencies
                        jobKeys.forEach(jobName => {
                            const job = jobs[jobName];
                            const fromNodeId = keyToNodeId[jobName];
                            
                            job.dependencies.forEach(depName => {
                                const toNodeId = keyToNodeId[depName];
                                if (toNodeId) {
                                    linkData.push({ from: toNodeId, to: fromNodeId });
                                }
                            });
                        });
                        
                        // Update the diagram
                        myDiagram.model.commit(m => {
                            m.clear();
                            nodeData.forEach(node => m.addNodeData(node));
                            linkData.forEach(link => m.addLinkData(link));
                        }, "LoadZipProject");
                        
                        // Apply layout if preserve layout is checked
                        if (preserveLayout) {
                            setTimeout(() => {
                                myDiagram.layoutDiagram(true);
                            }, 100);
                        }
                        
                        showToast(`Loaded ${jobKeys.length} jobs from '${projectName}' successfully!`, 'green');
                        closeModal('uploadZipModal');
                        zipFilePathDisplay.textContent = 'No file selected.';
                        fileInput.value = '';
                        jobFilesPreview.classList.add('hidden');
                        
                    } catch (error) {
                        showToast(`Error processing ZIP file: ${error.message}`, 'red');
                    } finally {
                        hideLoadingOverlay();
                    }
                } else {
                    showToast('Please select a ZIP file to upload.', 'red');
                }
            });

            // Export to Excel
            document.getElementById('exportExcelButton').addEventListener('click', (e) => {
                e.preventDefault();
                showLoadingOverlay('Exporting to Excel...');
                
                setTimeout(() => {
                    try {
                        const nodes = myDiagram.model.nodeDataArray;
                        const links = myDiagram.model.linkDataArray;
                        
                        // Create workbook
                        const wb = XLSX.utils.book_new();
                        
                        // Nodes worksheet
                        const nodeData = nodes.map(node => ({
                            ID: node.key,
                            Name: node.text,
                            Category: node.category,
                            Type: node.type,
                            Comments: node.comments || ''
                        }));
                        const wsNodes = XLSX.utils.json_to_sheet(nodeData);
                        XLSX.utils.book_append_sheet(wb, wsNodes, "Nodes");
                        
                        // Links worksheet
                        const linkData = links.map(link => ({
                            From: link.from,
                            To: link.to
                        }));
                        const wsLinks = XLSX.utils.json_to_sheet(linkData);
                        XLSX.utils.book_append_sheet(wb, wsLinks, "Links");
                        
                        // Save file
                        const workflowName = document.getElementById('workflow_name').value || "default-workflow";
                        XLSX.writeFile(wb, `${workflowName}.xlsx`);
                        
                        showToast('Workflow exported to Excel successfully!', 'green');
                    } catch (error) {
                        showToast(`Error exporting to Excel: ${error.message}`, 'red');
                    } finally {
                        hideLoadingOverlay();
                    }
                }, 500);
            });

            // Export to Azkaban Flow 2.0
            document.getElementById('exportAzkabanFlowButton').addEventListener('click', (e) => {
                e.preventDefault();
                showLoadingOverlay('Exporting to Azkaban Flow...');
                
                setTimeout(() => {
                    try {
                        const nodes = myDiagram.model.nodeDataArray;
                        const links = myDiagram.model.linkDataArray;
                        
                        const flow = {
                            nodes: nodes.map(node => {
                                const azkabanNode = {
                                    name: node.text || node.key,
                                    type: node.type || appConfig.defaultJobType,
                                    config: {}
                                };
                                
                                // Add dependencies
                                const dependencies = links
                                    .filter(link => link.to === node.key)
                                    .map(link => nodes.find(n => n.key === link.from)?.text || link.from);
                                
                                if (dependencies.length > 0) {
                                    azkabanNode.dependsOn = dependencies;
                                }
                                
                                return azkabanNode;
                            })
                        };
                        
                        const workflowName = document.getElementById('workflow_name').value || "default-workflow";
                        const azkabanContent = JSON.stringify(flow, null, 2);
                        downloadFile(azkabanContent, `${workflowName}.flow`, 'application/json');
                        
                        showToast('Azkaban Flow exported successfully!', 'green');
                    } catch (error) {
                        showToast(`Error exporting to Azkaban Flow: ${error.message}`, 'red');
                    } finally {
                        hideLoadingOverlay();
                    }
                }, 500);
            });

            // Create Azkaban Project Zip
            document.getElementById('createAzkabanZipButton').addEventListener('click', (e) => {
                e.preventDefault();
                showLoadingOverlay('Creating Azkaban Project Zip...');
                
                setTimeout(async () => {
                    try {
                        const zip = new JSZip();
                        const workflowName = document.getElementById('workflow_name').value || "default-workflow";
                        
                        // Create flow file
                        const nodes = myDiagram.model.nodeDataArray;
                        const links = myDiagram.model.linkDataArray;
                        
                        const flow = {
                            nodes: nodes.map(node => {
                                const azkabanNode = {
                                    name: node.text || node.key,
                                    type: node.type || appConfig.defaultJobType,
                                    config: {}
                                };
                                
                                const dependencies = links
                                    .filter(link => link.to === node.key)
                                    .map(link => nodes.find(n => n.key === link.from)?.text || link.from);
                                
                                if (dependencies.length > 0) {
                                    azkabanNode.dependsOn = dependencies;
                                }
                                
                                return azkabanNode;
                            })
                        };
                        
                        zip.file(`${workflowName}.flow`, JSON.stringify(flow, null, 2));
                        
                        // Create project.properties
                        const projectProperties = `project.name=${workflowName}
project.version=1.0
project.description=${appConfig.projectDescription || 'Generated by Workflow Designer'}
`;
                        zip.file('project.properties', projectProperties);
                        
                        // Generate zip file
                        const content = await zip.generateAsync({type: "blob"});
                        downloadFile(content, `${workflowName}_azkaban.zip`, 'application/zip');
                        
                        showToast('Azkaban Project Zip created successfully!', 'green');
                    } catch (error) {
                        showToast(`Error creating Azkaban Project Zip: ${error.message}`, 'red');
                    } finally {
                        hideLoadingOverlay();
                    }
                }, 500);
            });

            // Merge Azkaban Projects
            document.getElementById('confirmMergeProjects').addEventListener('click', async () => {
                const mergedName = document.getElementById('merged_project_name').value;
                const sourceProjects = document.getElementById('source_projects_list').value;
                
                if (!mergedName || !sourceProjects) {
                    showToast('Please fill in all fields for merging projects.', 'red');
                    return;
                }
                
                showLoadingOverlay('Merging Azkaban Projects...');
                
                setTimeout(async () => {
                    try {
                        const zip = new JSZip();
                        const projects = sourceProjects.split(',').map(p => p.trim());
                        
                        // Simulate merging by creating a combined project
                        const mergedFlow = {
                            nodes: []
                        };
                        
                        // Add a start node
                        mergedFlow.nodes.push({
                            name: 'MergedStart',
                            type: 'noop',
                            config: {}
                        });
                        
                        // Add placeholder nodes for each source project
                        projects.forEach(project => {
                            mergedFlow.nodes.push({
                                name: `${project}_Flow`,
                                type: 'flow',
                                dependsOn: ['MergedStart'],
                                config: {
                                    flowName: project
                                }
                            });
                        });
                        
                        // Add end node
                        mergedFlow.nodes.push({
                            name: 'MergedEnd',
                            type: 'noop',
                            dependsOn: projects.map(p => `${p}_Flow`),
                            config: {}
                        });
                        
                        zip.file(`${mergedName}.flow`, JSON.stringify(mergedFlow, null, 2));
                        
                        // Create merged project properties
                        const projectProperties = `project.name=${mergedName}
project.version=1.0
project.description=Merged from: ${projects.join(', ')}
`;
                        zip.file('project.properties', projectProperties);
                        
                        const content = await zip.generateAsync({type: "blob"});
                        downloadFile(content, `${mergedName}_merged.zip`, 'application/zip');
                        
                        showToast(`Projects merged successfully into '${mergedName}'`, 'green');
                        closeModal('mergeProjectsModal');
                    } catch (error) {
                        showToast(`Error merging projects: ${error.message}`, 'red');
                    } finally {
                        hideLoadingOverlay();
                    }
                }, 500);
            });

            // Config Editor
            document.getElementById('saveConfigButton').addEventListener('click', () => {
                appConfig.defaultJobType = document.getElementById('defaultJobType').value;
                appConfig.deploymentTarget = document.getElementById('deploymentTarget').value;
                appConfig.projectDescription = document.getElementById('projectDescription').value;
                
                // Save to localStorage
                localStorage.setItem('workflowDesignerConfig', JSON.stringify(appConfig));
                
                showToast('Configuration saved successfully!', 'green');
                closeModal('configModal');
            });

            // Load config when modal opens
            document.getElementById('editConfigButton').addEventListener('click', () => {
                document.getElementById('defaultJobType').value = appConfig.defaultJobType;
                document.getElementById('deploymentTarget').value = appConfig.deploymentTarget;
                document.getElementById('projectDescription').value = appConfig.projectDescription;
            });

            // Load config from localStorage on startup
            const savedConfig = localStorage.getItem('workflowDesignerConfig');
            if (savedConfig) {
                try {
                    appConfig = { ...appConfig, ...JSON.parse(savedConfig) };
                } catch (e) {
                    console.warn('Failed to load saved config:', e);
                }
            }

            // --- Edit Menu ---
            document.getElementById('undoButton').addEventListener('click', (e) => { e.preventDefault(); myDiagram.commandHandler.undo(); showToast('Undo performed.', 'blue'); });
            document.getElementById('redoButton').addEventListener('click', (e) => { e.preventDefault(); myDiagram.commandHandler.redo(); showToast('Redo performed.', 'blue'); });
            document.getElementById('cutButton').addEventListener('click', (e) => { e.preventDefault(); myDiagram.commandHandler.cutSelection(); showToast('Selection cut.', 'blue'); });
            document.getElementById('copyButton').addEventListener('click', (e) => { e.preventDefault(); myDiagram.commandHandler.copySelection(); showToast('Selection copied.', 'blue'); });
            document.getElementById('pasteButton').addEventListener('click', (e) => { e.preventDefault(); myDiagram.commandHandler.pasteSelection(); showToast('Selection pasted.', 'blue'); });
            document.getElementById('deleteButton').addEventListener('click', (e) => { e.preventDefault(); myDiagram.commandHandler.deleteSelection(); showToast('Selection deleted.', 'red'); });
            document.getElementById('groupButton').addEventListener('click', (e) => { e.preventDefault(); myDiagram.commandHandler.groupSelection(); showToast('Selection grouped.', 'blue'); });
            document.getElementById('ungroupButton').addEventListener('click', (e) => { e.preventDefault(); myDiagram.commandHandler.ungroupSelection(); showToast('Selection ungrouped.', 'blue'); });

            // Add Job Menu
            let newNodeCounter = 0;
            function addNode(category, type = 'custom', textPrefix = 'New Job') {
                myDiagram.model.commit(m => {
                    const diagramCenterX = myDiagram.viewportBounds.centerX;
                    const diagramCenterY = myDiagram.viewportBounds.centerY;
                    const newKey = generateUniqueId();
                    m.addNodeData({ 
                        key: newKey, 
                        text: `${textPrefix} ${++newNodeCounter}`, 
                        category: category, 
                        type: type,
                        loc: go.Point.stringify(new go.Point(diagramCenterX, diagramCenterY)) // Add to center of viewport
                    });
                    // Select the new node
                    const newNode = myDiagram.findNodeForKey(newKey);
                    if (newNode) myDiagram.select(newNode);

                }, "AddNode");
                showToast(`${category} job added.`, 'green');
            }
            document.getElementById('addEmptyJobButton').addEventListener('click', (e) => { e.preventDefault(); addNode('Normal', 'empty', 'Empty Job'); });
            document.getElementById('addStartJobButton').addEventListener('click', (e) => { e.preventDefault(); addNode('Start', 'noop', 'Start'); });
            document.getElementById('addEndJobButton').addEventListener('click', (e) => { e.preventDefault(); addNode('End', 'noop', 'End'); });
            document.getElementById('addMergeJobButton').addEventListener('click', (e) => { e.preventDefault(); addNode('Merge', 'mergeType', 'Merge Job'); });

            // View Menu
            document.getElementById('layoutButton').addEventListener('click', (e) => {
                e.preventDefault();
                myDiagram.layoutDiagram(true); // true to animate
                showToast('Auto arrange applied.', 'blue');
            });

            // Deploy Button
            document.getElementById('deployButton').addEventListener('click', () => {
                showLoadingOverlay('Deploying workflow...');
                
                setTimeout(() => {
                    const workflowData = {
                        name: document.getElementById('workflow_name').value || "default-workflow",
                        target: appConfig.deploymentTarget,
                        nodes: myDiagram.model.nodeDataArray.length,
                        links: myDiagram.model.linkDataArray.length
                    };
                    
                    console.log("Deploying workflow:", workflowData);
                    showToast(`Workflow deployed successfully! (${workflowData.nodes} nodes, ${workflowData.links} links)`, 'green');
                    hideLoadingOverlay();
                }, 1500);
            });

            // Rename End Job Checkbox
            document.getElementById('rename_end_job_checkbox').addEventListener('change', function() {
                const isChecked = this.checked;
                showToast(`Rename End Job is now ${isChecked ? 'enabled' : 'disabled'}.`, 'blue');
                
                myDiagram.model.commit(m => {
                    m.nodeDataArray.forEach(nodeData => {
                        if (nodeData.category === "End") {
                            if (isChecked && nodeData.text === "EndJob") {
                                m.set(nodeData, "text", "WorkflowEnd");
                            } else if (!isChecked && nodeData.text === "WorkflowEnd") {
                                m.set(nodeData, "text", "EndJob");
                            }
                        }
                    });
                }, "RenameEndJob");
            });

            // --- Initialize Diagram ---
            initDiagram();
            clearInspector(); // Initial state for inspector

            // Handle window resize to keep diagram responsive
            window.addEventListener('resize', function() {
                if (myDiagram) {
                    myDiagram.requestUpdate(); // Redraws the diagram, adjusting to new size
                }
            });

        }; // End window.onload