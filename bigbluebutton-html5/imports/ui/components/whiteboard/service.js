// import Users from "/imports/api/users";
// import Polls from "/imports/api/polls";
// import Shapes from "/imports/api/shapes";
// import Auth from "/imports/ui/services/auth";
// import WhiteboardMultiUser from "/imports/api/whiteboard-multi-user";
// import addAnnotationQuery from "/imports/api/annotations/addAnnotation";
// import { Slides } from "/imports/api/slides";
// import { makeCall } from "/imports/ui/services/api";
// import PresentationService from "/imports/ui/components/presentation/service";
// import logger from "/imports/startup/client/logger";
// import Annotations from "/imports/api/annotations";

// // const Annotations = new Mongo.Collection(null);
// const UnsentAnnotations = new Mongo.Collection(null);
// const ANNOTATION_CONFIG = Meteor.settings.public.whiteboard.annotations;
// const DRAW_UPDATE = ANNOTATION_CONFIG.status.update;
// const DRAW_END = ANNOTATION_CONFIG.status.end;

// const ANNOTATION_TYPE_PENCIL = "pencil";

// let annotationsStreamListener = null;

// const clearPreview = (annotation) => {
//   UnsentAnnotations.remove({ id: annotation });
// };

// function clearFakeAnnotations() {
//   UnsentAnnotations.remove({});
// }

// function handleAddedAnnotation({
//   meetingId,
//   whiteboardId,
//   userId,
//   annotation,
// }) {
//   const isOwn = Auth.meetingID === meetingId && Auth.userID === userId;
//   const query = addAnnotationQuery(meetingId, whiteboardId, userId, annotation);

//   Annotations.upsert(query.selector, query.modifier);

//   if (isOwn) {
//     UnsentAnnotations.remove({ id: `${annotation.id}` });
//   }
// }

// function handleRemovedAnnotation({ meetingId, whiteboardId, userId, shapeId }) {
//   const query = { meetingId, whiteboardId };

//   if (userId) {
//     query.userId = userId;
//   }

//   if (shapeId) {
//     query.id = shapeId;
//   }

//   Annotations.remove(query);
// }

// export function initAnnotationsStreamListener() {
//   logger.info(
//     { logCode: "init_annotations_stream_listener" },
//     "initAnnotationsStreamListener called"
//   );
//   /**
//    * We create a promise to add the handlers after a ddp subscription stop.
//    * The problem was caused because we add handlers to stream before the onStop event happens,
//    * which set the handlers to undefined.
//    */
//   annotationsStreamListener = new Meteor.Streamer(
//     `annotations-${Auth.meetingID}`,
//     { retransmit: false }
//   );

//   const startStreamHandlersPromise = new Promise((resolve) => {
//     const checkStreamHandlersInterval = setInterval(() => {
//       const streamHandlersSize = Object.values(
//         Meteor.StreamerCentral.instances[`annotations-${Auth.meetingID}`]
//           .handlers
//       ).filter((el) => el !== undefined).length;

//       if (!streamHandlersSize) {
//         resolve(clearInterval(checkStreamHandlersInterval));
//       }
//     }, 250);
//   });

//   startStreamHandlersPromise.then(() => {
//     logger.debug(
//       { logCode: "annotations_stream_handler_attach" },
//       "Attaching handlers for annotations stream"
//     );

//     annotationsStreamListener.on("removed", handleRemovedAnnotation);

//     annotationsStreamListener.on("added", ({ annotations }) => {
//       annotations.forEach((annotation) => handleAddedAnnotation(annotation));
//     });
//   });
// }

// function increaseBrightness(realHex, percent) {
//   let hex = parseInt(realHex, 10).toString(16).padStart(6, 0);
//   // strip the leading # if it's there
//   hex = hex.replace(/^\s*#|\s*$/g, "");

//   // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
//   if (hex.length === 3) {
//     hex = hex.replace(/(.)/g, "$1$1");
//   }

//   const r = parseInt(hex.substr(0, 2), 16);
//   const g = parseInt(hex.substr(2, 2), 16);
//   const b = parseInt(hex.substr(4, 2), 16);

//   /* eslint-disable no-bitwise, no-mixed-operators */
//   return parseInt(
//     (0 | ((1 << 8) + r + ((256 - r) * percent) / 100)).toString(16).substr(1) +
//       (0 | ((1 << 8) + g + ((256 - g) * percent) / 100))
//         .toString(16)
//         .substr(1) +
//       (0 | ((1 << 8) + b + ((256 - b) * percent) / 100)).toString(16).substr(1),
//     16
//   );
//   /* eslint-enable no-bitwise, no-mixed-operators */
// }

// const annotationsQueue = [];
// // How many packets we need to have to use annotationsBufferTimeMax
// const annotationsMaxDelayQueueSize = 60;
// // Minimum bufferTime
// const annotationsBufferTimeMin = 30;
// // Maximum bufferTime
// const annotationsBufferTimeMax = 200;
// // Time before running 'sendBulkAnnotations' again if user is offline
// const annotationsRetryDelay = 1000;

// let annotationsSenderIsRunning = false;

// const proccessAnnotationsQueue = async () => {
//   annotationsSenderIsRunning = true;
//   const queueSize = annotationsQueue.length;

//   if (!queueSize) {
//     annotationsSenderIsRunning = false;
//     return;
//   }

