import React from 'react';
import { Conversation } from '@/lib/types';
import styles from './ChatList.module.css';

export interface ChatListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation?: (conversation: Conversation) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ conversations, activeConversationId, onSelectConversation }) => {
  return (
    <div className={styles.list}>
      {conversations.map((conversation) => {
        const lastMessage = conversation.messages[conversation.messages.length - 1];
        const active = conversation.id === activeConversationId;

        return (
          <button
            key={conversation.id}
            type="button"
            className={`${styles.item} ${active ? styles.active : ''}`}
            onClick={() => onSelectConversation?.(conversation)}
          >
            <div className={styles.title}>{conversation.title || 'Untitled conversation'}</div>
            <div className={styles.preview}>{lastMessage?.content || 'No message yet'}</div>
          </button>
        );
      })}
    </div>
  );
};

export default ChatList;
