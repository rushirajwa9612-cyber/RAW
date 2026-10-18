import { useEffect, useRef, useState } from 'react';
import {
  MessageSquare, Plus, Trash2, Copy, RefreshCw,
  ChevronDown, MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import { invokeAuthedFunction } from '@/lib/edgeFunctions';
import type { Conversation, Message } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState } from '@/components/ui/Feedback';
import { Dialog } from '@/components/ui/Dialog';
import { ChatComposer, type ChatAttachment } from '@/components/ChatComposer';

export function AIChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [convListOpen, setConvListOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadConversations() {
      if (!user) return;
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      const convs = (data as Conversation[]) ?? [];
      setConversations(convs);
      if (convs.length > 0 && !activeConv) {
        setActiveConv(convs[0]);
      }
      setLoading(false);
    }
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    async function loadMessages() {
      if (!activeConv) {
        setMessages([]);
        return;
      }
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConv.id)
        .order('created_at', { ascending: true });
      setMessages((data as Message[]) ?? []);
    }
    loadMessages();
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function createConversation(): Promise<Conversation | null> {
    if (!user) return null;
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: 'New Conversation' })
      .select()
      .single();
    if (error) {
      toast('Failed to create conversation.', 'error');
      return null;
    }
    const conv = data as Conversation;
    setConversations((prev) => [conv, ...prev]);
    setActiveConv(conv);
    return conv;
  }

  async function sendMessage(input: string, attachments: ChatAttachment[] = [], model = 'gpt-4o-mini') {
    if ((!input.trim() && attachments.length === 0) || sending) return;
    setSending(true);
    const messageText = input.trim() || 'Please review the attached files.';
    const savedText = attachments.length ? `${messageText}\n\nAttachments: ${attachments.map((item) => item.name).join(', ')}` : messageText;

    let conv = activeConv;
    if (!conv) {
      conv = await createConversation();
      if (!conv) {
        setSending(false);
        return;
      }
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: conv.id,
      user_id: user!.id,
      role: 'user',
      content: savedText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const { error: insertError } = await supabase
      .from('messages')
      .insert({ conversation_id: conv.id, user_id: user!.id, role: 'user', content: savedText });

    if (insertError) {
      toast('Failed to save message.', 'error');
      setSending(false);
      return;
    }

    if (conv.title === 'New Conversation') {
      const newTitle = messageText.slice(0, 40) + (messageText.length > 40 ? '...' : '');
      const { data: updated } = await supabase
        .from('conversations')
        .update({ title: newTitle })
        .eq('id', conv.id)
        .select()
        .single();
      if (updated) {
        const updatedConv = updated as Conversation;
        setActiveConv(updatedConv);
        setConversations((prev) => prev.map((c) => (c.id === updatedConv.id ? updatedConv : c)));
      }
    }

    try {
      const data = await invokeAuthedFunction<{ response?: string; content?: string; message?: string }>('ai-chat', {
          conversationId: conv.id,
          message: messageText,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          attachments: attachments.map(({ name, type, data }) => ({ name, type, data })),
          model,
      });
      const assistantContent = data.response ?? data.content ?? data.message ?? '';

      if (!assistantContent) {
        throw new Error('Empty response from AI provider.');
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: conv.id,
        user_id: user!.id,
        role: 'assistant',
        content: assistantContent,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      await supabase
        .from('messages')
        .insert({ conversation_id: conv.id, user_id: user!.id, role: 'assistant', content: assistantContent });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get AI response.';
      const errMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: conv.id,
        user_id: user!.id,
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${errorMsg}. Please check that an AI provider API key is configured in the Supabase edge function secrets.`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
      toast('AI provider not configured. See message for details.', 'warning');
    } finally {
      setSending(false);
    }
  }

  async function deleteConversation(conv: Conversation) {
    const { error } = await supabase.from('conversations').delete().eq('id', conv.id);
    if (error) {
      toast('Failed to delete conversation.', 'error');
      return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== conv.id));
    if (activeConv?.id === conv.id) {
      setActiveConv(conversations.find((c) => c.id !== conv.id) ?? null);
    }
    toast('Conversation deleted.', 'success');
    setDeleteTarget(null);
  }

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content);
    toast('Copied to clipboard.', 'success');
  }

  if (loading) return <LoadingState message="Loading conversations..." />;

  return (
    <div className="flex h-full">
      {/* Conversation list - desktop */}
      <aside className="hidden md:flex w-72 shrink-0 border-r border-[var(--border)] flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <Button className="w-full" size="sm" onClick={() => createConversation()}>
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-[var(--text-tertiary)]">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all ${
                  activeConv?.id === conv.id ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-1)]'
                }`}
                onClick={() => setActiveConv(conv)}
              >
                <MessageSquare className={`h-4 w-4 shrink-0 ${activeConv?.id === conv.id ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`} />
                <span className="flex-1 text-sm text-[var(--text-primary)] truncate">{conv.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(conv); }}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--error)] transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="md:hidden text-[var(--text-secondary)]"
              onClick={() => setConvListOpen(true)}
            >
              <ChevronDown className="h-5 w-5" />
            </button>
            <h2 className="font-medium text-[var(--text-primary)] truncate">
              {activeConv?.title ?? 'AI Chat'}
            </h2>
          </div>
          <Button size="sm" variant="ghost" onClick={() => createConversation()} className="shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-12 w-12" />}
              title="Start a conversation"
              description="Ask for creative ideas, prompt suggestions, or anything else."
            />
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-[var(--accent)] text-[var(--bg-base)]'
                      : 'bg-[var(--surface-1)] border border-[var(--border)]'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.role === 'assistant' && (
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={() => copyMessage(msg.content)} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors">
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                      <RefreshCw className="h-4 w-4 animate-spin-slow" />
                      Thinking...
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatComposer disabled={sending} onSend={(text, attachments, model) => void sendMessage(text, attachments, model)} />
      </div>

      {/* Mobile conversation list */}
      {convListOpen && (
        <div className="md:hidden fixed inset-0 z-[150]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConvListOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-[var(--bg-elevated)] animate-slide-in-right p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-[var(--text-primary)]">Conversations</h3>
              <button onClick={() => setConvListOpen(false)} className="text-[var(--text-tertiary)]">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer ${activeConv?.id === conv.id ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-1)]'}`}
                  onClick={() => { setActiveConv(conv); setConvListOpen(false); }}
                >
                  <MessageSquare className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <span className="flex-1 text-sm text-[var(--text-primary)] truncate">{conv.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete conversation?">
        <p className="text-sm text-[var(--text-secondary)]">
          This will permanently delete "{deleteTarget?.title}" and all its messages.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button size="sm" onClick={() => deleteTarget && deleteConversation(deleteTarget)} className="!bg-[var(--error)]">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