//   const annotations = annotationsQueue.splice(0, queueSize);

//   const isAnnotationSent = await makeCall("sendBulkAnnotations", annotations);

//   if (!isAnnotationSent) {
//     // undo splice
//     annotationsQueue.splice(0, 0, ...annotations);
//     setTimeout(proccessAnnotationsQueue, annotationsRetryDelay);
//   } else {
//     // ask tiago
//     const delayPerc =
//       Math.min(annotationsMaxDelayQueueSize, queueSize) /
//       annotationsMaxDelayQueueSize;
//     const delayDelta = annotationsBufferTimeMax - annotationsBufferTimeMin;
//     const delayTime = annotationsBufferTimeMin + delayDelta * delayPerc;
//     setTimeout(proccessAnnotationsQueue, delayTime);
//   }
// };

// const sendAnnotation = (annotation) => {
//   // Prevent sending annotations while disconnected
//   // TODO: Change this to add the annotation, but delay the send until we're
//   // reconnected. With this it will miss things
//   if (!Meteor.status().connected) return;

//   if (annotation.status === DRAW_END) {
//     annotationsQueue.push(annotation);
//     if (!annotationsSenderIsRunning)
//       setTimeout(proccessAnnotationsQueue, annotationsBufferTimeMin);
//   } else {
//     const { position, ...relevantAnotation } = annotation;
//     const queryFake = addAnnotationQuery(
//       Auth.meetingID,
//       annotation.wbId,
//       Auth.userID,
//       {
//         ...relevantAnotation,
//         id: `${annotation.id}`,
//         position: Number.MAX_SAFE_INTEGER,
//         annotationInfo: {
//           ...annotation.annotationInfo,
//           color: increaseBrightness(annotation.annotationInfo.color, 40),
//         },
//       }
//     );

//     // This is a really hacky solution, but because of the previous code reuse we need to edit
//     // the pencil draw update modifier so that it sets the whole array instead of pushing to
//     // the end
//     const { status, annotationType } = relevantAnotation;
//     if (status === DRAW_UPDATE && annotationType === ANNOTATION_TYPE_PENCIL) {
//       delete queryFake.modifier.$push;
//       queryFake.modifier.$set["annotationInfo.points"] =
//         annotation.annotationInfo.points;
//     }

//     UnsentAnnotations.upsert(queryFake.selector, queryFake.modifier);
//   }
// };

// WhiteboardMultiUser.find({ meetingId: Auth.meetingID }).observeChanges({
//   changed: clearFakeAnnotations,
// });

// Users.find(
//   { userId: Auth.userID },
//   { fields: { presenter: 1 } }
// ).observeChanges({
//   changed(id, { presenter }) {
//     if (presenter === false) clearFakeAnnotations();
//   },
// });

// const getMultiUser = (whiteboardId) => {
//   const data = WhiteboardMultiUser.findOne(
//     {
//       meetingId: Auth.meetingID,
//       whiteboardId,
//     },
//     { fields: { multiUser: 1 } }
//   );

//   if (!data || !data.multiUser || !Array.isArray(data.multiUser)) return [];

//   return data.multiUser;
// };

// const getMultiUserSize = (whiteboardId) => {
//   const multiUser = getMultiUser(whiteboardId);

//   if (multiUser.length === 0) return 0;

//   // Individual whiteboard access is controlled by an array of userIds.
//   // When an user leaves the meeting or the presenter role moves from an
//   // user to another we applying a filter at the whiteboard collection.
//   // Ideally this should change to something more cohese but this would
//   // require extra changes at multiple backend modules.
//   const multiUserSize = Users.find(
//     {
//       meetingId: Auth.meetingID,
//       userId: { $in: multiUser },
//       presenter: false,
//     },
//     { fields: { userId: 1 } }
//   ).fetch();

//   return multiUserSize.length;
// };

// const getCurrentWhiteboardId = () => {
//   const podId = "DEFAULT_PRESENTATION_POD";
//   const currentPresentation = PresentationService.getCurrentPresentation(podId);

//   if (!currentPresentation) return null;

//   const currentSlide = Slides.findOne(
//     {
//       podId,
//       presentationId: currentPresentation.id,
//       current: true,
//     },
//     { fields: { id: 1 } }
//   );

//   return currentSlide && currentSlide.id;
// };

// const isMultiUserActive = (whiteboardId) => {
//   const multiUser = getMultiUser(whiteboardId);

//   return multiUser.length !== 0;
// };

// const hasMultiUserAccess = (whiteboardId, userId) => {
//   const multiUser = getMultiUser(whiteboardId);

//   return multiUser.includes(userId);
// };

// const changeWhiteboardAccess = (userId, access) => {
//   const whiteboardId = getCurrentWhiteboardId();

//   if (!whiteboardId) return;

//   if (access) {
//     addIndividualAccess(whiteboardId, userId);
//   } else {
//     removeIndividualAccess(whiteboardId, userId);
//   }
// };

// const addGlobalAccess = (whiteboardId) => {
//   makeCall("addGlobalAccess", whiteboardId);
// };

// const addIndividualAccess = (whiteboardId, userId) => {
//   makeCall("addIndividualAccess", whiteboardId, userId);
// };

// const removeGlobalAccess = (whiteboardId) => {
//   makeCall("removeGlobalAccess", whiteboardId);
// };

