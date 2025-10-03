


import React, { useState, useEffect, useRef } from 'react';
// Simple hash function for strings
function hashCode(str) {
  let hash = 0, i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr   = str.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
import { GripIcon } from './ui/GripIcon';
import PeerReview from './PeerReview';
import Reporting from './Reporting';
import InfinityAssistant from './InfinityAssistant';
import InfinityIcon from '../assets/infinity.svg';
import { 
  ChevronDown, Plus, RefreshCw, GitBranch, GitCommit, Clock, 
  FileText, FolderOpen, Settings, User, Search, X, AlertCircle, 
  GitPullRequest, Download, Upload, Home, BarChart2 
} from 'lucide-react';



// Stub Decision Table IDE
const DATATYPES = ['String', 'Number', 'Boolean', 'Date'];
const CONDITIONS = ['Equals', 'Greater Than', 'Less Than', 'Contains'];

const DecisionTableIDE = ({ title: initialTitle, columns: initialColumns, rows: initialRows, setTable, testCases: initialTestCases, logChange, onExtractJson }) => {
  // Decision Table state
  const [title, setTitle] = useState(initialTitle || 'New Decision Table');
  const [columns, setColumnsRaw] = useState(initialColumns || [
    { name: 'Condition 1', type: 'String', condition: 'Equals' },
    { name: 'Result', type: 'String', condition: 'Equals' }
  ]);
  // Helper: normalize Boolean columns to 'TRUE'/'FALSE' strings
  function normalizeBooleanRows(cols, rows) {
    const boolIndices = cols
      .map((col, idx) => col.type && col.type.toLowerCase() === 'boolean' ? idx : -1)
      .filter(idx => idx !== -1);
    return rows.map(row =>
      row.map((val, idx) =>
        boolIndices.includes(idx)
          ? (val === true ? 'TRUE' : val === false ? 'FALSE' : (typeof val === 'string' ? val.toUpperCase() : val))
          : val
      )
    );
  }

  const [rawRows, setRows] = useState(initialRows || [['', '']]);
  // Always normalize Boolean columns for display and logic
  const rows = normalizeBooleanRows(columns, rawRows);
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const inputRefs = React.useRef([]);

  // Test suite state
  const [testCases, setTestCasesRaw] = useState(initialTestCases || []);
  const [suiteRun, setSuiteRun] = useState(false);
  // Helper: ensure 'Result' column is last
  // Helper: ensure output column is last (supports 'Result', 'Output', 'Decision')
  function ensureResultLast(cols) {
    const outputNames = ['result', 'output', 'decision'];
    // Find first output column by name (should only be one)
    const idx = cols.findIndex(col => outputNames.includes(col.name.trim().toLowerCase()));
    if (idx === -1) return cols;
    const resultCol = cols[idx];
    // Remove output column from its current position
    const filtered = cols.filter((_, i) => i !== idx);
    // Always append output column to the end
    return [...filtered, resultCol];
  }

  // Helper: realign test cases to current columns (robust name-based mapping)
  const realignTestCases = (newColumns, prevColumns, prevTestCases) => {
    // Always treat output column as last after ensureResultLast
    const outputNames = ['result', 'output', 'decision'];
    const newCols = ensureResultLast(newColumns);
    const prevCols = ensureResultLast(prevColumns);
    const outputColIdx = newCols.length - 1;
    const inputColumns = newCols.slice(0, outputColIdx);
    const prevOutputColIdx = prevCols.length - 1;
    const prevInputColumns = prevCols.slice(0, prevOutputColIdx);
    const prevInputNames = prevInputColumns.map(col => col.name);

  // Patch: get first row of decision table for autofill
  // Use the first row of the current rows array (from DecisionTableIDE state)
  const firstRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

  // For each test case, build a mapping from previous input column name to value
  const mappedTestCases = prevTestCases.map(tc => {
    // Defensive: if tc.inputs is missing or not an array, treat as empty
    const inputMap = {};
    if (Array.isArray(tc.inputs)) {
      prevInputNames.forEach((name, idx) => {
        inputMap[name] = tc.inputs[idx];
      });
    }
    // For each new input column, preserve value if it existed, else set to value from first row if available, else ''
    const newInputs = inputColumns.map((col, idx) => {
      const preserved = inputMap.hasOwnProperty(col.name) ? inputMap[col.name] : undefined;
      if (typeof preserved !== 'undefined' && preserved !== null && preserved !== '') {
        console.log(`[DEBUG][TestSuite] Preserved value for column '${col.name}':`, preserved);
        return preserved;
      }
      // Pattern match: build pattern from other input columns
      const pattern = inputColumns.map((c, i) => (i === idx ? null : inputMap.hasOwnProperty(c.name) ? inputMap[c.name] : null));
      let matchedValue = '';
      if (Array.isArray(rows) && rows.length > 0) {
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          let match = true;
          for (let i = 0; i < inputColumns.length; i++) {
            if (i === idx) continue; // skip new column
            if (pattern[i] !== null && pattern[i] !== row[i]) {
              match = false;
              break;
            }
          }
          if (match) {
            matchedValue = row[idx];
            console.log(`[DEBUG][TestSuite] Autofilled value for column '${col.name}' from matched pattern in decision table row ${r}:`, matchedValue);
            break;
          }
        }
      }
      if (matchedValue !== undefined && matchedValue !== null && matchedValue !== '') {
        return matchedValue;
      }
      console.log(`[DEBUG][TestSuite] No value for column '${col.name}', defaulting to empty string.`);
      return '';
    });
    console.log('[DEBUG][TestSuite] Final mapped inputs for test case:', newInputs);
    return { ...tc, inputs: newInputs };
  });
  // Debugger: log mapping of test case inputs to columns
  console.log('[DecisionTableIDE][realignTestCases] Columns:', inputColumns.map(c => c.name), '[Result]', newCols[outputColIdx]?.name);
  console.log('[DecisionTableIDE][realignTestCases] TestCases:', mappedTestCases.map(tc => tc.inputs), '[Expected]', mappedTestCases.map(tc => tc.expected));
  return mappedTestCases;
  };

  // Patch: wrap setColumns to realign test cases on column change and ensure 'Result' is last
  const setColumns = (newCols) => {
  const colsWithResultLast = ensureResultLast(newCols);
  setColumnsRaw(colsWithResultLast);
  setTestCasesRaw(prevTestCases => realignTestCases(colsWithResultLast, columns, prevTestCases, rows));
  // Normalize Boolean columns in rows after column change
  setRows(prevRows => normalizeBooleanRows(colsWithResultLast, prevRows));
  };

  // Patch: wrap setTestCases for compatibility
  const setTestCases = setTestCasesRaw;

    // useEffect: realign testCases whenever columns change (external or UI)
    useEffect(() => {
  setTestCasesRaw(prevTestCases => realignTestCases(columns, columns, prevTestCases, rows));
    }, [columns]);

  // Save work in progress and update model title
  const saveTable = () => {
    if (setTable) {
      setTable({
        title,
        columns,
        rows,
        testCases
      });
    }
    // Log change to history tab
    if (logChange) {
      logChange({
        title: `[Save] ${title}`,
        columns: [...columns],
        rows: [...rows],
        testCases: testCases ? [...testCases] : [],
        timestamp: Date.now()
      });
    }
    localStorage.setItem('decisionTableWIP', JSON.stringify({ title, columns, rows, testCases }));
    alert('Work in progress saved!');
  };

  // Add/remove/update logic
  const addColumn = () => {
    // Always insert new column before the output column
    const outputNames = ['result', 'output', 'decision'];
    const outputIdx = columns.findIndex(col => outputNames.includes(col.name.trim().toLowerCase()));
    const insertIdx = outputIdx === -1 ? columns.length : outputIdx;
    const newCol = { name: `Condition ${columns.length + 1}`, type: 'String', condition: 'Equals' };
    const newColumns = [
      ...columns.slice(0, insertIdx),
      newCol,
      ...columns.slice(insertIdx)
    ];
    setColumns(newColumns);
    setRows(prevRows => normalizeBooleanRows(newColumns, prevRows.map(row => {
      const newRow = [...row];
      newRow.splice(insertIdx, 0, '');
      return newRow;
    })));
  };
  const removeColumn = (colIdx) => {
    setColumns(columns.filter((_, idx) => idx !== colIdx));
    setRows(rows.map(row => row.filter((_, idx) => idx !== colIdx)));
  };
  const addRow = () => {
    setRows([...rows, columns.map(() => '')]);
  };
  const removeRow = (rowIdx) => {
    setRows(rows.filter((_, idx) => idx !== rowIdx));
  };
  const updateCell = (rowIdx, colIdx, value) => {
    const newRows = rows.map((row, r) =>
      r === rowIdx ? row.map((cell, c) => (c === colIdx ? value : cell)) : row
    );
    setRows(newRows);
  };
  const handleCellKeyDown = (e, rowIdx, colIdx) => {
    let nextRow = rowIdx;
    let nextCol = colIdx;
    if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
      nextCol = colIdx + 1 < columns.length ? colIdx + 1 : colIdx;
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
      nextCol = colIdx - 1 >= 0 ? colIdx - 1 : colIdx;
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      nextRow = rowIdx + 1 < rows.length ? rowIdx + 1 : rowIdx;
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      nextRow = rowIdx - 1 >= 0 ? rowIdx - 1 : rowIdx;
      e.preventDefault();
    }
    setSelectedCell({ row: nextRow, col: nextCol });
    setTimeout(() => {
      if (inputRefs.current[nextRow] && inputRefs.current[nextRow][nextCol]) {
        inputRefs.current[nextRow][nextCol].focus();
      }
    }, 0);
  };
  const updateColumn = (colIdx, field, value) => {
    const newCols = columns.map((col, idx) =>
      idx === colIdx ? { ...col, [field]: value } : col
    );
    setColumns(newCols);
  };

  // Enhanced test suite logic
  // Find the output column by name 'Result' (case-insensitive, fallback to last column)
  // Always treat output column as last after ensureResultLast
  const outputNames = ['result', 'output', 'decision'];
  const colsWithResultLast = ensureResultLast(columns);
  const outputColIdx = colsWithResultLast.length - 1;
  const outputColumn = colsWithResultLast[outputColIdx]?.name || 'Result';
  const inputColumns = colsWithResultLast.slice(0, outputColIdx);

  // Run all test cases
  const runTestSuite = () => {
    const updated = testCases.map(tc => {
      // Find the row that matches all input columns
      const matchRow = rows.find(row =>
        inputColumns.every((col, idx) => String(row[columns.findIndex(c => c.name === col.name)]) === tc.inputs[idx])
      );
      // Get the output value from the correct output column
      const actualOutput = matchRow && outputColIdx !== -1 ? matchRow[outputColIdx] : (matchRow ? matchRow[columns.length - 1] : 'No match found');
      const pass = tc.expected !== '' ? actualOutput === tc.expected : null;
      return { ...tc, result: actualOutput, status: pass === null ? null : pass ? 'pass' : 'fail' };
    });
    setTestCases(updated);
    setSuiteRun(true);
  };

  // Add new test case
  const addTestCase = () => {
  setTestCases([...testCases, { inputs: inputColumns.map(() => ''), expected: '', result: null, status: null }]);
  };

  // Update test case
  const updateTestCase = (idx, field, value, inputIdx) => {
    setTestCases(testCases.map((tc, i) => {
      if (i !== idx) return tc;
      if (field === 'inputs') {
        const newInputs = [...tc.inputs];
        newInputs[inputIdx] = value;
        return { ...tc, inputs: newInputs };
      }
      return { ...tc, [field]: value };
    }));
  };

  // Remove test case
  const removeTestCase = (idx) => {
    setTestCases(testCases.filter((_, i) => i !== idx));
  };

  return (
    <div className="border rounded-lg p-6 bg-gray-50">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Decision Table IDE</h2>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded font-medium shadow hover:bg-green-700"
                onClick={saveTable}
              >
                Save
              </button>
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded font-medium shadow hover:bg-purple-700 flex items-center gap-2"
                // TODO: Add submit handler
              >
                <GitPullRequest className="w-5 h-5 text-white" />
                Submit for Peer Review
              </button>
            </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Decision Table Title</label>
          <input
            className="w-full border rounded px-2 py-1 text-md"
            type="text"
            placeholder="Enter table title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <p className="text-gray-600 mb-4">Create and edit workflows for models using a decision table interface.</p>
        <div className="mb-2 flex gap-2">
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={addRow}>Add Row</button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={addColumn}>Add Column</button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr>
                <th className="border p-2 bg-gray-100 w-10 text-center">#</th>
                {columns.map((col, colIdx) => (
                  <th key={colIdx} className="border p-2 bg-gray-100">
                    <div className="flex flex-col items-center justify-center">
                      <input
                        className="w-24 border rounded px-1 mb-1 text-center"
                        value={col.name}
                        onChange={e => updateColumn(colIdx, 'name', e.target.value)}
                      />
                      <div className="flex gap-1 mt-1 justify-center items-center">
                        <select
                          className="border rounded px-1 text-center"
                          value={col.type}
                          onChange={e => updateColumn(colIdx, 'type', e.target.value)}
                        >
                          {DATATYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                        <select
                          className="border rounded px-1 text-center"
                          value={col.condition}
                          onChange={e => updateColumn(colIdx, 'condition', e.target.value)}
                        >
                          {CONDITIONS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
                        </select>
                      </div>
                      <button className="mt-1 text-xs text-red-500" onClick={() => removeColumn(colIdx)}>Remove</button>
                    </div>
                  </th>
                ))}
                <th className="border p-2 bg-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="border p-2 text-center bg-gray-50 font-semibold">{rowIdx + 1}</td>
                  {row.map((cell, colIdx) => (
                    <td key={colIdx} className={`border p-2 ${selectedCell.row === rowIdx && selectedCell.col === colIdx ? 'bg-blue-100 ring-2 ring-blue-400' : ''}`}
                        onClick={() => {
                          setSelectedCell({ row: rowIdx, col: colIdx });
                          setTimeout(() => {
                            if (inputRefs.current[rowIdx] && inputRefs.current[rowIdx][colIdx]) {
                              inputRefs.current[rowIdx][colIdx].focus();
                            }
                          }, 0);
                        }}>
                      <input
                        ref={el => {
                          if (!inputRefs.current[rowIdx]) inputRefs.current[rowIdx] = [];
                          inputRefs.current[rowIdx][colIdx] = el;
                        }}
                        className="w-full border rounded px-1 bg-transparent focus:bg-white"
                        value={cell}
                        onChange={e => updateCell(rowIdx, colIdx, e.target.value)}
                        onKeyDown={e => handleCellKeyDown(e, rowIdx, colIdx)}
                        onFocus={() => setSelectedCell({ row: rowIdx, col: colIdx })}
                      />
                    </td>
                  ))}
                  <td className="border p-2">
                    <button className="text-xs text-red-500" onClick={() => removeRow(rowIdx)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Enhanced Testing Area */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-md font-semibold mb-2">Decision Table Test Suite</h3>
          <div className="mb-4">
            <button className="px-3 py-1 bg-green-600 text-white rounded mr-2" onClick={addTestCase}>Add Test Case</button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={runTestSuite}>Run All Tests</button>
          </div>
          {/* Show warning if no output column found */}
          {outputColIdx === -1 && (
            <div className="mb-2 text-xs text-red-600 font-semibold">Warning: No output column found (Result, Output, or Decision). Last column will be used as output.</div>
          )}
          <table className="min-w-full border text-sm mb-4">
            <thead>
              <tr>
                {inputColumns.map((col, i) => (
                  <th key={col.name} className="border p-2 bg-gray-100">{col.name}</th>
                ))}
                <th className="border p-2 bg-gray-100">Expected {outputColumn}</th>
                <th className="border p-2 bg-gray-100">Actual {outputColumn}</th>
                <th className="border p-2 bg-gray-100">Status</th>
                <th className="border p-2 bg-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {testCases.map((tc, idx) => (
                <tr key={idx}>
                  {inputColumns.map((col, inputIdx) => (
                    <td key={col.name} className="border p-2">
                      <input
                        type="text"
                        className="border rounded px-2 py-1 w-full"
                        value={tc.inputs[inputIdx]}
                        onChange={e => updateTestCase(idx, 'inputs', e.target.value, inputIdx)}
                        placeholder={col.name}
                      />
                    </td>
                  ))}
                  <td className="border p-2">
                    <input
                      type="text"
                      className="border rounded px-2 py-1 w-full"
                      value={tc.expected}
                      onChange={e => updateTestCase(idx, 'expected', e.target.value)}
                      placeholder={`Expected ${outputColumn}`}
                    />
                  </td>
                  <td className="border p-2">
                    {suiteRun ? tc.result : <span className="text-gray-400">(run to see)</span>}
                  </td>
                  <td className="border p-2">
                    {suiteRun && tc.status === 'pass' && <span className="text-green-600 font-semibold">Pass</span>}
                    {suiteRun && tc.status === 'fail' && <span className="text-red-600 font-semibold">Fail</span>}
                    {suiteRun && tc.status === null && <span className="text-gray-400">N/A</span>}
                  </td>
                  <td className="border p-2">
                    <button className="text-xs text-red-500" onClick={() => removeTestCase(idx)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {suiteRun && (
            <div className="bg-gray-100 p-2 rounded text-sm">
              <strong>Summary:</strong> {testCases.filter(tc => tc.status === 'pass').length} passed, {testCases.filter(tc => tc.status === 'fail').length} failed, {testCases.length} total
            </div>
          )}
        </div>
      </div>
    );
};

// Fully functional DMN IDE inspired by Drools Business Central v7.69
const DMNIDE = ({ model, setModel, logChange }) => {
  // DMN node types
  const NODE_TYPES = [
    { type: 'input', label: 'Input Data', color: 'bg-blue-200' },
    { type: 'decision', label: 'Decision', color: 'bg-green-200' },
    { type: 'knowledge', label: 'Knowledge Source', color: 'bg-yellow-200' },
    { type: 'output', label: 'Output', color: 'bg-purple-200' }
  ];
  // DMN state
  const [nodes, setNodes] = useState(model?.dmn?.nodes || []);
  const [edges, setEdges] = useState(model?.dmn?.edges || []);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState(null);
  const canvasRef = React.useRef(null);

  // Save DMN model and log change for all models in repo
  const saveDMN = () => {
    if (setModel) {
      setModel({
        ...model,
        dmn: { nodes, edges }
      });
    }
    // DMN-specific event title
    const dmnEvent = {
      timestamp: new Date().toISOString(),
      title: `[DMN Save] ${model?.repo || 'Repository'} updated`,
      columns: [],
      rows: [],
      testCases: [],
      dmn: { nodes, edges }
    };
    if (logChange) {
      logChange(dmnEvent, true); // Pass a flag to indicate broadcast to all models in repo
    }
    alert('DMN model saved!');
  };

  // Add node from palette
  const addNode = (type) => {
    const newNode = {
      id: Date.now() + Math.random(),
      type,
      label: NODE_TYPES.find(n => n.type === type).label,
      x: 100 + Math.random() * 300,
      y: 100 + Math.random() * 200,
      properties: { name: '', description: '' }
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
  };

  // Remove node and its edges
  const removeNode = (id) => {
    setNodes(nodes.filter(n => n.id !== id));
    setEdges(edges.filter(e => e.from !== id && e.to !== id));
    setSelectedNodeId(null);
  };

  // Start connecting from node
  const startConnecting = (id) => {
    setConnectingFrom(id);
  };
  // Finish connecting to node
  const finishConnecting = (id) => {
    if (connectingFrom && connectingFrom !== id) {
      setEdges([...edges, { from: connectingFrom, to: id }]);
    }
    setConnectingFrom(null);
  };

  // Drag node
  const handleNodeDrag = (id, dx, dy) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, x: n.x + dx, y: n.y + dy } : n));
  };

  // Update node properties
  const updateNodeProps = (id, props) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, properties: { ...n.properties, ...props } } : n));
  };

  // Render edges as SVG lines
  const renderEdges = () => (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      {edges.map((e, idx) => {
        const from = nodes.find(n => n.id === e.from);
        const to = nodes.find(n => n.id === e.to);
        if (!from || !to) return null;
        return (
          <line
            key={idx}
            x1={from.x + 60}
            y1={from.y + 30}
            x2={to.x + 60}
            y2={to.y + 30}
            stroke="#888"
            strokeWidth={2}
            markerEnd="url(#arrowhead)"
          />
        );
      })}
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="4" refX="8" refY="2" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,2 L0,4" fill="#888" />
        </marker>
      </defs>
    </svg>
  );

  // Render nodes on canvas
  const renderNodes = () => (
    nodes.map(node => {
      const typeInfo = NODE_TYPES.find(n => n.type === node.type);
      return (
        <div
          key={node.id}
          className={`absolute cursor-move shadow-lg rounded-lg border ${typeInfo.color} ${selectedNodeId === node.id ? 'ring-2 ring-blue-500' : ''}`}
          style={{ left: node.x, top: node.y, width: 120, height: 60, zIndex: 2 }}
          onMouseDown={e => {
            setDraggingNode({ id: node.id, startX: e.clientX, startY: e.clientY });
            e.stopPropagation();
          }}
          onClick={e => {
            setSelectedNodeId(node.id);
            e.stopPropagation();
          }}
        >
          <div className="flex items-center justify-between px-2 pt-2">
            <span className="font-semibold text-xs text-gray-700">{node.label}</span>
            <button className="text-xs text-red-500" onClick={ev => { ev.stopPropagation(); removeNode(node.id); }}>✕</button>
          </div>
          <div className="px-2 text-xs text-gray-600 truncate">{node.properties.name || 'Unnamed'}</div>
          <div className="flex justify-between px-2 pt-2">
            <button className="text-xs text-blue-600" onClick={ev => { ev.stopPropagation(); startConnecting(node.id); }}>Connect</button>
            <button className="text-xs text-gray-500" onClick={ev => { ev.stopPropagation(); setSelectedNodeId(node.id); }}>Edit</button>
          </div>
        </div>
      );
    })
  );

  // Handle canvas mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggingNode) {
        const dx = e.clientX - draggingNode.startX;
        const dy = e.clientY - draggingNode.startY;
        handleNodeDrag(draggingNode.id, dx, dy);
        setDraggingNode({ ...draggingNode, startX: e.clientX, startY: e.clientY });
      }
    };
    const handleMouseUp = (e) => {
      if (draggingNode) setDraggingNode(null);
      if (connectingFrom) {
        // Try to connect to a node under mouse
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const target = nodes.find(n => x >= n.x && x <= n.x + 120 && y >= n.y && y <= n.y + 60);
        if (target) finishConnecting(target.id);
        else setConnectingFrom(null);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNode, connectingFrom, nodes]);

  // Sidebar for editing node properties
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="border rounded-lg p-0 bg-gray-50 flex h-[600px]">
      {/* Node Palette */}
      <div className="w-48 border-r bg-white p-4 flex flex-col gap-4">
        <h2 className="text-md font-semibold mb-2">Node Palette</h2>
        {NODE_TYPES.map(nt => (
          <button
            key={nt.type}
            className={`w-full px-3 py-2 rounded-md font-medium shadow ${nt.color} hover:ring-2 hover:ring-blue-400`}
            onClick={() => addNode(nt.type)}
          >
            {nt.label}
          </button>
        ))}
      </div>
      {/* Canvas Area */}
      <div className="flex-1 relative" ref={canvasRef} style={{ background: '#f8fafc', overflow: 'hidden' }}>
        {/* Save Button Top Right */}
        <button
          className="absolute top-4 right-4 px-4 py-2 bg-green-600 text-white rounded font-medium shadow hover:bg-green-700 z-10"
          onClick={saveDMN}
        >
          Save
        </button>
        {renderEdges()}
        {renderNodes()}
        {connectingFrom && (
          <div className="absolute left-2 top-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs shadow">Connecting: Select target node</div>
        )}
      </div>
      {/* Sidebar for node editing */}
      <div className="w-72 border-l bg-white p-4 flex flex-col">
        <h2 className="text-md font-semibold mb-2">Node Properties</h2>
        {selectedNode ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                type="text"
                value={selectedNode.properties.name}
                onChange={e => updateNodeProps(selectedNode.id, { name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border rounded px-2 py-1 text-sm"
                rows={2}
                value={selectedNode.properties.description}
                onChange={e => updateNodeProps(selectedNode.id, { description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={selectedNode.type}
                onChange={e => updateNodeProps(selectedNode.id, { type: e.target.value })}
              >
                {NODE_TYPES.map(nt => <option key={nt.type} value={nt.type}>{nt.label}</option>)}
              </select>
            </div>
            <button
              className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm"
              onClick={() => removeNode(selectedNode.id)}
            >
              Delete Node
            </button>
          </div>
        ) : (
          <div className="text-gray-500">Select a node to edit its properties.</div>
        )}
      </div>
    </div>
  );
};

const InfinityReactUI = () => {
  // --- Resizable Chat Panel Hooks (must be inside component) ---
  const MIN_CHAT_WIDTH = 280; // px
  const MAX_CHAT_WIDTH = 600; // px
  const [chatPanelWidth, setChatPanelWidth] = useState(() => {
    if (typeof window !== 'undefined' && window._infinityChatPanelWidth) return window._infinityChatPanelWidth;
    return 384; // default 24rem (w-96)
  });
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const chatPanelWidthRef = useRef(chatPanelWidth);
  useEffect(() => {
    chatPanelWidthRef.current = chatPanelWidth;
  }, [chatPanelWidth]);
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      // Reverse direction: dragging left increases width, right decreases
      const dx = startXRef.current - e.clientX;
      let newWidth = startWidthRef.current + dx;
      newWidth = Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, newWidth));
      setChatPanelWidth(newWidth);
      window._infinityChatPanelWidth = newWidth;
    };
    const onMouseUp = () => { isDraggingRef.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);
  // State for extracted JSON to send to chat

  // Sidebar minimize state for chat
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('changes');
  const [selectedRepo, setSelectedRepo] = useState('Authorization_CSBD_DMN');
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [repoList, setRepoList] = useState([
    'Authorization_CSBD_DMN',
    'Authorization_GBD_DMN',
    'Deny',
    'Infinity-Instructions',
    'Infinity-Mapping-Rules',
    'Infinity-Mjr-Min-Heading-Rules',
    'Infinity-Rules-Management',
    'Kie-Server-Health',
    'Open',
    'Paid'
  ]);
  const filteredRepos = repoList.filter(repo => repo.toLowerCase().includes(repoSearchQuery.toLowerCase()));
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [currentBranch, setCurrentBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('');
  const [commitDescription, setCommitDescription] = useState('');
  // Editor mode: 'table' for Decision Table IDE, 'dmn' for DMN IDE
  const [editorMode, setEditorMode] = useState('table');
  // Models (Decision Tables) with repo property
  const [models, setModels] = useState([
    {
      id: 1,
      title: 'Authorization Indicator Check',
      repo: 'Authorization_CSBD_DMN',
      columns: [
        { name: 'Authorization Indicator', type: 'String', condition: 'Equals' },
        { name: 'UM Core Edit', type: 'Boolean', condition: 'Equals' },
        { name: 'Result', type: 'String', condition: 'Equals' }
      ],
      rows: [
        ['Y', 'TRUE', 'Proceed to Claim Level Bypass Check'],
        ['-', '-', 'No action specified'],
      ],
      testCases: [
        {
          inputs: ['Y', 'TRUE'],
          expected: 'Proceed to Claim Level Bypass Check',
          description: 'Should proceed to Claim Level Bypass Check when Authorization Indicator is Y and UM Core Edit is TRUE'
        },
        {
          inputs: ['-', '-'],
          expected: 'No action specified',
          description: 'Should return No action specified when Authorization Indicator and UM Core Edit are not set'
        },
        {
          inputs: ['N', 'FALSE'],
          expected: 'No action specified',
          description: 'Should return No action specified when Authorization Indicator is N and UM Core Edit is FALSE'
        }
      ],
      changeLog: [
        {
          timestamp: '2025-09-28T10:00:00Z',
          title: 'Initial creation of Authorization Indicator Check',
          columns: [
            { name: 'Authorization Indicator', type: 'String', condition: 'Equals' },
            { name: 'UM Core Edit', type: 'Boolean', condition: 'Equals' },
            { name: 'Result', type: 'String', condition: 'Equals' }
          ],
          rows: [
            ['Y', 'TRUE', 'Proceed to Claim Level Bypass Check'],
            ['-', '-', 'No action specified'],
          ],
          testCases: []
        },
        {
          timestamp: '2025-09-29T09:00:00Z',
          title: 'Added functional test cases',
          columns: [
            { name: 'Authorization Indicator', type: 'String', condition: 'Equals' },
            { name: 'UM Core Edit', type: 'Boolean', condition: 'Equals' },
            { name: 'Result', type: 'String', condition: 'Equals' }
          ],
          rows: [
            ['Y', 'TRUE', 'Proceed to Claim Level Bypass Check'],
            ['-', '-', 'No action specified'],
          ],
          testCases: [
            {
              inputs: ['Y', 'TRUE'],
              expected: 'Proceed to Claim Level Bypass Check',
              description: 'Should proceed to Claim Level Bypass Check when Authorization Indicator is Y and UM Core Edit is TRUE'
            },
            {
              inputs: ['-', '-'],
              expected: 'No action specified',
              description: 'Should return No action specified when Authorization Indicator and UM Core Edit are not set'
            },
            {
              inputs: ['N', 'FALSE'],
              expected: 'No action specified',
              description: 'Should return No action specified when Authorization Indicator is N and UM Core Edit is FALSE'
            }
          ]
        }
      ],
    },
    {
      id: 2,
      title: 'Claim Level Bypass Check',
      repo: 'Authorization_CSBD_DMN',
      columns: [
        { name: 'Authorization Indicator Check.Result', type: 'String', condition: 'Equals' },
        { name: 'List Contains ("Hospital based Phys")', type: 'Boolean', condition: 'Equals' },
        { name: 'Result', type: 'String', condition: 'Equals' }
      ],
      rows: [
        ['Proceed to Claim Level Bypass Check', 'TRUE', 'Bypass UM due to Hospital based physician and apply member benefits'],
        ['Proceed to Claim Level Bypass Check', 'FALSE', 'Proceed to Line Level Bypass Check'],
        ['-', '-', 'No Rule Matched']
      ],
      testCases: [
        {
          inputs: ['Proceed to Claim Level Bypass Check', 'TRUE'],
          expected: 'Bypass UM due to Hospital based physician and apply member benefits',
          description: 'Should bypass UM for hospital-based physician when condition is TRUE.'
        },
        {
          inputs: ['Proceed to Claim Level Bypass Check', 'FALSE'],
          expected: 'Proceed to Line Level Bypass Check',
          description: 'Should proceed to line level bypass check when condition is FALSE.'
        },
        {
          inputs: ['-', '-'],
          expected: 'No Rule Matched',
          description: 'Should return No Rule Matched for default case.'
        }
      ],
      changeLog: []
    },
    {
      id: 3,
      title: 'Line Level Bypass Check',
      repo: 'Authorization_CSBD_DMN',
      columns: [
        { name: 'Claim Level Bypass Check.Result', type: 'String', condition: 'Equals' },
        { name: '(list contains(Claim Level Bypass Check.Data.Line.modifierCode , "26")) and not (list contains(Claim Level Bypass Check.Data.Line.modifierCode , "TC")', type: 'Boolean', condition: 'Equals' },
        { name: '(list contains(Claim Level Bypass Check.Data.Line.businessLabel, lower case("Prior Auth Pass"))) and (Claim Level Bypass Check.Data.Line.preAuthorizationPassIndicator = "Y")', type: 'Boolean', condition: 'Equals' },
        { name: '(list contains(Claim Level Bypass Check.Data.Line.businessLabel, lower case("Possible Prior Auth Pass"))) and not(list contains(Claim Level Bypass Check.Data.Line.businessLabel, lower case("UM denied case")))  and  (Claim Level Bypass Check.Data.Line.preAuthorizationPassIndicator = "Y")', type: 'Boolean', condition: 'Equals' },
        { name: 'Result', type: 'String', condition: 'Equals' }
      ],
      rows: [
        ['Proceed to Claim Level Bypass Check', 'TRUE', '-','-','Bypass UM, per modifier 26 and apply member benefits'],
        ['Proceed to Claim Level Bypass Check', '-', 'TRUE','-','Bypass UM, per prior auth pass program and apply member benefits'],
        ['Proceed to Claim Level Bypass Check', '-', '-','TRUE','Bypass UM, per prior auth pass program and apply member benefits'],
        ['Proceed to Claim Level Bypass Check', '-', '-','-','No recommendation from Infinity'],
        ['-','-','-', '-', 'No Rule Matched']
      ],
      testCases: [
        {
          inputs: ['Proceed to Claim Level Bypass Check', 'TRUE', '-', '-',],
          expected: 'Bypass UM, per modifier 26 and apply member benefits',
          description: 'Should bypass UM for modifier 26 when condition is TRUE.'
        },
        {
          inputs: ['Proceed to Claim Level Bypass Check', '-', 'TRUE', '-',],
          expected: 'Bypass UM, per prior auth pass program and apply member benefits',
          description: 'Should bypass UM for prior auth pass program when second condition is TRUE.'
        },
        {
          inputs: ['Proceed to Claim Level Bypass Check', '-', '-', 'TRUE',],
          expected: 'Bypass UM, per prior auth pass program and apply member benefits',
          description: 'Should bypass UM for possible prior auth pass program when third condition is TRUE.'
        },
        {
          inputs: ['Proceed to Claim Level Bypass Check', '-', '-', '-',],
          expected: 'No recommendation from Infinity',
          description: 'Should return No recommendation from Infinity for unmatched conditions.'
        },
        {
          inputs: ['-', '-', '-', '-',],
          expected: 'No Rule Matched',
          description: 'Should return No Rule Matched for default case.'
        }
      ],
      changeLog: []
    },
    {
      id: 4,
      title: 'Recommendation',
      repo: 'Authorization_CSBD_DMN',
      columns: [
        { name: 'Authorization Indicator Check.Result', type: 'String', condition: 'Equals' },
        { name: 'Claim Level Bypass Check.Result', type: 'String', condition: 'Equals' },
        { name: 'Line Level Bypass Check.Result', type: 'String', condition: 'Equals' },
        { name: 'Message', type: 'String', condition: 'Equals' },
        { name: 'Decision', type: 'String', condition: 'Equals' },
      ],
      rows: [
        ['No action specified','-','-','No UM required at line level','Bypass'],
        ['-', 'Bypass UM due to Hospital based physician and apply member benefits', '-','Bypass UM due to Hospital based physician and apply member benefits','ClaimLevelBypass'],
        ['-', '-','Bypass UM, per modifier 26 and apply member benefits','Bypass UM, per modifier 26 and apply member benefits','Bypass'],
        ['-','-','Bypass UM, per prior auth pass program and apply member benefits','Bypass UM, per prior auth pass program and apply member benefits','Bypass'],
        ['-','-','-', 'No recommendation from Infinity','Manual']
      ],
      testCases: [],
      changeLog: []
    }
  ]);
  // Change log for each model
  const [activeModelIdx, setActiveModelIdx] = useState(0);
  // Only show models for selected repo in editor
  const modelsForRepo = models.filter(m => m.repo === selectedRepo);
  // When repo changes, reset activeModelIdx to 0 if needed
  useEffect(() => {
    if (modelsForRepo.length === 0) {
      setActiveModelIdx(0);
    } else if (activeModelIdx >= modelsForRepo.length) {
      setActiveModelIdx(0);
    }
  }, [selectedRepo, models.length]);

  // Enhanced logChange: if broadcast is true, log to all models in repo
  const logChange = (change, broadcast = false) => {
    setModels(models => models.map((m, i) => {
      if (m.repo === selectedRepo && (broadcast || (modelsForRepo[activeModelIdx] && m.id === modelsForRepo[activeModelIdx].id))) {
        return { ...m, changeLog: [{ ...change }, ...(m.changeLog || [])] };
      }
      return m;
    }));
  };

  // Add new model (Decision Table) for selected repo
  const addModel = () => {
    const newModel = {
      id: Date.now(),
      title: `New Decision Table`,
      repo: selectedRepo,
      columns: [
        { name: 'Condition 1', type: 'String', condition: 'Equals' },
        { name: 'Result', type: 'String', condition: 'Equals' }
      ],
      rows: [['', '']],
      testCases: [],
      changeLog: []
    };
    setModels([...models, newModel]);
    setActiveModelIdx(modelsForRepo.length); // new model is last in filtered list
  };

  // Destroy (delete) current model for selected repo
  const destroyModel = () => {
    if (modelsForRepo.length <= 1) return; // Prevent deleting last model in repo
    const modelToDelete = modelsForRepo[activeModelIdx];
    const newModels = models.filter(m => m.id !== modelToDelete.id);
    setModels(newModels);
    setActiveModelIdx(Math.max(0, activeModelIdx - 1));
  };

  // Update model (Decision Table) state for selected repo
  const updateModel = (idx, updated) => {
    const modelId = modelsForRepo[idx]?.id;
    setModels(models => models.map(m => {
      if (m.id === modelId) {
        // Always create a new object, even if contents are the same
        return { ...m, ...updated };
      }
      return m;
    }));
  };

  // Page state
  const [activePage, setActivePage] = useState('home'); // 'home', 'peerReview', 'reporting'

  // Close repo dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (repoDropdownOpen && !event.target.closest('.repo-dropdown')) {
        setRepoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [repoDropdownOpen]);

  // Filter models changed/added in selected repo
  const changedModels = models.filter(m => m.repo === selectedRepo && (m.changeLog.length > 0 || m.title.startsWith('New Decision Table')));

  const commitHistory = [
    { hash: 'a1b2c3d', message: 'Add authentication system', author: 'Tom Tran', time: '2 hours ago', branch: 'main' },
    { hash: 'e4f5g6h', message: 'Update header styling and responsive design', author: 'Jane Smith', time: '5 hours ago', branch: 'main' },
    { hash: 'i7j8k9l', message: 'Fix API endpoint URLs', author: 'John Doe', time: '1 day ago', branch: 'main' },
    { hash: 'm0n1o2p', message: 'Initial project setup', author: 'Jane Smith', time: '3 days ago', branch: 'main' }
  ];
  const commitEditor = [
    { hash: 'a1b2c3d', message: 'Add authentication system', author: 'Test 1', time: '2 hours ago', branch: 'main' },
    { hash: 'e4f5g6h', message: 'Update header styling and responsive design', author: 'Test 2', time: '5 hours ago', branch: 'main' },
    { hash: 'i7j8k9l', message: 'Fix API endpoint URLs', author: 'Test 3', time: '1 day ago', branch: 'main' },
    { hash: 'm0n1o2p', message: 'Initial project setup', author: 'Test 4', time: '3 days ago', branch: 'main' }
  ];

  const getStatusIcon = (status) => {
    const iconClass = 'w-3 h-3';
    switch(status) {
      case 'modified': return <AlertCircle className={`${iconClass} text-yellow-500`} />;
      case 'added': return <Plus className={`${iconClass} text-green-500`} />;
      case 'deleted': return <X className={`${iconClass} text-red-500`} />;
      default: return <FileText className={`${iconClass} text-gray-400`} />;
    }
  };

  const [infinityInput, setInfinityInput] = useState("");
  const [infinityMessages, setInfinityMessages] = useState([]);
  const handleInfinitySend = () => {
    if (!infinityInput.trim()) return;
    setInfinityMessages([...infinityMessages, { role: 'user', text: infinityInput }]);
    // Simulate Copilot response
    setTimeout(() => {
      setCopilotMessages(msgs => [...msgs, { role: 'copilot', text: 'This is a Copilot response to: ' + copilotInput }]);
    }, 800);
    setCopilotInput("");
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans">
      {/* Title Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
        {/* Removed window control dots */}
          </div>
          <span className="flex items-center space-x-2">
            <img src={InfinityIcon} alt="Infinity Icon" className="w-5 h-5" />
            <h1 className="text-sm font-medium text-gray-800">Infinity Business Rule Editor</h1>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4 text-gray-600 hover:text-gray-800 cursor-pointer" />
          <User className="w-4 h-4 text-gray-600 hover:text-gray-800 cursor-pointer" />
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 bg-gray-100 border-r border-gray-200 flex flex-col">
          {/* Repository Selector */}
          <div className="p-3 border-b border-gray-200 relative repo-dropdown">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Current Repository
              </span>
              <Plus className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer" onClick={() => setShowAddRepo(show => !show)} />
            </div>
            <button
              className="w-full flex items-center justify-between p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
              onClick={() => setRepoDropdownOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={repoDropdownOpen}
            >
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-800 truncate max-w-[160px]" title={selectedRepo}>{selectedRepo}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${repoDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {showAddRepo && (
              <div className="mt-2 flex space-x-2">
                <input
                  type="text"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="New repository name"
                  value={newRepoName}
                  onChange={e => setNewRepoName(e.target.value)}
                />
                <button
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                  disabled={!newRepoName.trim() || repoList.includes(newRepoName.trim())}
                  onClick={() => {
                    const name = newRepoName.trim();
                    if (name && !repoList.includes(name)) {
                      setRepoList(list => [...list, name]);
                      setSelectedRepo(name);
                      setShowAddRepo(false);
                      setNewRepoName('');
                    }
                  }}
                >
                  Add Repository
                </button>
              </div>
            )}
            {repoDropdownOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-80 overflow-auto">
                <div className="p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search repositories..."
                      value={repoSearchQuery}
                      onChange={e => setRepoSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="py-1">
                  {filteredRepos.map((repo) => (
                    <button
                      key={repo}
                      className={`w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center space-x-2 ${repo === selectedRepo ? 'bg-blue-100 font-semibold' : ''}`}
                      onClick={() => {
                        setSelectedRepo(repo);
                        setRepoDropdownOpen(false);
                        setRepoSearchQuery('');
                      }}
                    >
                      <FolderOpen className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-800 truncate max-w-[160px]" title={repo}>{repo}</span>
                    </button>
                  ))}
                  {filteredRepos.length === 0 && (
                    <div className="px-4 py-2 text-gray-500">No repositories found.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Branch Selector */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Current Branch
              </span>
              <GitBranch className="w-4 h-4 text-gray-400" />
            </div>
            <button className="w-full flex items-center justify-between p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50">
              <div className="flex items-center space-x-2">
                <GitBranch className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-800">{currentBranch}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Actions */}
          <div className="p-3 space-y-2">
            <button
              className="w-full flex items-center space-x-2 p-2 text-left hover:bg-gray-200 rounded-md"
              onClick={() => setActivePage('home')}
            >
              <Home className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Home</span>
            </button>
            <button
              className="w-full flex items-center space-x-2 p-2 text-left hover:bg-gray-200 rounded-md"
              onClick={() => setActivePage('peerReview')}
            >
              <GitPullRequest className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">View PRs</span>
            </button>
            <button className="w-full flex items-center space-x-2 p-2 text-left hover:bg-gray-200 rounded-md">
              <RefreshCw className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">View on Bitbucket</span>
            </button>
            <button
              className="w-full flex items-center space-x-2 p-2 text-left hover:bg-gray-200 rounded-md"
              onClick={() => setActivePage('reporting')}
            >
              <BarChart2 className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Insights</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {activePage === 'peerReview' ? (
            <div className="flex-1 bg-white overflow-auto">
              <div className="p-4">
                <PeerReview />
              </div>
            </div>
          ) : activePage === 'reporting' ? (
            <div className="flex-1 bg-white overflow-auto">
              <div className="p-4">
                <Reporting />
              </div>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setActiveTab('changes')}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      activeTab === 'changes' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Changes ({changedModels.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      activeTab === 'history' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    History
                  </button>
                  <button
                    onClick={() => setActiveTab('editor')}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      activeTab === 'editor' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Editor
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter files"
                    className="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {activeTab === 'changes' && (
                <div className="flex-1 flex">
                  {/* File List */}
                  <div className="w-1/2 border-r border-gray-200 bg-white flex flex-col">
                    <div className="p-4 flex-1">
                      <h3 className="text-sm font-medium text-gray-800 mb-3">Changed rules in {selectedRepo}</h3>
                      <div className="space-y-1">
                        {changedModels.length === 0 ? (
                          <div className="text-gray-500">No models changed or added in this repo.</div>
                        ) : (
                          changedModels.map((model, index) => {
                            // Determine status: 'added' if no changeLog, 'modified' if changeLog exists
                            const status = model.changeLog.length > 0 ? 'modified' : 'added';
                            // Additions/deletions: use changeLog length as a proxy
                            const additions = model.changeLog.length;
                            const deletions = 0;
                            return (
                              <div key={model.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                                {getStatusIcon(status)}
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-800">{model.title}</div>
                                  <div className="text-xs text-gray-500">+{additions} -{deletions}</div>
                                </div>
                                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Commit Section */}
                    <div className="border-t border-gray-200 p-4">
                      <div className="mb-4">
                        <input
                          type="text"
                          placeholder="Summary (required)"
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <textarea
                          placeholder="Description"
                          value={commitDescription}
                          onChange={(e) => setCommitDescription(e.target.value)}
                          rows="3"
                          className="w-full mt-2 p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        />
                      </div>
                      <button
                        disabled={!commitMessage.trim()}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md text-sm font-medium"
                      >
                        Commit to {currentBranch}
                      </button>
                      <div className="flex justify-between mt-2">
                        <button className="text-sm text-blue-600 hover:text-blue-800">Push origin</button>
                        <button className="text-sm text-gray-600 hover:text-gray-800">Undo</button>
                      </div>
                    </div>
                  </div>

                  {/* Diff View */}
                  <div className="flex-1 bg-gray-50 p-4">
                    <div className="bg-white border border-gray-200 rounded-lg h-full flex flex-col">
                      <div className="p-4 border-b border-gray-200">
                        <h4 className="text-sm font-medium text-gray-800">
                          {changedModels.length > 0 ? changedModels[0].title : 'No model selected'}
                        </h4>
                      </div>
                      <div className="p-4 font-mono text-sm flex-1 overflow-auto">
                        <div className="space-y-1">
                          <div className="flex">
                            <div className="w-8 text-gray-400 text-right pr-2">1</div>
                            <div className="text-gray-700">import React from 'react';</div>
                          </div>
                          <div className="flex">
                            <div className="w-8 text-gray-400 text-right pr-2">2</div>
                            <div className="text-gray-700">import {"{ useState }"} from 'react';</div>
                          </div>
                          <div className="flex bg-red-50">
                            <div className="w-8 text-red-600 text-right pr-2">-</div>
                            <div className="text-red-800">const Header = () =&gt; {"{"}</div>
                          </div>
                          <div className="flex bg-green-50">
                            <div className="w-8 text-green-600 text-right pr-2">+</div>
                            <div className="text-green-800">const Header = ({"{ user, onLogout }"}) =&gt; {"{"}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'history' && (
                // Model-specific History View (scoped to editor selection)
                <div className="flex-1 bg-white overflow-auto">
                  <div className="p-4">
                    <h3 className="text-md font-semibold mb-4">
                      Change History for: {modelsForRepo.length > 0 ? modelsForRepo[activeModelIdx].title : 'No model selected'}
                    </h3>
                    <div className="space-y-3">
                      {modelsForRepo.length === 0 ? (
                        <div className="text-gray-500">No model selected for this repository.</div>
                      ) : (modelsForRepo[activeModelIdx].changeLog || []).length === 0 ? (
                        <div className="text-gray-500">No changes have been saved for this model yet.</div>
                      ) : (
                        modelsForRepo[activeModelIdx].changeLog.map((change, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <GitCommit className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-gray-800">{change.title}</span>
                                <span className="text-xs text-gray-500 font-mono">{new Date(change.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>Columns: {change.columns.length}, Rows: {change.rows.length}, Test Cases: {change.testCases ? change.testCases.length : 0}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'editor' && (
                <div className="flex-1 bg-white overflow-auto flex">
                  {/* Main Editor Area */}
                  <div className="flex-1 p-4">
                    {/* ...existing code for main editor area... */}
                    {/* Toggle between Decision Table and DMN IDE */}
                    <div className="mb-4 flex gap-2 justify-end">
                      <button
                        className={`px-4 py-2 rounded-md text-sm font-medium border ${editorMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'}`}
                        onClick={() => setEditorMode('table')}
                      >
                        Decision Table IDE
                      </button>
                      <button
                        className={`px-4 py-2 rounded-md text-sm font-medium border ${editorMode === 'dmn' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'}`}
                        onClick={() => setEditorMode('dmn')}
                      >
                        DMN IDE
                      </button>
                    </div>
                    {editorMode === 'table' && (
                      <div className="mb-4 flex items-center gap-2">
                        <span className="font-medium text-gray-700">Models:</span>
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          value={activeModelIdx}
                          onChange={e => setActiveModelIdx(Number(e.target.value))}
                        >
                          {modelsForRepo.map((model, idx) => (
                            <option key={model.id} value={idx}>{model.title}</option>
                          ))}
                        </select>
                        <button
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                          onClick={addModel}
                        >
                          Add Model
                        </button>
                        <button
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                          onClick={destroyModel}
                          disabled={modelsForRepo.length <= 1}
                        >
                          Destroy Model
                        </button>
                      </div>
                    )}
                    {editorMode === 'table' && modelsForRepo.length > 0 ? (
                      <DecisionTableIDE
                        key={
                          (() => {
                            const model = modelsForRepo[activeModelIdx];
                            const str = JSON.stringify({
                              columns: model.columns,
                              rows: model.rows,
                              testCases: model.testCases
                            });
                            return model.id + '-' + hashCode(str);
                          })()
                        }
                        title={modelsForRepo[activeModelIdx].title}
                        columns={modelsForRepo[activeModelIdx].columns}
                        rows={modelsForRepo[activeModelIdx].rows}
                        testCases={modelsForRepo[activeModelIdx].testCases}
                        setTable={updated => updateModel(activeModelIdx, updated)}
                        logChange={logChange}
                      />
                    ) : editorMode === 'table' ? (
                      <div className="p-8 text-gray-500">No models for this repository. Add a model to begin.</div>
                    ) : (
                      <DMNIDE
                        model={modelsForRepo[activeModelIdx]}
                        setModel={updated => updateModel(activeModelIdx, updated)}
                        logChange={logChange}
                      />
                    )}
                  </div>
                  {/* Copilot Assistant Sidebar - Resizable */}
                  <div style={{ display: 'flex', height: '100%' }}>
                    {/* Draggable handle with grip icon */}
                    <div
                      className="group flex items-center justify-center h-full relative"
                      style={{ cursor: 'ew-resize', width: 16, background: isDraggingRef.current ? '#c7d2fe' : '#e5e7eb', zIndex: 30, position: 'relative', transition: 'background 0.2s' }}
                      onMouseDown={e => {
                        isDraggingRef.current = true;
                        startXRef.current = e.clientX;
                        startWidthRef.current = chatPanelWidthRef.current;
                      }}
                      onDoubleClick={() => setIsChatMinimized(true)}
                      title="Drag to resize chat panel (double-click to minimize)"
                      tabIndex={0}
                      aria-label="Resize chat panel"
                      aria-valuenow={chatPanelWidth}
                      aria-valuemin={MIN_CHAT_WIDTH}
                      aria-valuemax={MAX_CHAT_WIDTH}
                      role="slider"
                      onKeyDown={e => {
                        if (e.key === 'ArrowLeft') {
                          setChatPanelWidth(w => Math.max(MIN_CHAT_WIDTH, w - 10));
                          window._infinityChatPanelWidth = Math.max(MIN_CHAT_WIDTH, chatPanelWidth - 10);
                          e.preventDefault();
                        } else if (e.key === 'ArrowRight') {
                          setChatPanelWidth(w => Math.min(MAX_CHAT_WIDTH, w + 10));
                          window._infinityChatPanelWidth = Math.min(MAX_CHAT_WIDTH, chatPanelWidth + 10);
                          e.preventDefault();
                        }
                      }}
                      onMouseEnter={e => e.currentTarget.style.cursor = 'ew-resize'}
                      onFocus={e => e.currentTarget.style.cursor = 'ew-resize'}
                    >
                      <GripIcon className="pointer-events-none opacity-70 group-hover:opacity-100 transition" />
                    </div>
                    <div
                      className={`border-l bg-gray-50 flex flex-col transition-all duration-200 ${isChatMinimized ? 'w-12 min-w-0 max-w-12 items-center justify-center p-0' : 'p-4'} ${isDraggingRef.current ? 'ring-2 ring-blue-400' : ''}`}
                      style={{ overflow: 'hidden', width: isChatMinimized ? 48 : chatPanelWidth, minWidth: isChatMinimized ? 48 : MIN_CHAT_WIDTH, maxWidth: isChatMinimized ? 48 : MAX_CHAT_WIDTH, transition: 'width 0.2s' }}
                    >
                      <InfinityAssistant 
                        isMinimized={isChatMinimized} 
                        setIsMinimized={setIsChatMinimized}
                        modelDecisionTable={
                          editorMode === 'table' && modelsForRepo.length > 0
                            ? {
                                columns: modelsForRepo[activeModelIdx].columns,
                                rows: modelsForRepo[activeModelIdx].rows
                              }
                            : null
                        }
                        modelTestCases={
                          editorMode === 'table' && modelsForRepo.length > 0
                            ? modelsForRepo[activeModelIdx].testCases
                            : []
                        }
                        onSuggestion={rec => {
                          console.log('[DEBUG] onSuggestion called with:', rec);
                          if (!rec) return;
                          let recObj = rec;
                          if (typeof recObj === 'string') {
                            try { recObj = JSON.parse(recObj); } catch (e) { recObj = null; }
                          }
                          if (!recObj) return;
                          const currentModel = modelsForRepo[activeModelIdx];
                          // Helper: get current input column names
                          const currentInputColumns = (currentModel.columns || []).slice(0, (currentModel.columns || []).length - 1).map(col => col.name);
                          // Helper: remap a test case's inputs to current columns
                          function remapTestCaseInputs(tc, originalColNames) {
                            // If tc has a 'columnNames' property, use it; else, assume order matches currentInputColumns
                            const colNames = tc.columnNames || originalColNames || currentInputColumns;
                            const inputMap = {};
                            colNames.forEach((name, idx) => {
                              inputMap[name] = tc.inputs[idx];
                            });
                            // Build new inputs array in currentInputColumns order
                            return currentInputColumns.map(colName => inputMap[colName] !== undefined ? inputMap[colName] : '');
                          }
                          // Only update test suite if testCases is present or recObj is a valid test case array
                          if (Object.prototype.hasOwnProperty.call(recObj, 'testCases')) {
                            const existing = currentModel.testCases || [];
                            let incoming = Array.isArray(recObj.testCases) ? recObj.testCases : [recObj.testCases];
                            // Try to get column names from recObj if present
                            let originalColNames = recObj.columnNames || null;
                            // Remap all incoming test cases
                            incoming = incoming.map(tc => {
                              // If tc has columnNames, use them; else, try to infer from recObj or assume current
                              const colNames = tc.columnNames || originalColNames || currentInputColumns;
                              return {
                                ...tc,
                                inputs: remapTestCaseInputs(tc, colNames)
                              };
                            });
                            // Deduplicate by inputs and expected
                            const merged = [...existing, ...incoming].filter((tc, idx, arr) =>
                              arr.findIndex(other =>
                                JSON.stringify(other.inputs) === JSON.stringify(tc.inputs) && other.expected === tc.expected
                              ) === idx
                            );
                            console.log('[DEBUG] Merged & remapped testCases:', merged);
                            updateModel(activeModelIdx, { testCases: merged });
                          } else if (Array.isArray(recObj) && recObj.length > 0 && recObj.every(tc => tc && Array.isArray(tc.inputs) && tc.expected !== undefined)) {
                            const existing = currentModel.testCases || [];
                            let incoming = recObj;
                            // Try to get column names from recObj if present
                            let originalColNames = recObj.columnNames || null;
                            // Remap all incoming test cases
                            incoming = incoming.map(tc => {
                              const colNames = tc.columnNames || originalColNames || currentInputColumns;
                              return {
                                ...tc,
                                inputs: remapTestCaseInputs(tc, colNames)
                              };
                            });
                            // Deduplicate by inputs and expected
                            const merged = [...existing, ...incoming].filter((tc, idx, arr) =>
                              arr.findIndex(other =>
                                JSON.stringify(other.inputs) === JSON.stringify(tc.inputs) && other.expected === tc.expected
                              ) === idx
                            );
                            console.log('[DEBUG] Merged & remapped testCases:', merged);
                            updateModel(activeModelIdx, { testCases: merged });
                          }
                          // Only update decision table if columns/rows are present and NOT testCases
                          else if (recObj.columns || recObj.rows) {
                            let updated = {};
                            if (recObj.columns) {
                              const outputNames = ['result', 'output', 'decision'];
                              const existingCols = currentModel.columns || [];
                              const recColNames = recObj.columns.map(c => c.name);
                              const existingColNames = existingCols.map(c => c.name);
                              // Find output column index in existing columns
                              const outputIdx = existingCols.findIndex(col => outputNames.includes(col.name.trim().toLowerCase()));
                              // Identify net new columns
                              const newCols = recObj.columns.filter(
                                col => !existingCols.some(ec => ec.name === col.name)
                              );
                              // Insert new columns before output column
                              let mergedCols;
                              if (outputIdx === -1) {
                                mergedCols = [...existingCols, ...newCols];
                              } else {
                                mergedCols = [
                                  ...existingCols.slice(0, outputIdx),
                                  ...newCols,
                                  ...existingCols.slice(outputIdx)
                                ];
                              }
                              // Patch: enforce output column always last after merge
                              // Find output column in mergedCols
                              const outputColIdx = mergedCols.findIndex(col => outputNames.includes(col.name.trim().toLowerCase()));
                              if (outputColIdx !== -1) {
                                const outputCol = mergedCols[outputColIdx];
                                mergedCols = [
                                  ...mergedCols.filter((_, idx) => idx !== outputColIdx),
                                  outputCol
                                ];
                              }
                              updated.columns = mergedCols;
                              // Build a mapping from recObj column name to its index in recObj.columns
                              const recColIndex = {};
                              recObj.columns.forEach((col, idx) => { recColIndex[col.name] = idx; });
                              // Realign row values to match the new column order
                              if (recObj.rows && Array.isArray(recObj.rows)) {
                                updated.rows = recObj.rows.map(row => {
                                  // Map values from recObj row to new column order
                                  return mergedCols.map(col => {
                                    const idx = recColIndex[col.name];
                                    return idx !== undefined ? row[idx] : '';
                                  });
                                });
                              } else {
                                // If no rows, preserve existing rows
                                updated.rows = (currentModel.rows || []).map(row => {
                                  const diff = mergedCols.length - row.length;
                                  return diff > 0 ? [...row, ...Array(diff).fill('')] : row;
                                });
                              }
                            }
                            updateModel(activeModelIdx, updated);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-blue-600 text-white px-4 py-2 text-xs flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <Upload className="w-3 h-3" />
            <span>Push 2 commits to origin/main</span>
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Last fetch: 2 minutes ago</span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InfinityReactUI;