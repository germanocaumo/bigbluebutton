import updateGroupChatLastReadTimestamp from '../modifiers/updateGroupChatLastReadTimestamp';

export default function setGroupChatLastReadTimestamp(meetingId, chatId, lastReadTimestamps) {

  return updateGroupChatLastReadTimestamp(meetingId, chatId, lastReadTimestamps);
}