// const removeIndividualAccess = (whiteboardId, userId) => {
//   makeCall("removeIndividualAccess", whiteboardId, userId);
// };

// const DEFAULT_NUM_OF_PAGES = 5;

// const persistShape = (shape) => {
//   makeCall("persistShape", shape);
// };

// const getShapes = () => {
//   const selector = {
//     meetingId: Auth.meetingID,
//   };

//   console.log(
//     "SHAPES : ",
//     Shapes.find(selector).fetch()
//   );
//   console.log(
//     "Users : ",
//     Users.find(selector).fetch()
//   );

//   return [
//     // {
//     //     "id": "f1d3d9ef-ccf8-40a0-0305-e703b7584032",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 1,
//     //     "point": [
//     //         95.4,
//     //         203.55
//     //     ],
//     //     "size": [
//     //         66.2,
//     //         139
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "274a4a6b-6f49-4825-0621-84a1240a86e3",
//     //     "type": "triangle",
//     //     "name": "Triangle",
//     //     "parentId": "1",
//     //     "childIndex": 2,
//     //     "point": [
//     //         328.2,
//     //         167.75
//     //     ],
//     //     "size": [
//     //         93.4,
//     //         139.8
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "edd48ce0-1224-4cd2-3688-438edc856440",
//     //     "type": "triangle",
//     //     "name": "Triangle",
//     //     "parentId": "1",
//     //     "childIndex": 3,
//     //     "point": [
//     //         92,
//     //         52.4
//     //     ],
//     //     "size": [
//     //         49,
//     //         68.6
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "6625e0be-f8c2-45ae-3069-ea598916f838",
//     //     "type": "triangle",
//     //     "name": "Triangle",
//     //     "parentId": "1",
//     //     "childIndex": 4,
//     //     "point": [
//     //         219.2,
//     //         70.4
//     //     ],
//     //     "size": [
//     //         43.4,
//     //         105.4
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "a75a9e2d-f3ac-471c-2723-f324680d4c02",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 5,
//     //     "point": [
//     //         492,
//     //         204.8
//     //     ],
//     //     "radius": [
//     //         101,
//     //         85.19999999999999
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "47620312-9159-4c51-3fd6-b37983d7e0c0",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 6,
//     //     "point": [
//     //         916.4000000000001,
//     //         279.6,
//     //         0.5
//     //     ],
//     //     "radius": [
//     //         1,
//     //         1
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "1ed7da6f-cc4f-47fe-2b2e-d20b953715e7",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 7,
//     //     "point": [
//     //         793.6,
//     //         121.2
//     //     ],
//     //     "radius": [
//     //         46.60000000000002,
//     //         96.80000000000001
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "8790ccac-205b-4ee2-0373-0a948552ec9d",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 8,
//     //     "point": [
//     //         1001.6,
//     //         144.8
//     //     ],
//     //     "radius": [
//     //         38.40000000000009,
//     //         88.79999999999998
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "3a347610-7db2-4514-2c27-7a161eae7238",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 9,
//     //     "point": [
//     //         914.8,
//     //         82
//     //     ],
//     //     "radius": [
//     //         18,
//     //         47.80000000000001
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "02686a73-9171-4fcd-24fb-595525aba46f",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 10,
//     //     "point": [
//     //         497.2,
//     //         12.4
//     //     ],
//     //     "radius": [
//     //         46.799999999999955,
//     //         66.39999999999999
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "743d8cbe-59c6-4044-3c5c-a34477909420",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 11,
//     //     "point": [
//     //         383.2,
//     //         42.4
//     //     ],
//     //     "radius": [
//     //         25.399999999999977,
//     //         57.39999999999999
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "2eb991ad-6bb2-483e-1883-ac5b2a1711ac",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 12,
//     //     "point": [
//     //         192.4,
//     //         375.2
//     //     ],
//     //     "radius": [
//     //         47.19999999999999,
//     //         72.79999999999998
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "e016b744-b9c9-45ee-3ead-ac035efd159f",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 13,
//     //     "point": [
//     //         256.4,
//     //         254.4
//     //     ],
//     //     "radius": [
//     //         26.400000000000034,
//     //         51
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "fdd65922-2d2d-4375-36e8-296d7e9502e5",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 14,
//     //     "point": [
//     //         385.2,
//     //         414.8
//     //     ],
//     //     "radius": [
//     //         38.19999999999999,
//     //         54.99999999999997
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "fe05d027-4a4d-4bd9-08c2-bbee443f7a35",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 15,
//     //     "point": [
//     //         850,
//     //         430
//     //     ],
//     //     "radius": [
//     //         55.200000000000045,
//     //         37
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "3c434bf8-ac05-424c-0881-e777e87af7c2",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 16,
//     //     "point": [
//     //         1175.6,
//     //         413.2
//     //     ],
//     //     "radius": [
//     //         16.600000000000023,
//     //         31.599999999999994
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "c4e7db40-5698-4030-1e62-8a50bafb8868",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 17,
//     //     "point": [
//     //         1146.4,
//     //         274.4
//     //     ],
//     //     "radius": [
//     //         10.199999999999932,
//     //         43.400000000000006
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "96f5bf97-70ad-4bd8-2c16-a5745e7fb6d4",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 18,
//     //     "point": [
//     //         967.6,
//     //         356
//     //     ],
//     //     "radius": [
//     //         15,
//     //         37.19999999999999
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "77fb8a6b-b403-4de4-10ed-f20b796656f9",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 19,
//     //     "point": [
//     //         910,
//     //         256
//     //     ],
//     //     "radius": [
//     //         3.6000000000000227,
//     //         32.19999999999999
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "bde8913d-c1bc-4ead-14f0-695e49a85e69",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 20,
//     //     "point": [
//     //         750.4,
//     //         339.2
//     //     ],
//     //     "radius": [
//     //         10,
//     //         28.599999999999994
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "a6024879-6d0b-4e12-3b8f-7f16bd402a58",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 21,
//     //     "point": [
//     //         680,
//     //         94.4
//     //     ],
//     //     "radius": [
//     //         4,
//     //         62.2
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "fbf01dd1-e3bc-4aaa-0a13-849c0cda0619",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 22,
//     //     "point": [
//     //         549.2,
//     //         270
//     //     ],
//     //     "radius": [
//     //         18.399999999999977,
//     //         41
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "88215f61-2cfc-4258-02b7-21e262bdea11",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 23,
//     //     "point": [
//     //         772,
//     //         125.2
//     //     ],
//     //     "radius": [
//     //         1,
//     //         53.80000000000001
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "1c01eb6c-e5f7-431c-3328-bb87524a5270",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 24,
//     //     "point": [
//     //         819.6,
//     //         66
//     //     ],
//     //     "radius": [
//     //         11.600000000000023,
//     //         13.599999999999994
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "bae0b422-e751-43f1-2a93-2749f47deb8a",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 25,
//     //     "point": [
//     //         1185.6,
//     //         111.6
//     //     ],
//     //     "radius": [
//     //         4.400000000000091,
//     //         53.8
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "a14a9eaf-683d-4dc4-0049-1b4a6af8fafb",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 26,
//     //     "point": [
//     //         1052.8,
//     //         26.8
//     //     ],
//     //     "radius": [
//     //         11.399999999999977,
//     //         61.4
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "b127f962-e42a-402b-2e01-aa04939f4126",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 27,
//     //     "point": [
//     //         1260,
//     //         197.2
//     //     ],
//     //     "radius": [
//     //         10,
//     //         52.80000000000001
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "29bc0584-0b49-4dac-3a73-4ca7db7588b6",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 28,
//     //     "point": [
//     //         1032.8,
//     //         408.4
//     //     ],
//     //     "radius": [
//     //         2.3999999999999773,
//     //         70.19999999999999
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "6e81cf6b-9174-4fe2-19da-a89cbb7ae3b6",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 29,
//     //     "point": [
//     //         754.8,
//     //         358.8
//     //     ],
//     //     "radius": [
//     //         42.39999999999998,
//     //         40.79999999999998
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "8c511b73-6ac9-4ad5-3b8a-43be69478599",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 30,
//     //     "point": [
//     //         592.4,
//     //         410.8
//     //     ],
//     //     "radius": [
//     //         57,
//     //         48.400000000000006
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "530a11e8-33f4-47a2-03d1-63fd4fe3c49d",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 31,
//     //     "point": [
//     //         296.8,
//     //         350.8
//     //     ],
//     //     "radius": [
//     //         79,
//     //         22.799999999999983
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "5dca8883-5396-4502-0f93-5ef00b9846d8",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 32,
//     //     "point": [
//     //         39.2,
//     //         364
//     //     ],
//     //     "radius": [
//     //         37,
//     //         47
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "73c4b2ab-a562-46c8-0dd2-fa3ae86eed9b",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 33,
//     //     "point": [
//     //         14.4,
//     //         163.6
//     //     ],
//     //     "radius": [
//     //         25.60000000000001,
//     //         52.39999999999999
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "16ee412e-8d8b-4bb4-0467-3252095068ce",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 34,
//     //     "point": [
//     //         159.2,
//     //         18.8
//     //     ],
//     //     "radius": [
//     //         23.200000000000017,
//     //         46.00000000000001
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "39645a06-456b-4554-2c41-4f659cca3ffd",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 35,
//     //     "point": [
//     //         262,
//     //         29.6
//     //     ],
//     //     "radius": [
//     //         49.39999999999998,
//     //         84.8
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "de5d0e4c-3163-46e0-064b-ca888fa1c32b",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 36,
//     //     "point": [
//     //         196.8,
//     //         205.6
//     //     ],
//     //     "radius": [
//     //         28.599999999999994,
//     //         33.19999999999999
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "f39cf2c6-4543-40c2-2c07-6f16960f4225",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 37,
//     //     "point": [
//     //         504,
//     //         393.6
//     //     ],
//     //     "radius": [
//     //         37,
//     //         32.39999999999998
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "5c0749f1-c21c-4596-02a6-2e6e46dd35c1",
//     //     "type": "ellipse",
//     //     "name": "Ellipse",
//     //     "parentId": "1",
//     //     "childIndex": 38,
//     //     "point": [
//     //         734.4,
//     //         23.6
//     //     ],
//     //     "radius": [
//     //         30.80000000000001,
//     //         42.2
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "black",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "44787fcb-5425-4ad7-3352-55a30fa67af4",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 39,
//     //     "point": [
//     //         50.4,
//     //         75.6
//     //     ],
//     //     "size": [
//     //         75.8,
//     //         124.6
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "0ed3ab57-5923-4486-14a8-862e9a146859",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 40,
//     //     "point": [
//     //         204.8,
//     //         173.2
//     //     ],
//     //     "size": [
//     //         73.8,
//     //         114.6
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "2bccf325-0cc1-44fc-07d2-450b9ab173eb",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 41,
//     //     "point": [
//     //         230,
//     //         72
//     //     ],
//     //     "size": [
//     //         133.4,
//     //         133.4
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "c8d3d1c6-e496-4f3e-1e59-be9e0330ab23",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 42,
//     //     "point": [
//     //         544,
//     //         99.6
//     //     ],
//     //     "size": [
//     //         138.2,
//     //         189
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "5a8aba11-911b-4525-2ab2-b26c321b2491",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 43,
//     //     "point": [
//     //         470,
//     //         155.6
//     //     ],
//     //     "size": [
//     //         62.2,
//     //         165.4
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "0940d251-4bd9-41e4-1a8f-09214b2c2fa8",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 44,
//     //     "point": [
//     //         184.4,
//     //         346.4
//     //     ],
//     //     "size": [
//     //         179,
//     //         130.2
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "58cdc05e-032e-49f1-0cfe-cc4a50b883e2",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 45,
//     //     "point": [
//     //         151.2,
//     //         387.2
//     //     ],
//     //     "size": [
//     //         159,
//     //         59
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "6452e1fb-8284-4f91-02bd-fef83f7e3f6c",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 46,
//     //     "point": [
//     //         701.6,
//     //         418.4
//     //     ],
//     //     "size": [
//     //         287.8,
//     //         59
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "4ac41711-a163-4fc8-30c0-1a008c4000ef",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 47,
//     //     "point": [
//     //         476.6,
//     //         334.8
//     //     ],
//     //     "size": [
//     //         240.2,
//     //         71
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "5ad7f267-eec7-439d-1588-f66e09e37884",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 48,
//     //     "point": [
//     //         597.4,
//     //         279.2
//     //     ],
//     //     "size": [
//     //         180.6,
//     //         56.6
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "6e1fae02-9d67-4014-0d4c-7098dd56d23b",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 49,
//     //     "point": [
//     //         816.4,
//     //         201.6
//     //     ],
//     //     "size": [
//     //         156.2,
//     //         210.6
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "7aeb9b31-81f2-495a-3b67-d7d035e83c07",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 50,
//     //     "point": [
//     //         679.4,
//     //         188.8
//     //     ],
//     //     "size": [
//     //         153.4,
//     //         75
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "bac01213-0945-4a7f-13d2-5620912961c0",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 51,
//     //     "point": [
//     //         619.4,
//     //         70.2
//     //     ],
//     //     "size": [
//     //         178.2,
//     //         59.8
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "e59a9034-485f-465d-1c01-abd722ab8de7",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 52,
//     //     "point": [
//     //         600.4,
//     //         16
//     //     ],
//     //     "size": [
//     //         262.2,
//     //         97.8
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "d86ca189-394d-4c17-3e11-581ae0253d8b",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 53,
//     //     "point": [
//     //         270.6,
//     //         37.6
//     //     ],
//     //     "size": [
//     //         235.4,
//     //         103.8
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "7283d208-cd6a-4739-24ff-19e5e84f4072",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 54,
//     //     "point": [
//     //         340,
//     //         173.6
//     //     ],
//     //     "size": [
//     //         209.8,
//     //         169.4
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "22f7501e-248c-4180-3294-5b28dec7e75d",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 55,
//     //     "point": [
//     //         83.4,
//     //         340.4
//     //     ],
//     //     "size": [
//     //         86.2,
//     //         69.8
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "dfb30c9e-d2b3-432d-17a9-80025216023c",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 56,
//     //     "point": [
//     //         15.2,
//     //         379.8
//     //     ],
//     //     "size": [
//     //         235.8,
//     //         141
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "b5bd7ae2-7f99-467e-3af6-cd94e7a06470",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 57,
//     //     "point": [
//     //         94.8,
//     //         290.2
//     //     ],
//     //     "size": [
//     //         123.4,
//     //         263.8
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "2d5669b4-6ad6-482a-018e-bc632c235067",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 58,
//     //     "point": [
//     //         214.2,
//     //         491.2
//     //     ],
//     //     "size": [
//     //         101.4,
//     //         35.4
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "8924bf89-c09d-4f22-10bf-5172b4554afb",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 59,
//     //     "point": [
//     //         60.4,
//     //         289.6
//     //     ],
//     //     "size": [
//     //         54.2,
//     //         91
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "cc78e2b2-ab01-4adb-1404-047643ff4836",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 60,
//     //     "point": [
//     //         135,
//     //         146
//     //     ],
//     //     "size": [
//     //         43.8,
//     //         136.6
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "f203ddd1-da10-43e0-33cc-0e93c67d66b5",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 61,
//     //     "point": [
//     //         175,
//     //         130
//     //     ],
//     //     "size": [
//     //         33.8,
//     //         75
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "2b914f1b-3f72-4a40-3b35-9f443055c211",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 62,
//     //     "point": [
//     //         99.6,
//     //         7.2
//     //     ],
//     //     "size": [
//     //         291.4,
//     //         101.8
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "be6d6383-a502-414d-1b3f-bc1f9b69b41c",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 63,
//     //     "point": [
//     //         40.4,
//     //         59.2
//     //     ],
//     //     "size": [
//     //         93.8,
//     //         86.6
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "3f545bd3-e973-413c-2d72-e476ddbf4f27",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 64,
//     //     "point": [
//     //         439.2,
//     //         16.4
//     //     ],
//     //     "size": [
//     //         109.4,
//     //         166.2
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "09ac8c30-3647-4f2e-0c1a-3957eb178f2f",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 65,
//     //     "point": [
//     //         696.6,
//     //         52
//     //     ],
//     //     "size": [
//     //         229.4,
//     //         140.2
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "ef776a05-6795-475c-11c7-c7d0219ac171",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 66,
//     //     "point": [
//     //         774.2,
//     //         74
//     //     ],
//     //     "size": [
//     //         184.6,
//     //         188.6
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "21cebe09-5bb6-42fb-07cf-b3209adfa3a3",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 67,
//     //     "point": [
//     //         619.6,
//     //         158
//     //     ],
//     //     "size": [
//     //         156.2,
//     //         201.4
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "f5eb2b10-819b-45c6-1205-89f613d7e05b",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 68,
//     //     "point": [
//     //         596.6,
//     //         115
//     //     ],
//     //     "size": [
//     //         215.8,
//     //         407.8
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "7aff7fd5-dac4-4cb1-295b-97fda87cea55",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 69,
//     //     "point": [
//     //         823.4,
//     //         290.2
//     //     ],
//     //     "size": [
//     //         43,
//     //         238.2
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "dfb21752-b52e-40b3-351e-d2399a02550b",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 70,
//     //     "point": [
//     //         911.4,
//     //         309.8
//     //     ],
//     //     "size": [
//     //         42.6,
//     //         217
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // },
//     // {
//     //     "id": "2fab2b7a-0ef6-4709-3c87-50a276ba9cea",
//     //     "type": "rectangle",
//     //     "name": "Rectangle",
//     //     "parentId": "1",
//     //     "childIndex": 71,
//     //     "point": [
//     //         854.6,
//     //         322.2
//     //     ],
//     //     "size": [
//     //         47.8,
//     //         202.2
//     //     ],
//     //     "rotation": 0,
//     //     "style": {
//     //         "color": "red",
//     //         "size": "small",
//     //         "isFilled": false,
//     //         "dash": "draw",
//     //         "scale": 1
//     //     },
//     //     "label": "",
//     //     "labelPoint": [
//     //         0.5,
//     //         0.5
//     //     ]
//     // }
// ];
// };

