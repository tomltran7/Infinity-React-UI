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
import { Bot, Send, ChevronRight } from 'lucide-react';

const InfinityAssistant = ({ onSuggestion, isMinimized, setIsMinimized, modelDecisionTable, modelTestCases }) => {
  const [messages, setMessages] = useState([
    {
      type: 'assistant',
      content: "Hello! I'm your Infinity assistant. I can help you write Decision Table rules, create DMN models, and debug your business logic. Try asking me about rule syntax or decision table best practices!"
    }
  ]);
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
      return data.reply || 'Sorry, I could not get a response.';
    } catch (err) {
      return 'Error contacting assistant. Please try again.';
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
    const refersToTable = /decision table|this table|the table|above table|extracted table/i.test(input);
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
    const response = await getOpenAIResponse(contextInput);
    setMessages(msgs => [...msgs, { type: 'assistant', content: response }]);
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
        </div>
      </div>
      <>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => {
            // Detect if this is an extracted decision table JSON message
            let parsedJson = null;
            if (
              message.type === 'assistant' &&
              message.content.startsWith('Here is the extracted decision table JSON:')
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
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                )}
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
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSendMessage()}
              placeholder="Ask about DRL rules, DMN decisions..."
              disabled={isTyping}
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
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
