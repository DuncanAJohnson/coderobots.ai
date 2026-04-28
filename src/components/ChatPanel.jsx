/**
 * Chat Panel Component
 * Handles AI chat with streaming, markdown rendering, and code snippets
 * Uses localStorage for conversation persistence (no cloud storage)
 */

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { streamTutorCompletion } from '../utils/aiStream';
import CodeModal from './CodeModal';
import ConsoleModal from './ConsoleModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useHardware } from '../contexts/HardwareContext';
import './ChatPanel.css';

const STORAGE_KEY = 'coderobots_chat_history';
const SETTINGS_KEY = 'coderobots_chat_settings';

const ChatPanel = forwardRef(({ onReplaceCode, getCodeContent, getConsoleContent, isRobotConnected }, ref) => {

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [codingLevel, setCodingLevel] = useState('beginner');
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedContext, setAttachedContext] = useState({ includeCode: false, includeConsole: false });
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [currentCodeSnippet, setCurrentCodeSnippet] = useState({ code: '', lang: '' });
  const [consoleModalOpen, setConsoleModalOpen] = useState(false);
  const [currentConsoleContent, setCurrentConsoleContent] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const { t, lang } = useLanguage();
  const { isMicrobit, isLegoEducation, isEsp32 } = useHardware();

  useImperativeHandle(ref, () => ({
    clearHistory: () => {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
    },
  }));

  const chatBodyRef = useRef(null);
  const streamingMessageRef = useRef(null);

  // Load conversation history from localStorage on mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(STORAGE_KEY);
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }

      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.codingLevel) {
          setCodingLevel(settings.codingLevel);
        }
      }
    } catch (error) {
      console.warn('Failed to load chat history from localStorage:', error);
    }
    // Mark as loaded after attempting to restore state
    setIsLoaded(true);
  }, []);

  // Save conversation history to localStorage when messages change (only after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save chat history to localStorage:', error);
    }
  }, [messages, isLoaded]);

  // Save settings when coding level changes (only after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ codingLevel }));
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error);
    }
  }, [codingLevel, isLoaded]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      requestAnimationFrame(() => {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
      });
    }
  };

  const getHwMode = () => {
    if (isLegoEducation) return 'lego';
    if (isMicrobit) return 'microbit';
    if (isEsp32) return 'esp32';
    return 'spike';
  };

  const handleClearHistory = () => {
    if (confirm(t('clearConfirm'))) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleSendMessage = async () => {
    const userText = inputText.trim();
    if (!userText && !attachedContext.includeCode && !attachedContext.includeConsole) {
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

    const hwMode = getHwMode();
    const codeFenceLang = hwMode === 'esp32' ? 'cpp' : 'python';

    // Build display message with wrapped code and console (UI-only — server gets the
    // raw code/console fields and does its own wrapping inside the system prompt).
    let displayText = userText;
    if (finalContext.code) {
      displayText += '\n```' + codeFenceLang + '\n' + finalContext.code + '\n```';
    }
    if (finalContext.console) {
      displayText += '\n````\n' + finalContext.console + '\n````';
    }

    if (displayText.trim()) {
      setMessages(prev => [...prev, { role: 'user', content: displayText }]);
    }

    setInputText('');
    setAttachedContext({ includeCode: false, includeConsole: false });

    // Server-side pipeline payload: history is the prior turns only.
    const history = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    const payload = {
      history,
      user_msg: userText || 'Please analyze the provided context.',
      hw_mode: hwMode,
      level: codingLevel,
      lang,
    };
    if (finalContext.code && finalContext.code.trim()) {
      payload.code = finalContext.code;
    }
    if (finalContext.console && finalContext.console.trim()) {
      payload.console = finalContext.console;
    }

    // Stream response
    setIsStreaming(true);
    streamingMessageRef.current = '';

    try {
      let fullResponse = '';
      const thinking = [];

      // Insert a placeholder bot message immediately so the thinking trace is
      // visible while progress events arrive (before the first content token).
      // We then keep updating the last message in place.
      setMessages(prev => [
        ...prev,
        { role: 'bot', content: '', thinking: [], streaming: true },
      ]);

      const updateLast = (patch) => {
        setMessages(prev => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], ...patch };
          return next;
        });
      };

      for await (const event of streamTutorCompletion(payload)) {
        if (event.type === 'progress') {
          thinking.push({ stage: event.stage, payload: event.payload || {} });
          updateLast({ thinking: [...thinking] });
        } else if (event.type === 'content') {
          fullResponse += event.content;
          streamingMessageRef.current = fullResponse;
          updateLast({ content: fullResponse, thinking: [...thinking], streaming: true });
        }
      }

      // Finalize message
      updateLast({ content: fullResponse, thinking: [...thinking], streaming: false });

    } catch (error) {
      console.error('Streaming error:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].streaming) {
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            role: 'bot',
            content: `Error: ${error.message}`,
            streaming: false,
          };
        } else {
          newMessages.push({
            role: 'bot',
            content: `Error: ${error.message}`,
            streaming: false,
          });
        }
        return newMessages;
      });
    } finally {
      setIsStreaming(false);
      streamingMessageRef.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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

  const openConsoleModal = (consoleContent) => {
    setCurrentConsoleContent(consoleContent);
    setConsoleModalOpen(true);
  };

  const closeConsoleModal = () => {
    setConsoleModalOpen(false);
    setCurrentConsoleContent('');
  };

  const handleCopyConsole = () => {
    navigator.clipboard.writeText(currentConsoleContent);
    closeConsoleModal();
  };

  const renderThinkingTrace = (thinking, streaming) => {
    if (!thinking || thinking.length === 0) return null;
    const labels = {
      summarize: t('thinkingSummarize'),
      doc_routing: t('thinkingDocRouting'),
      outline: t('thinkingOutline'),
    };
    return (
      <details className="chat-thinking" open={streaming}>
        <summary>
          {streaming ? t('thinkingInProgress') : t('thinkingDone')} ({thinking.length} {t('thinkingSteps')})
        </summary>
        <ul className="chat-thinking-steps">
          {thinking.map((step, idx) => {
            const label = labels[step.stage] || step.stage;
            const p = step.payload || {};
            let detail = null;
            if (step.stage === 'summarize') {
              detail = p.summarized
                ? t('thinkingSummarized')
                    .replace('{before}', p.before_tokens)
                    .replace('{after}', p.after_tokens)
                : t('thinkingNotSummarized');
            } else if (step.stage === 'doc_routing' && Array.isArray(p.bundles)) {
              detail = p.bundles.length
                ? t('thinkingDocsLabel').replace('{bundles}', p.bundles.join(', '))
                : t('thinkingDocsNone');
            } else if (step.stage === 'outline' && p.outline) {
              detail = p.outline;
            }
            return (
              <li key={idx}>
                <strong>{label}</strong>
                {detail && (
                  <div className="chat-thinking-detail">{detail}</div>
                )}
              </li>
            );
          })}
        </ul>
      </details>
    );
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const label = isUser ? t('userLabel') : message.role === 'system' ? 'System' : t('botLabel');
    const color = isUser ? '#fbe2d7' : message.role === 'system' ? '#d7e4fb' : '#d8f6d8';
    const align = isUser ? 'align-right' : 'align-left';

    // First split by console blocks (4 backticks)
    const consoleSegments = (message.content || '').split(/````([\s\S]*?)````/g);

    return (
      <div key={index} className={`chat-msg-wrap ${align}`}>
        <div className="chat-label">{label}</div>
        <div className="chat-bubble" style={{ backgroundColor: color }}>
          {!isUser && renderThinkingTrace(message.thinking, message.streaming)}
          {consoleSegments.map((consoleSeg, consoleIdx) => {
            if (consoleIdx % 2 === 1) {
              // This is a console block
              const consoleText = consoleSeg.trim();
              return (
                <button
                  key={consoleIdx}
                  className="console-btn"
                  onClick={() => openConsoleModal(consoleText)}
                >
                  {t('viewConsoleLog')}
                </button>
              );
            } else {
              // Not a console block, check for code blocks (3 backticks)
              const codeSegments = consoleSeg.split(/```([\s\S]*?)```/g);
              
              return codeSegments.map((codeSeg, codeIdx) => {
                if (codeIdx % 2 === 0) {
                  // Markdown text
                  if (codeSeg.trim()) {
                    const html = DOMPurify.sanitize(marked.parse(codeSeg));
                    return <div key={`${consoleIdx}-${codeIdx}`} dangerouslySetInnerHTML={{ __html: html }} />;
                  }
                } else {
                  // Code block
                  let codeText = codeSeg;
                  let lang = '';
                  const firstNL = codeSeg.indexOf('\n');
                  if (firstNL !== -1) {
                    const firstLine = codeSeg.slice(0, firstNL).trim();
                    if (/^[a-zA-Z0-9+#-]+$/.test(firstLine)) {
                      lang = firstLine;
                      codeText = codeSeg.slice(firstNL + 1);
                    }
                  }

                  return (
                    <button
                      key={`${consoleIdx}-${codeIdx}`}
                      className="code-btn"
                      onClick={() => openCodeModal(codeText, lang)}
                    >
                      {t('viewCodeSnippet')}
                    </button>
                  );
                }
                return null;
              });
            }
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="chat-panel">
      <div className="control-group">
        <label htmlFor="coding-level-selector">{t('codingLevel')}</label>
        <select
          id="coding-level-selector"
          className="chat-level-selector"
          value={codingLevel}
          onChange={(e) => setCodingLevel(e.target.value)}
        >
          <option value="beginner">{t('beginner')}</option>
          <option value="intermediate">{t('intermediate')}</option>
          <option value="experienced">{t('experienced')}</option>
        </select>
        <button
          className="clear-history-btn"
          onClick={handleClearHistory}
          title={t('clearChatTitle')}
        >
          {t('clearChat')}
        </button>
      </div>

      <div className="chat-body" ref={chatBodyRef}>
        <div className="chat-disclaimer">
          {t('chatDisclaimer')}
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
            {t('addCodeToChat')}
          </button>
          <button
            className="context-btn"
            onClick={() => setAttachedContext(prev => ({ ...prev, includeConsole: true }))}
            disabled={!isRobotConnected}
          >
            {t('addConsoleToChat')}
          </button>
          {(attachedContext.includeCode || attachedContext.includeConsole) && (
            <div className="context-indicator">
              ✅ {attachedContext.includeCode && attachedContext.includeConsole
                ? t('contextBoth')
                : attachedContext.includeCode
                ? t('contextCode')
                : t('contextConsole')}
            </div>
          )}
        </div>

        <div className="chat-input-row">
          <textarea
            id="chat-input"
            rows="2"
            placeholder={t('messagePlaceholder')}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          <button id="chat-send" onClick={handleSendMessage} disabled={isStreaming}>
            {t('send')}
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

      {/* Console Modal */}
      <ConsoleModal
        isOpen={consoleModalOpen}
        consoleContent={currentConsoleContent}
        onClose={closeConsoleModal}
        onCopy={handleCopyConsole}
      />
    </div>
  );
});

ChatPanel.displayName = 'ChatPanel';

export default ChatPanel;
