import React from 'react';
import { Message } from '@/lib/types';
import styles from './ChatMessage.module.css';

export interface ChatMessageProps {
  message: Message;
  isOwn?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwn = false }) => {
  const senderName = message.sender?.profile?.display_name || message.sender?.email || 'Unknown';
  const time = new Date(message.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <article className={`${styles.message} ${isOwn ? styles.own : styles.other}`}>
      <span className={styles.sender}>{senderName}</span>
      <p>{message.content}</p>
      <span className={styles.time}>{time}</span>
    </article>
  );
};

export default ChatMessage;
