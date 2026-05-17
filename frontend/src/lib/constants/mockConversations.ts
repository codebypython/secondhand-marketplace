import { Conversation, Message, User } from '@/lib/types';

function makeUser(id: string, email: string, fullName: string, displayName: string): User {
  return {
    id,
    email,
    role: 'USER',
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    profile: {
      id: `profile-${id}`,
      full_name: fullName,
      display_name: displayName,
    },
  };
}

const me = makeUser('u-me', 'me@example.com', 'Bạn', 'Bạn');
const sellerA = makeUser('u-seller-a', 'sellera@example.com', 'Nguyễn Văn A', 'NVA');
const sellerB = makeUser('u-seller-b', 'sellerb@example.com', 'Trần Thị B', 'TTB');

function makeMessage(id: string, conversationId: string, sender: User, content: string, createdAt: string): Message {
  return {
    id,
    conversation_id: conversationId,
    sender_id: sender.id,
    content,
    created_at: createdAt,
    sender,
  };
}

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    title: 'MacBook Pro 14"',
    listing_id: 'listing-1',
    created_at: '2026-05-10T10:00:00Z',
    participants: [me, sellerA],
    messages: [
      makeMessage('msg-1', 'conv-1', sellerA, 'Chào bạn, máy còn không?', '2026-05-10T10:05:00Z'),
      makeMessage('msg-2', 'conv-1', me, 'Còn bạn nhé, giá có thể thương lượng nhẹ.', '2026-05-10T10:07:00Z'),
      makeMessage('msg-3', 'conv-1', sellerA, 'Mình qua xem vào chiều mai được không?', '2026-05-10T10:08:00Z'),
    ],
  },
  {
    id: 'conv-2',
    title: 'Giày Nike Air Max 90',
    listing_id: 'listing-6',
    created_at: '2026-05-11T09:00:00Z',
    participants: [me, sellerB],
    messages: [
      makeMessage('msg-4', 'conv-2', me, 'Giày còn box không bạn?', '2026-05-11T09:03:00Z'),
      makeMessage('msg-5', 'conv-2', sellerB, 'Còn box đầy đủ nhé.', '2026-05-11T09:05:00Z'),
    ],
  },
];

export const MOCK_ME = me;
