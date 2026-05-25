import { useState, useEffect, useRef, useCallback } from 'react';
import useAuth from '../hooks/useAuth';
import axiosInstance from '../api/axiosInstance';
import socket from '../utils/socket';
import { getInitials } from '../utils/formatCurrency';

const GroupChat = ({ groupId, members }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const textareaRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  // Check if user is scrolled to bottom
  const checkIfAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 100;
    isAtBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(
    async (pageNum = 1, prepend = false) => {
      try {
        const { data } = await axiosInstance.get(
          `/api/groups/${groupId}/messages?page=${pageNum}&limit=30`
        );
        if (prepend) {
          setMessages((prev) => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages);
        }
        setHasMore(pageNum < data.totalPages);
        return data;
      } catch (err) {
        console.error('Failed to load messages:', err);
        return null;
      }
    },
    [groupId]
  );

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    try {
      await axiosInstance.post(`/api/groups/${groupId}/messages/read`);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, [groupId]);

  // Connect socket and load initial messages
  useEffect(() => {
    if (!user || !groupId) return;

    socket.connect();
    socket.emit('join_group', { groupId, userId: user._id });

    // Load initial messages
    const loadInitial = async () => {
      setInitialLoading(true);
      await fetchMessages(1);
      await markAsRead();
      setInitialLoading(false);
      // Scroll to bottom after messages load
      setTimeout(() => scrollToBottom('instant'), 100);
    };
    loadInitial();

    // Socket listeners
    const handleReceiveMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      // Auto-scroll if user is at bottom
      if (isAtBottomRef.current) {
        setTimeout(() => scrollToBottom(), 50);
      }
      // Mark as read since we're in the chat
      markAsRead();
    };

    const handleUserTyping = ({ userName }) => {
      setIsTyping(true);
      setTypingUser(userName);
    };

    const handleUserStopTyping = () => {
      setIsTyping(false);
      setTypingUser('');
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.disconnect();
    };
  }, [groupId, user, fetchMessages, markAsRead, scrollToBottom]);

  // Load earlier messages
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;

    const nextPage = page + 1;
    await fetchMessages(nextPage, true);
    setPage(nextPage);
    setIsLoadingMore(false);

    // Maintain scroll position after prepending
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight - prevScrollHeight;
      });
    }
  };

  // Send message
  const handleSend = () => {
    const text = newMessage.trim();
    if (!text || !user || !groupId) return;

    socket.emit('send_message', {
      groupId,
      senderId: user._id,
      text,
    });

    setNewMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Stop typing
    socket.emit('stop_typing', { groupId });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 100) + 'px';
    }

    // Typing indicator
    if (user && groupId) {
      socket.emit('typing', { groupId, userName: user.name });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { groupId });
      }, 500);
    }
  };

  // Handle key down (Enter to send, Shift+Enter for new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format time
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Check if message is from current user
  const isOwnMessage = (msg) => {
    const senderId = msg.sender?._id || msg.sender;
    return senderId === user?._id;
  };

  // Check if message is read by others
  const isReadByOthers = (msg) => {
    if (!msg.readBy) return false;
    return msg.readBy.some((id) => {
      const readId = typeof id === 'object' ? id.toString() : id;
      return readId !== user?._id;
    });
  };

  // Group messages by date
  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col h-[600px] glass-card overflow-hidden" id="group-chat">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h3 className="text-sm font-semibold text-slate-100">Group Chat</h3>
          <span className="text-xs text-slate-500">
            ({messages.length} messages)
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(members || []).slice(0, 5).map((m) => (
            <div
              key={m._id}
              className="w-7 h-7 rounded-full border-2 border-slate-800 -ml-1.5 first:ml-0 flex items-center justify-center overflow-hidden"
              title={m.name}
            >
              {m.avatar ? (
                <img
                  src={m.avatar}
                  alt={m.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {getInitials(m.name)}
                </div>
              )}
            </div>
          ))}
          {(members || []).length > 5 && (
            <span className="text-xs text-slate-500 ml-1">
              +{members.length - 5}
            </span>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
        onScroll={checkIfAtBottom}
      >
        {/* Loading state */}
        {initialLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading messages...</p>
          </div>
        )}

        {/* Load more button */}
        {!initialLoading && hasMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-primary-400 bg-primary-500/10 border border-primary-500/20 rounded-full hover:bg-primary-500/20 transition-all disabled:opacity-50"
              id="load-earlier-messages-btn"
            >
              {isLoadingMore ? (
                <>
                  <div className="w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  Load earlier messages
                </>
              )}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!initialLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="text-5xl">💬</div>
            <h4 className="text-lg font-semibold text-slate-300">
              No messages yet
            </h4>
            <p className="text-sm text-slate-500 max-w-xs">
              Start the conversation! Send a message to your group members.
            </p>
          </div>
        )}

        {/* Messages */}
        {!initialLoading &&
          messages.map((msg, index) => {
            const own = isOwnMessage(msg);
            const senderId = msg.sender?._id || msg.sender;
            const senderName = msg.sender?.name || 'Unknown';
            const senderAvatar = msg.sender?.avatar;

            // Date separator
            let showDateSeparator = false;
            if (index === 0) {
              showDateSeparator = true;
            } else {
              const prevDate = getDateLabel(
                messages[index - 1].createdAt
              );
              const currDate = getDateLabel(msg.createdAt);
              showDateSeparator = prevDate !== currDate;
            }

            // Show name if different sender from previous message
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const prevSenderId = prevMsg
              ? prevMsg.sender?._id || prevMsg.sender
              : null;
            const showSenderInfo = !own && senderId !== prevSenderId;

            return (
              <div key={msg._id || index}>
                {/* Date separator */}
                {showDateSeparator && (
                  <div className="flex items-center justify-center py-3">
                    <div className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-500 font-medium">
                      {getDateLabel(msg.createdAt)}
                    </div>
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={`flex items-end gap-2 mb-1 ${
                    own ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Avatar for other users */}
                  {!own && showSenderInfo && (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">
                      {senderAvatar ? (
                        <img
                          src={senderAvatar}
                          alt={senderName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-[10px] font-bold text-white">
                          {getInitials(senderName)}
                        </div>
                      )}
                    </div>
                  )}
                  {!own && !showSenderInfo && <div className="w-8 flex-shrink-0" />}

                  <div
                    className={`max-w-[75%] ${own ? 'items-end' : 'items-start'}`}
                  >
                    {/* Sender name */}
                    {showSenderInfo && (
                      <p className="text-xs font-medium text-slate-400 mb-0.5 ml-1">
                        {senderName}
                      </p>
                    )}

                    {/* Bubble */}
                    <div
                      className={`px-3 py-2 ${
                        own
                          ? 'bg-blue-500 text-white rounded-tl-2xl rounded-tr-sm rounded-b-2xl'
                          : 'bg-slate-700 text-slate-100 rounded-tr-2xl rounded-tl-sm rounded-b-2xl'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                      <div
                        className={`flex items-center gap-1 mt-1 ${
                          own ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span
                          className={`text-[10px] ${
                            own ? 'text-blue-200' : 'text-slate-500'
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </span>
                        {own && (
                          <span className="text-[10px] text-blue-200">
                            {isReadByOthers(msg) ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        {/* Typing indicator */}
        {isTyping && typingUser && (
          <div className="flex items-center gap-2 py-1 animate-fade-in">
            <div className="flex gap-1 ml-10">
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-slate-500 italic">
              {typingUser} is typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-900/80">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            maxLength={1000}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-sm resize-none overflow-hidden"
            style={{ maxHeight: '100px' }}
            id="chat-message-input"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            id="chat-send-btn"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1 text-right">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default GroupChat;
