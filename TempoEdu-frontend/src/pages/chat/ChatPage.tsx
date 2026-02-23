import { useEffect, useState, useRef, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { chatApi } from '../../services/chat.service';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import type { Conversation, Message } from '../../types';

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeConvo, setActiveConvo] = useState<string | null>(
    conversationId || null,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await chatApi.getConversations();
        setConversations(data.data);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!activeConvo) return;

    const fetchMessages = async () => {
      try {
        const { data } = await chatApi.getMessages(activeConvo);
        setMessages(data.data.messages);
      } catch {
        /* silent */
      }
    };
    fetchMessages();

    // Join socket room
    socket?.emit('joinConversation', { conversationId: activeConvo });

    return () => {
      socket?.emit('leaveConversation', { conversationId: activeConvo });
    };
  }, [activeConvo, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    socket.on('newMessage', handleNewMessage);
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvo) return;

    socket?.emit('sendMessage', {
      conversationId: activeConvo,
      content: newMessage.trim(),
    });
    setNewMessage('');
  };

  const getOtherParticipant = (convo: Conversation) => {
    return convo.participants.find((p) => p._id !== user?._id);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Conversation List */}
      <div
        className={`w-full border-r border-gray-200 md:w-80 ${
          activeConvo ? 'hidden md:block' : ''
        }`}
      >
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
        </div>

        <div className="overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="p-4 text-center text-sm text-gray-500">
              No conversations yet
            </p>
          ) : (
            conversations.map((convo) => {
              const other = getOtherParticipant(convo);
              return (
                <button
                  key={convo._id}
                  onClick={() => setActiveConvo(convo._id)}
                  className={`w-full border-b border-gray-100 p-4 text-left hover:bg-gray-50 transition-colors ${
                    activeConvo === convo._id ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                      {other
                        ? `${other.firstName[0]}${other.lastName[0]}`
                        : '??'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">
                        {other
                          ? `${other.firstName} ${other.lastName}`
                          : 'Unknown'}
                      </p>
                      {convo.lastMessage &&
                        typeof convo.lastMessage === 'object' && (
                          <p className="truncate text-xs text-gray-500">
                            {convo.lastMessage.content}
                          </p>
                        )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(new Date(convo.lastMessageAt), 'HH:mm')}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`flex flex-1 flex-col ${
          !activeConvo ? 'hidden md:flex' : 'flex'
        }`}
      >
        {!activeConvo ? (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            Select a conversation to start chatting
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 border-b border-gray-200 p-4">
              <button
                onClick={() => setActiveConvo(null)}
                className="md:hidden"
              >
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </button>
              {(() => {
                const convo = conversations.find(
                  (c) => c._id === activeConvo,
                );
                const other = convo ? getOtherParticipant(convo) : null;
                return (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                      {other
                        ? `${other.firstName[0]}${other.lastName[0]}`
                        : '??'}
                    </div>
                    <span className="font-medium text-gray-900">
                      {other
                        ? `${other.firstName} ${other.lastName}`
                        : 'Unknown'}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isMine =
                  typeof msg.sender === 'object'
                    ? msg.sender._id === user?._id
                    : msg.sender === user?._id;

                return (
                  <div
                    key={msg._id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isMine
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={`mt-1 text-xs ${
                          isMine ? 'text-indigo-200' : 'text-gray-400'
                        }`}
                      >
                        {format(new Date(msg.createdAt), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="border-t border-gray-200 p-4"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
