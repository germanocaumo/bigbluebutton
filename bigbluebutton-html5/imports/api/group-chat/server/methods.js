import { Meteor } from 'meteor/meteor';
import createGroupChat from './methods/createGroupChat';
import destroyGroupChat from './methods/destroyGroupChat';
import setGroupChatLastReadTimestamp from './methods/setGroupChatLastReadTimestamp';

Meteor.methods({
  createGroupChat,
  destroyGroupChat,
  setGroupChatLastReadTimestamp,
});