// const initDefaultPages = () => {
//   const pages = {};
//   const pageStates = {};
//   let i = 1;
//   while (i < DEFAULT_NUM_OF_PAGES + 1) {
//     pages[`${i}`] = {
//       id: `${i}`,
//       name: `Slide ${i}`,
//       shapes: {},
//       bindings: {},
//     };
//     pageStates[`${i}`] = {
//       id: `${i}`,
//       selectedIds: [],
//       camera: {
//         point: [0, 0],
//         zoom: 1,
//       },
//     };
//     i++;
//   }
//   return { pages, pageStates };
// };

// export {
//   initDefaultPages,
//   Annotations,
//   UnsentAnnotations,
//   sendAnnotation,
//   clearPreview,
//   getMultiUser,
//   getMultiUserSize,
//   getCurrentWhiteboardId,
//   isMultiUserActive,
//   hasMultiUserAccess,
//   changeWhiteboardAccess,
//   addGlobalAccess,
//   addIndividualAccess,
//   removeGlobalAccess,
//   removeIndividualAccess,
//   persistShape,
//   getShapes,
// };

import Users from "/imports/api/users";
import Polls from "/imports/api/polls";
import Shapes from "/imports/api/shapes";
import Captions from "/imports/api/captions";
import Presentations from "/imports/api/presentations";
import Meetings from "/imports/api/meetings";
import Auth from "/imports/ui/services/auth";
import WhiteboardMultiUser from "/imports/api/whiteboard-multi-user";
import addAnnotationQuery from "/imports/api/annotations/addAnnotation";
import { Slides } from "/imports/api/slides";
import { makeCall } from "/imports/ui/services/api";
import PresentationService from "/imports/ui/components/presentation/service";
import logger from "/imports/startup/client/logger";
import Annotations from "/imports/api/annotations";

