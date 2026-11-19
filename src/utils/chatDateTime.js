const asDate = value => {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

// Display the server's send/creation time, never a later read or moderation update.
export const getMessageTimestamp = message =>
  asDate(message?.createdAt) || asDate(message?.sentAt);

export const getConversationTimestamp = conversation =>
  asDate(conversation?.lastMessage?.sentAt) ||
  asDate(conversation?.lastMessage?.createdAt) ||
  asDate(conversation?.createdAt);

export const formatChatDate = value => {
  const date = asDate(value);
  return date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable';
};

export const formatChatTime = value => {
  const date = asDate(value);
  return date ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : 'Time unavailable';
};

export const formatChatDateTime = value => `${formatChatDate(value)}, ${formatChatTime(value)}`;

export function buildChatTimeline(messages) {
  let previousDay;
  const rows = [];
  for (const [index, message] of messages.entries()) {
    const date = getMessageTimestamp(message);
    // Local calendar days match the timezone used for the displayed clock times.
    const day = date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : 'unknown';
    const key = String(message._id || message.clientMessageId || `message-${index}`);
    if (day !== previousDay) {
      rows.push({ timelineType: 'date', _id: `date-${day}-${key}`, label: formatChatDate(date) });
      previousDay = day;
    }
    rows.push({ ...message, _id: key, timelineType: 'message' });
  }
  return rows;
}
