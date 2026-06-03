'use client';

import React, { useMemo, useState } from 'react';
import { Conversation, Message } from '@/lib/types';
import ChatList from '@/components/chat/ChatList';
import ChatMessage from '@/components/chat/ChatMessage';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { MOCK_CONVERSATIONS, MOCK_ME } from '@/lib/constants/mockConversations';

export default function ChatDemoPage() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeId, setActiveId] = useState<string>(MOCK_CONVERSATIONS[0]?.id ?? '');
  const [draft, setDraft] = useState('');

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId],
  );

  const sendMessage = () => {
    if (!activeConversation || !draft.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversation_id: activeConversation.id,
      sender_id: MOCK_ME.id,
      content: draft.trim(),
      created_at: new Date().toISOString(),
      sender: MOCK_ME,
    };

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeConversation.id
          ? { ...conversation, messages: [...conversation.messages, newMessage] }
          : conversation,
      ),
    );
    setDraft('');
  };

  return (
    <main style={{ padding: 24, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ color: 'var(--text)', marginBottom: 20 }}>Chat Demo</h1>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gap: 16,
          }}
        >
          <aside style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius)', padding: 12 }}>
            <ChatList
              conversations={conversations}
              activeConversationId={activeId}
              onSelectConversation={(conversation) => setActiveId(conversation.id)}
            />
          </aside>

          <section
            style={{
              background: 'var(--card-bg)',
              borderRadius: 'var(--radius)',
              padding: 16,
              display: 'grid',
              gap: 12,
              maxHeight: '70vh',
            }}
          >
            <div style={{ overflowY: 'auto', display: 'grid', gap: 10, paddingRight: 6 }}>
              {activeConversation?.messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isOwn={message.sender_id === MOCK_ME.id}
                />
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              style={{ display: 'flex', gap: 8 }}
            >
              <div style={{ flex: 1 }}>
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                />
              </div>
              <Button type="submit" size="sm">Send</Button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