// const Annotations = new Mongo.Collection(null);
const UnsentAnnotations = new Mongo.Collection(null);
const ANNOTATION_CONFIG = Meteor.settings.public.whiteboard.annotations;
const DRAW_UPDATE = ANNOTATION_CONFIG.status.update;
const DRAW_END = ANNOTATION_CONFIG.status.end;

const ANNOTATION_TYPE_PENCIL = "pencil";

let annotationsStreamListener = null;

const clearPreview = (annotation) => {
  UnsentAnnotations.remove({ id: annotation });
};

function clearFakeAnnotations() {
  UnsentAnnotations.remove({});
}

function handleAddedAnnotation({
  meetingId,
  whiteboardId,
  userId,
  annotation,
}) {
  const isOwn = Auth.meetingID === meetingId && Auth.userID === userId;
  const query = addAnnotationQuery(meetingId, whiteboardId, userId, annotation);

  Annotations.upsert(query.selector, query.modifier);

  if (isOwn) {
    UnsentAnnotations.remove({ id: `${annotation.id}` });
  }
}

function handleRemovedAnnotation({ meetingId, whiteboardId, userId, shapeId }) {
  const query = { meetingId, whiteboardId };

  if (userId) {
    query.userId = userId;
  }

  if (shapeId) {
    query.id = shapeId;
  }

  Annotations.remove(query);
}

