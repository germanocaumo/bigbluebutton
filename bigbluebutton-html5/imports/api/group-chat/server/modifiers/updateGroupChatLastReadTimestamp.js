import { Match, check } from 'meteor/check';
import Logger from '/imports/startup/server/logger';
import GroupChat from '/imports/api/group-chat';

export default function updateGroupChatLastReadTimestamp(meetingId, chatId, lastReadTimestamps) {
  check(meetingId, String);
  check(chatId, String);
  check(lastReadTimestamps, Object);

  const selector = {
    chatId,
    meetingId,
  };

  const modifier = {
    $set: { lastReadTimestamps }
  };

  try {
    const numberAffected = GroupChat.update(selector, modifier);

    if (numberAffected) {
      Logger.info(`Updated lastReadTimestamp of group-chat id=${chatId} meeting=${meetingId}`);
    }
  } catch (err) {
    Logger.error(`Updated lastReadTimestamp group-chat collection: ${err}`);
  }
}
