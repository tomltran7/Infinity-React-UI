import React, { useState } from 'react';
import { Bot, Send } from 'lucide-react';

const CopilotAssistant = ({ onSuggestion }) => {
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
    const currentInput = input;
    setInput('');
    setIsTyping(true);
    // Call OpenAI backend
    const response = await getOpenAIResponse(currentInput);
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-blue-50">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-900">Infinity Assistant</span>
        </div>
        <button
          onClick={clearConversation}
          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
          title="Clear conversation"
        >
          🗑️
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${
              message.type === 'user'
                ? 'bg-blue-100 ml-4'
                : 'bg-gray-100 mr-4'
            }`}
          >
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            {message.type === 'assistant' && message.content.includes('rule ') && (
              <button
                onClick={() => onSuggestion && onSuggestion(message.content)}
                className="mt-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Apply to Editor
              </button>
            )}
          </div>
        ))}
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
    </div>
  );
};

export default CopilotAssistant;