export function initAnnotationsStreamListener() {
  logger.info(
    { logCode: "init_annotations_stream_listener" },
    "initAnnotationsStreamListener called"
  );
  /**
   * We create a promise to add the handlers after a ddp subscription stop.
   * The problem was caused because we add handlers to stream before the onStop event happens,
   * which set the handlers to undefined.
   */
  annotationsStreamListener = new Meteor.Streamer(
    `annotations-${Auth.meetingID}`,
    { retransmit: false }
  );

  const startStreamHandlersPromise = new Promise((resolve) => {
    const checkStreamHandlersInterval = setInterval(() => {
      const streamHandlersSize = Object.values(
        Meteor.StreamerCentral.instances[`annotations-${Auth.meetingID}`]
          .handlers
      ).filter((el) => el !== undefined).length;

      if (!streamHandlersSize) {
        resolve(clearInterval(checkStreamHandlersInterval));
      }
    }, 250);
  });

  startStreamHandlersPromise.then(() => {
    logger.debug(
      { logCode: "annotations_stream_handler_attach" },
      "Attaching handlers for annotations stream"
    );

    annotationsStreamListener.on("removed", handleRemovedAnnotation);

    annotationsStreamListener.on("added", ({ annotations }) => {
      annotations.forEach((annotation) => handleAddedAnnotation(annotation));
    });
  });
}

