// Preview component for decision table JSON
const DecisionTablePreview = ({ data, onAsk }) => {
  if (!data || !data.columns || !data.rows) return null;
  return (
    <div className="my-2 border rounded bg-white shadow p-2 overflow-x-auto">
      <div className="font-semibold text-xs text-gray-700 mb-1">Extracted Decision Table</div>
      <table className="min-w-full border text-xs">
        <thead>
          <tr>
            {data.columns.map((col, idx) => (
              <th key={idx} className="border p-1 bg-gray-100">{col.name} <span className="text-gray-400">({col.type})</span></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="border p-1">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {onAsk && (
        <button
          className="mt-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          onClick={async () => {
            // Send the JSON as user input
            const jsonString = JSON.stringify(data, null, 2);
            onAsk(jsonString);
          }}
        >
          Ask about this table
        </button>
      )}
    </div>
  );
};
import React, { useState } from 'react';
import { Bot, Send, ChevronRight, Bug, GripIcon } from 'lucide-react';

const InfinityAssistant = ({ onSuggestion, isMinimized, setIsMinimized, modelDecisionTable, modelTestCases }) => {
  // No custom drag logic needed for native resize
  // Debug toggle state
  const [showDebug, setShowDebug] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'assistant',
      content: "Hello! I'm your Infinity assistant. I can help you write Decision Table rules, create DMN models, and debug your business logic. Try asking me about rule syntax or decision table best practices!"
    }
  ]);
  // Helper: check if last user message is about test suite/test cases
  const lastUserMessage = messages.length > 0 ? messages.filter(m => m.type === 'user').slice(-1)[0]?.content || '' : '';
  const isTestSuiteContext = /test case|test cases|test suite|add test|update test|suggest test|assert|verify|validation|scenario/i.test(lastUserMessage);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);


  // Call your backend API to get OpenAI response
  const getOpenAIResponse = async (userInput) => {
    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { reply: 'Error contacting assistant. Please try again.' };
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    if (input.trim().toLowerCase() === 'clear') {
      clearConversation();
      setInput('');
      return;
    }
    const userMessage = { type: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Check if user refers to the decision table or test cases
    const refersToTable = /decision table|this table|the table|above table|extracted table|model|this model|the model|above model|extracted model/i.test(input);
    const refersToTest = /test case|test cases|test suite|test|expected output|assert|pass|fail|verify|validation|scenario/i.test(input);
    let contextInput = input;
    // If both, include both; if only one, include that
    if ((refersToTable || refersToTest) && (modelDecisionTable && modelDecisionTable.columns && modelDecisionTable.rows)) {
      contextInput = `User question: ${input}`;
      contextInput += `\n\nDecision Table JSON:\n${JSON.stringify(modelDecisionTable, null, 2)}`;
      if (refersToTest && modelTestCases && Array.isArray(modelTestCases) && modelTestCases.length > 0) {
        contextInput += `\n\nTest Suite (test cases):\n${JSON.stringify(modelTestCases, null, 2)}`;
      }
    } else if (refersToTest && modelTestCases && Array.isArray(modelTestCases) && modelTestCases.length > 0) {
      contextInput = `User question: ${input}`;
      contextInput += `\n\nTest Suite (test cases):\n${JSON.stringify(modelTestCases, null, 2)}`;
    }
    const data = await getOpenAIResponse(contextInput);
    // Always parse recommendation as object if it's a string
    let recObj = data.recommendation;
    if (typeof recObj === 'string') {
      try { recObj = JSON.parse(recObj); } catch (e) { recObj = null; }
    }
    setMessages(msgs => [...msgs, {
      type: 'assistant',
      content: data.reply,
      recommendation: recObj || null
    }]);
    setIsTyping(false);
  };

  const clearConversation = () => {
    setMessages([
      {
        type: 'assistant',
        content: "Hello! I'm your Infinity Assistant. How can I help you with your business rules today?"
      }
    ]);
  };

  if (isMinimized) {
    // Center the restore button in the minimized sidebar, use ChevronRight icon
    return (
      <div className="flex flex-col h-full w-full items-center justify-center">
        <button
          onClick={() => setIsMinimized(false)}
          className="p-2 text-gray-500 hover:text-blue-600 rounded-full bg-white shadow border"
          title="Restore chat"
          aria-label="Restore chat"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    );
  }
  // ...existing code for expanded state...
  // Handler for 'Ask about this table' button
  const handleAskAboutTable = async (jsonString) => {
    setIsTyping(true);
    const response = await getOpenAIResponse(jsonString);
    setMessages(msgs => [...msgs, { type: 'assistant', content: response }]);
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-blue-50">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-900">Infinity Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearConversation}
            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
            title="Clear conversation"
          >
            🗑️
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-gray-500 hover:text-blue-600 rounded"
            title="Minimize chat"
            aria-label="Minimize chat"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><rect x="4" y="9" width="12" height="2" rx="1" fill="currentColor"/></svg>
          </button>
          <button
            onClick={() => setShowDebug(v => !v)}
            className={`p-1 ${showDebug ? 'bg-yellow-100 text-yellow-700' : 'text-gray-500'} hover:text-yellow-700 rounded`}
            title={showDebug ? 'Hide debug info' : 'Show debug info'}
            aria-label="Toggle debug info"
          >
            <Bug className="w-5 h-5" />
          </button>
        </div>
      </div>
      <>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => {
            // Detect if this is an extracted decision table JSON message
            let parsedJson = null;
            if (
              message.type === 'assistant' &&
              message.content && message.content.startsWith('Here is the extracted decision table JSON:')
            ) {
              try {
                const match = message.content.match(/\n\n([\s\S]*)$/);
                if (match) parsedJson = JSON.parse(match[1]);
              } catch (e) { /* ignore */ }
            }
            return (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-100 ml-4'
                    : 'bg-gray-100 mr-4'
                }`}
              >
                {parsedJson ? (
                  <DecisionTablePreview data={parsedJson} onAsk={handleAskAboutTable} />
                ) : (
                  <>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    {/* DEBUG: Show context detection for troubleshooting */}
                    {showDebug && (
                      <pre className="bg-blue-50 text-xs p-2 rounded border border-blue-200 mb-2 overflow-x-auto">
                        <strong>Debug Context:</strong> {'isTestSuiteContext: ' + JSON.stringify(isTestSuiteContext)}
                        {'\nlastUserMessage: ' + JSON.stringify(lastUserMessage)}
                      </pre>
                    )}
                    {/* DEBUG: Show recObj and isTestCasesArray for troubleshooting */}
                    {(() => {
                      let recObj = message.recommendation;
                      if (typeof recObj === 'string') {
                        try { recObj = JSON.parse(recObj); } catch (e) { recObj = null; }
                      }
                      const isTestCasesArray = Array.isArray(recObj) && recObj.length > 0 && recObj.some(tc => tc && Array.isArray(tc.inputs) && tc.expected !== undefined);
                      return (
                        <>
                          {showDebug && (
                            <pre className="bg-pink-50 text-xs p-2 rounded border border-pink-200 mb-2 overflow-x-auto">
                              <strong>Debug recObj:</strong> {JSON.stringify(recObj, null, 2)}
                              {'\nisTestCasesArray: ' + JSON.stringify(isTestCasesArray)}
                            </pre>
                          )}
                          {/* Show Apply to Test Suite button if valid test case array and context */}
                          {isTestCasesArray && isTestSuiteContext && (
                            (() => {
                              const suggested = recObj;
                              const existing = Array.isArray(modelTestCases) ? modelTestCases : [];
                              const isDuplicate = (a, b) => {
                                if (!a || !b) return false;
                                const inputsEqual = Array.isArray(a.inputs) && Array.isArray(b.inputs) && a.inputs.length === b.inputs.length && a.inputs.every((v, i) => v === b.inputs[i]);
                                return inputsEqual && a.expected === b.expected;
                              };
                              const newTestCases = suggested.filter(sugg => !existing.some(exist => isDuplicate(sugg, exist)));
                              let updatedTestCases = [];
                              if (existing.length === 0) {
                                updatedTestCases = suggested;
                              } else if (newTestCases.length > 0) {
                                updatedTestCases = [...existing, ...newTestCases];
                              } else {
                                updatedTestCases = existing;
                              }
                              const handleApplyToTestSuite = () => {
                                if (newTestCases.length === 0) {
                                  alert('All suggested test cases are already present. No new test cases added.');
                                  return;
                                }
                                if (onSuggestion) {
                                  onSuggestion({ testCases: updatedTestCases });
                                  alert(`${newTestCases.length > 0 ? newTestCases.length : suggested.length} test case(s) applied to the Test Suite.`);
                                }
                              };
                              return (
                                <button
                                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                                  onClick={handleApplyToTestSuite}
                                >
                                  Apply to Test Suite
                                </button>
                              );
                            })()
                          )}
                        </>
                      );
                    })()}
                  </>
                )
                }
              </div>
            );
          })}
          {isTyping && (
            <div className="bg-gray-100 mr-4 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                <span className="text-sm text-gray-600 ml-2">Assistant is thinking...</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !isTyping) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about DRL rules, DMN decisions..."
              disabled={isTyping}
              rows={2}
              style={{ minHeight: 40, maxHeight: 200, resize: 'vertical' }}
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 overflow-auto"
            />
            <button
              onClick={handleSendMessage}
              disabled={isTyping || !input.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Powered by OpenAI • {messages.filter(m => m.type === 'user').length} messages sent
          </div>
        </div>
      </>
    </div>
  );
};

export default InfinityAssistant;
