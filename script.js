document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const jsonInput = document.getElementById('json-input');
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const convertBtn = document.getElementById('convert-btn');
    const clearBtn = document.getElementById('clear-btn');
    const errorMsg = document.getElementById('error-msg');
    const outputSection = document.getElementById('output-section');
    const csvPreview = document.getElementById('csv-preview');
    const rowCount = document.getElementById('row-count');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const fileNameDisplay = document.getElementById('file-name');
    const previewHeader = document.getElementById('preview-header');

    // Settings
    const drpDelimiter = document.getElementById('drpDelimiter');
    const drpNested = document.getElementById('drpNested');
    const drpColumnOrder = document.getElementById('drpColumnOrder');
    const chkEpoch = document.getElementById('chkEpoch');

    let currentCSV = '';
    let lastJSON = null; 
    let currentFileName = null;

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
        });
    });

    // Drag and Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        handleFile(file);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFile(file);
    });

    // Clear Button
    clearBtn.addEventListener('click', () => {
        jsonInput.value = '';
        fileInput.value = '';
        fileNameDisplay.textContent = '';
        fileNameDisplay.classList.add('hidden');
        outputSection.classList.add('hidden');
        errorMsg.classList.add('hidden');
        currentCSV = '';
        lastJSON = null;
        currentFileName = null;
    });

    // Convert Button
    convertBtn.addEventListener('click', async () => {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        
        setLoading(true);
        
        // Use setTimeout to allow UI to update before heavy processing
        setTimeout(() => {
            if (activeTab === 'paste') {
                currentFileName = null; // Reset filename for pasted content
                const jsonString = jsonInput.value.trim();
                if (jsonString) {
                    try {
                        lastJSON = JSON.parse(jsonString);
                        processJSONData(lastJSON);
                    } catch (e) {
                        showError('Invalid JSON format: ' + e.message);
                        setLoading(false);
                    }
                } else {
                    showError('Input is empty.');
                    setLoading(false);
                }
            } else {
                if (fileInput.files.length > 0 && !lastJSON) {
                    // Should have been handled by change event, but just in case
                    handleFile(fileInput.files[0]);
                } else if (lastJSON) {
                     processJSONData(lastJSON);
                } else {
                    showError('Please upload a file or paste JSON content.');
                    setLoading(false);
                }
            }
        }, 50);
    });

    // Copy Button
    copyBtn.addEventListener('click', () => {
        if (!currentCSV) return;
        navigator.clipboard.writeText(currentCSV).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        });
    });

    // Download Button
    downloadBtn.addEventListener('click', () => {
        if (!currentCSV) return;
        const blob = new Blob([currentCSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const downloadName = currentFileName ? `${currentFileName}.csv` : 'converted_data.csv';
        link.setAttribute('download', downloadName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    function setLoading(isLoading) {
        if (isLoading) {
            convertBtn.disabled = true;
            convertBtn.textContent = 'Processing...';
            document.body.style.cursor = 'wait';
        } else {
            convertBtn.disabled = false;
            convertBtn.textContent = 'Convert to CSV';
            document.body.style.cursor = 'default';
        }
    }

    function handleFile(file) {
        if (!file) return;
        
        // Store filename without extension
        currentFileName = file.name.replace(/\.[^/.]+$/, "");

        // Show filename
        fileNameDisplay.textContent = `Selected: ${file.name}`;
        fileNameDisplay.classList.remove('hidden');
        
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            showError('Please upload a valid JSON file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                lastJSON = JSON.parse(e.target.result);
                // Don't auto process on upload anymore, wait for convert click as per request implied flow?
                // Actually, usually user uploads then clicks convert. 
                // But we already store it in lastJSON.
            } catch (error) {
                showError('Invalid JSON file: ' + error.message);
            }
        };
        reader.onerror = () => {
            showError('Error reading file.');
        };
        reader.readAsText(file);
    }

    function processJSONData(data) {
        hideError();

        if (!data) {
            showError('No data to process.');
            setLoading(false);
            return;
        }
        
        // Use setTimeout again to break up the task if needed, 
        // but simple timeout here handles the UI unfreeze for the initial click.
        // For very large datasets, we would need a Web Worker or chunking.
        // Given constraints, simple timeout + async structure is a good first step.

        setTimeout(() => {
            try {
                // Normalize data to array of objects
                let arrayData = Array.isArray(data) ? data : [data];

                if (arrayData.length === 0) {
                    showError('JSON array is empty.');
                    setLoading(false);
                    return;
                }

                const nestedMode = drpNested.value; // 'flatten', 'concat', 'unwind'

                // Pre-process: Unwind if selected
                if (nestedMode === 'unwind') {
                    arrayData = unwindData(arrayData);
                }

                // Flatten objects based on mode
                const flattenedData = arrayData.map(item => flattenObject(item, '', {}, nestedMode));
                
                // Generate CSV
                const csv = generateCSV(flattenedData);
                currentCSV = csv;
                
                // Render Preview
                renderPreview(flattenedData);
                
                outputSection.classList.remove('hidden');
            } catch (error) {
                showError('Error processing data: ' + error.message);
            } finally {
                setLoading(false);
            }
        }, 10);
    }

    // Recursively unwind arrays in objects
    function unwindData(data) {
        let result = [];

        for (const item of data) {
            const unwoundItems = recursiveUnwind(item);
            result = result.concat(unwoundItems);
        }

        return result;
    }

    function recursiveUnwind(obj) {
        if (typeof obj !== 'object' || obj === null) return [obj];

        for (const key in obj) {
            if (Array.isArray(obj[key]) && obj[key].length > 0 && typeof obj[key][0] === 'object') {
                const arrayVal = obj[key];
                let unwound = [];
                
                for (const subItem of arrayVal) {
                    const newObj = { ...obj };
                    newObj[key] = subItem;
                    unwound.push(newObj);
                }

                let finalResult = [];
                for (const u of unwound) {
                    finalResult = finalResult.concat(recursiveUnwind(u));
                }
                return finalResult;
            }
        }

        return [obj];
    }

    function flattenObject(obj, prefix = '', res = {}, mode = 'flatten') {
        for (const key in obj) {
            let value = obj[key];
            const newKey = prefix ? `${prefix}.${key}` : key;

            if (chkEpoch.checked && typeof value === 'number') {
                 if (value > 1000000000) {
                     let date;
                     if (value < 100000000000) { // Likely seconds
                         date = new Date(value * 1000);
                     } else { // Likely milliseconds
                         date = new Date(value);
                     }
                     
                     if (!isNaN(date.getTime())) {
                         value = date.toISOString().split('T')[0].replace(/-/g, ''); // yyyymmdd
                     }
                 }
            }

            if (value && typeof value === 'object' && value !== null) {
                if (mode === 'concat') {
                    res[newKey] = JSON.stringify(value);
                } else if (mode === 'flatten' || mode === 'unwind') {
                    if (Array.isArray(value) && value.length === 0) {
                        res[newKey] = [];
                    } else if (Array.isArray(value) && typeof value[0] !== 'object') {
                         flattenObject(value, newKey, res, mode);
                    } else {
                         flattenObject(value, newKey, res, mode);
                    }
                }
            } else {
                res[newKey] = value;
            }
        }
        return res;
    }

    function generateCSV(data) {
        const delimiter = drpDelimiter.value;
        const sortMode = drpColumnOrder.value;

        // Get all unique headers
        let headers = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));
        
        if (sortMode === 'smart') {
            headers.sort();
        }

        const csvRows = [
            headers.join(delimiter)
        ];

        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header];
                return escapeCSV(val, delimiter);
            });
            csvRows.push(values.join(delimiter));
        }

        return csvRows.join('\n');
    }

    function escapeCSV(value, delimiter) {
        if (value === null || value === undefined) {
            return '';
        }
        
        const stringValue = String(value);
        
        if (stringValue.includes(delimiter) || stringValue.includes('\n') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
    }

    function renderPreview(data) {
        const headers = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));
        if (drpColumnOrder.value === 'smart') {
            headers.sort();
        }
        
        const previewData = data.slice(0, 30); 
        
        // Update header text dynamic
        if (previewHeader) {
            previewHeader.textContent = `Preview (First ${previewData.length} rows)`;
        }
        
        let html = '<thead><tr>';
        headers.forEach(h => {
            html += `<th>${h}</th>`;
        });
        html += '</tr></thead><tbody>';

        previewData.forEach(row => {
            html += '<tr>';
            headers.forEach(h => {
                const val = row[h] !== undefined ? row[h] : '';
                let displayVal = String(val);
                if (displayVal.length > 50) {
                    displayVal = displayVal.substring(0, 47) + '...';
                }
                html += `<td title="${String(val).replace(/"/g, '&quot;')}">${displayVal}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody>';

        csvPreview.innerHTML = html;
        rowCount.textContent = `Showing ${previewData.length} of ${data.length} rows`;
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
        outputSection.classList.add('hidden');
    }

    function hideError() {
        errorMsg.classList.add('hidden');
    }
});