function increaseBrightness(realHex, percent) {
  let hex = parseInt(realHex, 10).toString(16).padStart(6, 0);
  // strip the leading # if it's there
  hex = hex.replace(/^\s*#|\s*$/g, "");

  // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
  if (hex.length === 3) {
    hex = hex.replace(/(.)/g, "$1$1");
  }

  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  /* eslint-disable no-bitwise, no-mixed-operators */
  return parseInt(
    (0 | ((1 << 8) + r + ((256 - r) * percent) / 100)).toString(16).substr(1) +
      (0 | ((1 << 8) + g + ((256 - g) * percent) / 100))
        .toString(16)
        .substr(1) +
      (0 | ((1 << 8) + b + ((256 - b) * percent) / 100)).toString(16).substr(1),
    16
  );
  /* eslint-enable no-bitwise, no-mixed-operators */
}

const annotationsQueue = [];
// How many packets we need to have to use annotationsBufferTimeMax
const annotationsMaxDelayQueueSize = 60;
// Minimum bufferTime
const annotationsBufferTimeMin = 30;
// Maximum bufferTime
const annotationsBufferTimeMax = 200;
// Time before running 'sendBulkAnnotations' again if user is offline
const annotationsRetryDelay = 1000;

let annotationsSenderIsRunning = false;

const proccessAnnotationsQueue = async () => {
  annotationsSenderIsRunning = true;
  const queueSize = annotationsQueue.length;

  if (!queueSize) {
    annotationsSenderIsRunning = false;
    return;
  }

  const annotations = annotationsQueue.splice(0, queueSize);

  const isAnnotationSent = await makeCall("sendBulkAnnotations", annotations);

  if (!isAnnotationSent) {
    // undo splice
    annotationsQueue.splice(0, 0, ...annotations);
    setTimeout(proccessAnnotationsQueue, annotationsRetryDelay);
  } else {
    // ask tiago
    const delayPerc =
      Math.min(annotationsMaxDelayQueueSize, queueSize) /
      annotationsMaxDelayQueueSize;
    const delayDelta = annotationsBufferTimeMax - annotationsBufferTimeMin;
    const delayTime = annotationsBufferTimeMin + delayDelta * delayPerc;
    setTimeout(proccessAnnotationsQueue, delayTime);
  }
};

const sendAnnotation = (annotation) => {
  // Prevent sending annotations while disconnected
  // TODO: Change this to add the annotation, but delay the send until we're
  // reconnected. With this it will miss things
  if (!Meteor.status().connected) return;

  if (annotation.status === DRAW_END) {
    annotationsQueue.push(annotation);
    if (!annotationsSenderIsRunning)
      setTimeout(proccessAnnotationsQueue, annotationsBufferTimeMin);
  } else {
    const { position, ...relevantAnotation } = annotation;
    const queryFake = addAnnotationQuery(
      Auth.meetingID,
      annotation.wbId,
      Auth.userID,
      {
        ...relevantAnotation,
        id: `${annotation.id}`,
        position: Number.MAX_SAFE_INTEGER,
        annotationInfo: {
          ...annotation.annotationInfo,
          color: increaseBrightness(annotation.annotationInfo.color, 40),
        },
      }
    );

    // This is a really hacky solution, but because of the previous code reuse we need to edit
    // the pencil draw update modifier so that it sets the whole array instead of pushing to
    // the end
    const { status, annotationType } = relevantAnotation;
    if (status === DRAW_UPDATE && annotationType === ANNOTATION_TYPE_PENCIL) {
      delete queryFake.modifier.$push;
      queryFake.modifier.$set["annotationInfo.points"] =
        annotation.annotationInfo.points;
    }

    UnsentAnnotations.upsert(queryFake.selector, queryFake.modifier);
  }
};

WhiteboardMultiUser.find({ meetingId: Auth.meetingID }).observeChanges({
  changed: clearFakeAnnotations,
});

Users.find(
  { userId: Auth.userID },
  { fields: { presenter: 1 } }
).observeChanges({
  changed(id, { presenter }) {
    if (presenter === false) clearFakeAnnotations();
  },
});

const getMultiUser = (whiteboardId) => {
  const data = WhiteboardMultiUser.findOne(
    {
      meetingId: Auth.meetingID,
      whiteboardId,
    },
    { fields: { multiUser: 1 } }
  );

  if (!data || !data.multiUser || !Array.isArray(data.multiUser)) return [];

  return data.multiUser;
};

const getMultiUserSize = (whiteboardId) => {
  const multiUser = getMultiUser(whiteboardId);

  if (multiUser.length === 0) return 0;

  // Individual whiteboard access is controlled by an array of userIds.
  // When an user leaves the meeting or the presenter role moves from an
  // user to another we applying a filter at the whiteboard collection.
  // Ideally this should change to something more cohese but this would
  // require extra changes at multiple backend modules.
  const multiUserSize = Users.find(
    {
      meetingId: Auth.meetingID,
      userId: { $in: multiUser },
      presenter: false,
    },
    { fields: { userId: 1 } }
  ).fetch();

  return multiUserSize.length;
};

const getCurrentWhiteboardId = () => {
  const podId = "DEFAULT_PRESENTATION_POD";
  const currentPresentation = PresentationService.getCurrentPresentation(podId);

  if (!currentPresentation) return null;

  const currentSlide = Slides.findOne(
    {
      podId,
      presentationId: currentPresentation.id,
      current: true,
    },
    { fields: { id: 1 } }
  );

  return currentSlide && currentSlide.id;
};

const isMultiUserActive = (whiteboardId) => {
  const multiUser = getMultiUser(whiteboardId);

  return multiUser.length !== 0;
};

const hasMultiUserAccess = (whiteboardId, userId) => {
  const multiUser = getMultiUser(whiteboardId);

  return multiUser.includes(userId);
};

const changeWhiteboardAccess = (userId, access) => {
  const whiteboardId = getCurrentWhiteboardId();

  if (!whiteboardId) return;

  if (access) {
    addIndividualAccess(whiteboardId, userId);
  } else {
    removeIndividualAccess(whiteboardId, userId);
  }
};

const addGlobalAccess = (whiteboardId) => {
  makeCall("addGlobalAccess", whiteboardId);
};

const addIndividualAccess = (whiteboardId, userId) => {
  makeCall("addIndividualAccess", whiteboardId, userId);
};

const removeGlobalAccess = (whiteboardId) => {
  makeCall("removeGlobalAccess", whiteboardId);
};

const removeIndividualAccess = (whiteboardId, userId) => {
  makeCall("removeIndividualAccess", whiteboardId, userId);
};

const DEFAULT_NUM_OF_PAGES = 1;

const persistShape = (shape) => {
  makeCall("persistShape", shape);
};

const persistAsset = (asset) => makeCall("persistAsset", asset);

const removeShape = (id) => makeCall("removeShape", id);

const changeCurrentSlide = (s) => {
  console.log('CHANGE CUR SLIDE SERVICE')
  makeCall("changeCurrentSlide", s);
}
const publishCursorUpdate = (userId, name, x, y, presenter, isPositionOutside) => {
  makeCall("publishCursorUpdate", Auth.meetingID, userId, { userId, name, x, y, presenter, isPositionOutside })
}

const getShapes = () => {
  // temporary storage for shapes
  console.log('getShapes : ', Slides.find().fetch().filter(s => s.childIndex))
  return Slides.find().fetch().filter(s => s.childIndex);
};

const getCurrentPres = () => {
  const podId = "DEFAULT_PRESENTATION_POD";
  return  PresentationService.getCurrentPresentation(podId);
}

const getCurSlide = () => {
  let m = Meetings.findOne({ meetingId: Auth.meetingID });
  console.log('---- meeting = ', m);
  return m;
}

const getAssets = () => {
  // temporary storage for assets
  let a = Captions.find().fetch().filter(s => s.src);
  let _assets = {}
  Object.entries(a).map(([k,v]) => {
    _assets[v.id] = v;
    return v.src && v;
  });

  return _assets;
}

const initDefaultPages = (count = 1) => {
  const pages = {};
  const pageStates = {};
  let i = 1;
  while (i < count + 1) {
    pages[`${i}`] = {
      id: `${i}`,
      name: `Slide ${i}`,
      shapes: {},
      bindings: {},
    };
    pageStates[`${i}`] = {
      id: `${i}`,
      selectedIds: [],
      camera: {
        point: [0, 0],
        zoom: 1,
      },
    };
    i++;
  }
  return { pages, pageStates };
};

export {
  initDefaultPages,
  Annotations,
  UnsentAnnotations,
  sendAnnotation,
  clearPreview,
  getMultiUser,
  getMultiUserSize,
  getCurrentWhiteboardId,
  isMultiUserActive,
  hasMultiUserAccess,
  changeWhiteboardAccess,
  addGlobalAccess,
  addIndividualAccess,
  removeGlobalAccess,
  removeIndividualAccess,
  persistShape,
  persistAsset,
  getShapes,
  getAssets,
  getCurrentPres,
  removeShape,
  publishCursorUpdate,
  changeCurrentSlide,
  getCurSlide,
};
