/**
 * Chat Panel Component
 * Handles AI chat with streaming, markdown rendering, and code snippets
 */

import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../contexts/SessionContext';
import { logMessage, logCode, logConsole } from '../services/dataLogger';
import { streamChatCompletion, streamChatCompletionWithBudget } from '../utils/openaiStream';
import { getUserAccessLevel } from '../services/aiUsage';
import { 
  LEVEL_INSTRUCTION_PREFIX,
  beginnerPrompt,
  intermediatePrompt,
  experiencedPrompt,
} from '../prompts/codingLevels';
import CodeModal from './CodeModal';
import BudgetErrorModal from './BudgetErrorModal';
import './ChatPanel.css';

const ChatPanel = ({ onReplaceCode, getCodeContent, getConsoleContent }) => {
  const { activeSession, conversationHistory, getSystemPriming } = useSession();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [codingLevel, setCodingLevel] = useState('beginner');
  const [selectedModel, setSelectedModel] = useState('gpt-5-nano');
  const [modelName, setModelName] = useState(import.meta.env.VITE_DEFAULT_MODEL || 'gpt-4');
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedContext, setAttachedContext] = useState({ includeCode: false, includeConsole: false });
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [currentCodeSnippet, setCurrentCodeSnippet] = useState({ code: '', lang: '' });
  const [consoleHasContent, setConsoleHasContent] = useState(false);
  const [budgetErrorVisible, setBudgetErrorVisible] = useState(false);
  const [userAccessLevel, setUserAccessLevel] = useState('standard');

  const chatBodyRef = useRef(null);
  const streamingMessageRef = useRef(null);

  // Load conversation history from session
  useEffect(() => {
    if (conversationHistory && conversationHistory.length > 0) {
      // Filter out system messages for display
      const displayMessages = conversationHistory
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'bot',
          content: msg.content,
        }));
      setMessages(displayMessages);
    } else {
      setMessages([]);
    }
  }, [conversationHistory]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check console content availability
  useEffect(() => {
    const checkConsole = async () => {
      if (getConsoleContent) {
        const content = await getConsoleContent();
        setConsoleHasContent(content && content.trim().length > 0);
      }
    };
    checkConsole();
  }, [getConsoleContent]);

  // Fetch user access level
  useEffect(() => {
    const fetchAccessLevel = async () => {
      try {
        const level = await getUserAccessLevel();
        setUserAccessLevel(level);
      } catch (err) {
        console.error('Error fetching access level:', err);
      }
    };
    fetchAccessLevel();
  }, []);

  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      requestAnimationFrame(() => {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
      });
    }
  };

  const getLevelPrompt = (level) => {
    switch (level) {
      case 'beginner':
        return beginnerPrompt;
      case 'intermediate':
        return intermediatePrompt;
      case 'experienced':
        return experiencedPrompt;
      default:
        return beginnerPrompt;
    }
  };

  const handleSendMessage = async () => {
    if (!activeSession) {
      alert('No active session. Please select or create a session first.');
      return;
    }

    const text = inputText.trim();
    if (!text && !attachedContext.includeCode && !attachedContext.includeConsole) {
      return;
    }

    // Fetch context at send time
    const finalContext = { code: null, console: null };
    if (attachedContext.includeCode && getCodeContent) {
      finalContext.code = await getCodeContent();
    }
    if (attachedContext.includeConsole && getConsoleContent) {
      finalContext.console = await getConsoleContent();
    }

    // Build display message with indicators
    let displayMessage = text;
    if (finalContext.code) displayMessage += '\n[code]';
    if (finalContext.console) displayMessage += '\n[console logs]';

    // Add user message to UI
    if (displayMessage.trim()) {
      setMessages(prev => [...prev, { role: 'user', content: displayMessage }]);
    }

    setInputText('');
    setAttachedContext({ includeCode: false, includeConsole: false });

    // Log context to database
    const sessionId = activeSession.id;
    const conversationId = activeSession.current_conversation_id;
    let codeContextId = null;
    let consoleContextId = null;

    if (finalContext.code && finalContext.code.trim()) {
      codeContextId = await logCode(finalContext.code, sessionId, 'chat_context');
    }
    if (finalContext.console && finalContext.console.trim()) {
      consoleContextId = await logConsole(finalContext.console, sessionId, 'chat_context');
    }

    // Log user message
    if (text) {
      await logMessage({
        conversation_id: conversationId,
        role: 'user',
        content: text,
        coding_level: codingLevel,
        code_context_id: codeContextId,
        console_context_id: consoleContextId,
      });
    }

    // Build conversation for AI
    const conversation = [];
    
    // Add system priming
    conversation.push({
      role: 'system',
      content: getSystemPriming(),
    });

    // Add coding level instructions
    const levelInstructions = getLevelPrompt(codingLevel);
    if (levelInstructions) {
      conversation.push({
        role: 'system',
        content: `${LEVEL_INSTRUCTION_PREFIX}\n\n${levelInstructions}`,
      });
    }

    // Add conversation history
    conversationHistory.forEach(msg => {
      conversation.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // Build context string
    let contextStr = '';
    if (finalContext.code && finalContext.code.trim()) {
      contextStr += `The user has provided the following code for context:\n--- START OF CODE ---\n${finalContext.code}\n--- END OF CODE ---\n\n`;
    }
    if (finalContext.console && finalContext.console.trim()) {
      contextStr += `The user has provided the following console output for context:\n--- START OF CONSOLE OUTPUT ---\n${finalContext.console}\n--- END OF CONSOLE OUTPUT ---\n\n`;
    }

    const userPrompt = text || 'Please analyze the provided context.';
    const fullPrompt = `${contextStr}User question: ${userPrompt}`;

    conversation.push({
      role: 'user',
      content: fullPrompt,
    });

    // Stream response
    setIsStreaming(true);
    streamingMessageRef.current = '';

    try {
      let fullResponse = '';
      let budgetStatus = null;
      let usageData = null;
      let isFirstChunk = true;

      // Determine which model to use
      const actualModel = selectedModel;

      for await (const event of streamChatCompletionWithBudget(conversation, actualModel)) {
        if (event.type === 'content') {
          fullResponse += event.content;
          streamingMessageRef.current = fullResponse;
          
          if (isFirstChunk) {
            // Add bot message only when first chunk arrives
            isFirstChunk = false;
            setMessages(prev => [...prev, { role: 'bot', content: fullResponse, streaming: true }]);
          } else {
            // Update last message
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: 'bot',
                content: fullResponse,
                streaming: true,
              };
              return newMessages;
            });
          }
        } else if (event.type === 'budget_status') {
          budgetStatus = event;
          usageData = event.usage;
        }
      }

      // Finalize message
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'bot',
          content: fullResponse,
          streaming: false,
        };
        return newMessages;
      });

      // Log assistant message
      await logMessage({
        conversation_id: conversationId,
        role: 'assistant',
        content: fullResponse,
        coding_level: codingLevel,
        ai_model: actualModel,
        prompt_tokens: usageData?.input_tokens || 0,
        completion_tokens: usageData?.output_tokens || 0,
      });

      // Check budget status and show modal if budget exceeded
      if (budgetStatus && !budgetStatus.has_budget) {
        setBudgetErrorVisible(true);
      }

    } catch (error) {
      console.error('Streaming error:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'bot',
          content: `Error: ${error.message}`,
          streaming: false,
        };
        return newMessages;
      });
    } finally {
      setIsStreaming(false);
      streamingMessageRef.current = null;
    }
  };

  const handleModelUpdate = () => {
    const newModel = prompt('Enter new model name:', modelName);
    if (newModel && newModel.trim()) {
      setModelName(newModel.trim());
      setMessages([]);
      alert(`Model updated to: ${newModel}`);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const openCodeModal = (code, lang) => {
    setCurrentCodeSnippet({ code, lang });
    setCodeModalOpen(true);
  };

  const closeCodeModal = () => {
    setCodeModalOpen(false);
    setCurrentCodeSnippet({ code: '', lang: '' });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentCodeSnippet.code);
    closeCodeModal();
  };

  const handleReplaceCode = () => {
    if (onReplaceCode) {
      onReplaceCode(currentCodeSnippet.code);
    }
    closeCodeModal();
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const label = isUser ? 'User' : message.role === 'system' ? 'System' : 'AI Bot';
    const color = isUser ? '#fbe2d7' : message.role === 'system' ? '#d7e4fb' : '#d8f6d8';
    const align = isUser ? 'align-right' : 'align-left';

    // Split content by code blocks
    const segments = message.content.split(/```([\s\S]*?)```/g);

    return (
      <div key={index} className={`chat-msg-wrap ${align}`}>
        <div className="chat-label">{label}</div>
        <div className="chat-bubble" style={{ backgroundColor: color }}>
          {segments.map((seg, idx) => {
            if (idx % 2 === 0) {
              // Markdown text
              if (seg.trim()) {
                const html = DOMPurify.sanitize(marked.parse(seg));
                return <div key={idx} dangerouslySetInnerHTML={{ __html: html }} />;
              }
            } else {
              // Code block
              let codeText = seg;
              let lang = '';
              const firstNL = seg.indexOf('\n');
              if (firstNL !== -1) {
                const firstLine = seg.slice(0, firstNL).trim();
                if (/^[a-zA-Z0-9+#-]+$/.test(firstLine)) {
                  lang = firstLine;
                  codeText = seg.slice(firstNL + 1);
                }
              }

              return (
                <button
                  key={idx}
                  className="code-btn"
                  onClick={() => openCodeModal(codeText, lang)}
                >
                  VIEW CODE SNIPPET
                </button>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="chat-panel">
      <div className="control-group">
        <label htmlFor="coding-level-selector">Coding Level:</label>
        <select
          id="coding-level-selector"
          className="chat-level-selector"
          value={codingLevel}
          onChange={(e) => setCodingLevel(e.target.value)}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="experienced">Experienced</option>
        </select>

        <label htmlFor="model-selector" style={{ marginLeft: '15px' }}>AI Model:</label>
        <select
          id="model-selector"
          className="chat-level-selector"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          <option value="gpt-5-nano">gpt-5-nano</option>
          <option value="gpt-5-mini">gpt-5-mini</option>
          <option value="gpt-5">gpt-5</option>
        </select>
      </div>

      <div className="chat-body" ref={chatBodyRef}>
        <div className="chat-disclaimer">
          All activity is stored and may be reviewed by course staff.
        </div>
        {messages.map((msg, idx) => renderMessage(msg, idx))}
        {isStreaming && (
          <div className="chat-spinner" style={{ display: 'flex' }}>
            <div className="loader"></div>
          </div>
        )}
      </div>

      <div className="chat-input-area">
        <div className="chat-context-controls">
          <button
            className="context-btn"
            onClick={() => setAttachedContext(prev => ({ ...prev, includeCode: true }))}
          >
            Add Code to Chat
          </button>
          <button
            className="context-btn"
            onClick={() => setAttachedContext(prev => ({ ...prev, includeConsole: true }))}
            disabled={!consoleHasContent}
          >
            Add Console to Chat
          </button>
          {(attachedContext.includeCode || attachedContext.includeConsole) && (
            <div className="context-indicator">
              ✅ {attachedContext.includeCode && attachedContext.includeConsole
                ? 'Code & Console context will be sent.'
                : attachedContext.includeCode
                ? 'Code context will be sent.'
                : 'Console context will be sent.'}
            </div>
          )}
        </div>

        <div className="chat-input-row">
          <textarea
            id="chat-input"
            rows="2"
            placeholder="Type your message…"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          <button id="chat-send" onClick={handleSendMessage} disabled={isStreaming}>
            SEND
          </button>
        </div>
      </div>

      {/* Code Modal */}
      <CodeModal
        isOpen={codeModalOpen}
        code={currentCodeSnippet.code}
        lang={currentCodeSnippet.lang}
        onClose={closeCodeModal}
        onCopy={handleCopyCode}
        onReplace={handleReplaceCode}
      />

      {/* Budget Error Modal */}
      <BudgetErrorModal
        visible={budgetErrorVisible}
        onClose={() => setBudgetErrorVisible(false)}
        accessLevel={userAccessLevel}
      />
    </div>
  );
};

export default ChatPanel;

