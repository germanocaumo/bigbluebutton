import React, { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import styled from 'styled-components';
import { lgBorderRadius } from '/imports/ui/stylesheets/styled-components/general';
import { colorWhite } from '/imports/ui/stylesheets/styled-components/palette';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
// import FilePresentIcon from '@mui/icons-material/FilePresent';
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay';
import AddToDriveIcon from '@mui/icons-material/AddToDrive';
import CancelPresentationIcon from '@mui/icons-material/CancelPresentation';
import DisabledByDefaultIcon from '@mui/icons-material/DisabledByDefault';

import { defineMessages, IntlShape } from 'react-intl';
import Styled from './styles';
import Icon from '/imports/ui/components/common/icon/component';
import Session from '/imports/ui/services/storage/in-memory';
// import Icon from '@mui/material/Icon';
import ExternalVideoModal from '/imports/ui/components/external-video-player/external-video-player-graphql/modal/component';
import { useIsScreenBroadcasting, useIsScreenGloballyBroadcasting } from '/imports/ui/components/screenshare/service';

import { MediaButton } from '/imports/ui/components/actions-bar/media-area/media-sharing/media-button/component';
import ScreenshareButtonContainer from '/imports/ui/components/actions-bar/media-area/media-sharing/screenshare/container';
// import { MediaButtonProps } from '/imports/ui/components/actions-bar/media-area/media-sharing/media-button/component';

interface MediaSharingModalProps {
  open: boolean;
  onClose: () => void;
  onStopSharing: () => void;
  intl: IntlShape;
  amIPresenter: boolean;
  isMeteorConnected: boolean;
}

// This overlay covers the entire viewport and is used to catch outside clicks.
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%; 
  height: 100%;
  background: transparent;
  z-index: 1000;
`;

const intlMessages = defineMessages({
  mediaLabel: {
    id: 'app.actionsBar.actionsDropdown.actionsLabel',
    description: 'Actions button label',
  },
  presentationLabel: {
    id: 'app.actionsBar.actionsDropdown.presentationLabel',
    description: 'Upload a presentation option label',
  },
  presentationDesc: {
    id: 'app.actionsBar.actionsDropdown.presentationDesc',
    description: 'adds context to upload presentation option',
  },
  desktopShareDesc: {
    id: 'app.actionsBar.actionsDropdown.desktopShareDesc',
    description: 'adds context to desktop share option',
  },
  stopDesktopShareDesc: {
    id: 'app.actionsBar.actionsDropdown.stopDesktopShareDesc',
    description: 'adds context to stop desktop share option',
  },
  takePresenter: {
    id: 'app.actionsBar.actionsDropdown.takePresenter',
    description: 'Label for take presenter role option',
  },
  takePresenterDesc: {
    id: 'app.actionsBar.actionsDropdown.takePresenterDesc',
    description: 'Description of take presenter role option',
  },
  startExternalVideoLabel: {
    id: 'app.actionsBar.actionsDropdown.shareExternalVideo',
    description: 'Start sharing external video button',
  },
  stopExternalVideoLabel: {
    id: 'app.actionsBar.actionsDropdown.stopShareExternalVideo',
    description: 'Stop sharing external video button',
  },
  layoutModal: {
    id: 'app.actionsBar.actionsDropdown.layoutModal',
    description: 'Label for layouts selection button',
  },
  shareCameraAsContent: {
    id: 'app.actionsBar.actionsDropdown.shareCameraAsContent',
    description: 'Label for share camera as content',
  },
  unshareCameraAsContent: {
    id: 'app.actionsBar.actionsDropdown.unshareCameraAsContent',
    description: 'Label for unshare camera as content',
  },
});

const MediaSharingModal: React.FC<MediaSharingModalProps> = ({
  open, onClose, onStopSharing, intl, amIPresenter, isMeteorConnected,
}) => {
  const [isExternalVideoModalOpen, setExternalVideoModalOpen] = useState(false);
  const screenIsBroadcasting = useIsScreenBroadcasting();

  if (!open) return null;

  const handlePresentationClick = () => Session.setItem('showUploadPresentationView', true);

  const handleExternalVideoClick = () => {
    setExternalVideoModalOpen(true);
  };

  return (
    <Overlay onClick={onClose}>
      {/* Stop propagation so that clicking inside the modal doesn't close it */}
      <Styled.ModalContainer onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <Styled.HeaderContainer>
          <h2>MEDIA SHARING</h2>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Styled.HeaderContainer>

        {/* Content */}
        <Styled.ContentContainer>
          <Styled.MediaGrid>
            <ScreenshareButtonContainer {...{
              amIPresenter,
              isMeteorConnected,
            }}
            />
            <MediaButton
              // disabled={(!isMeteorConnected && !isScreenBroadcasting) || !screenshareDataSavingSetting || !amIPresenter}
              data-test="managePresentations"
              // color={amIBroadcasting ? 'primary' : 'default'}
              color="default"
              showSettingsIcon
              text="Slides"
              icon={<Icon iconName="file" />}
              onClick={handlePresentationClick}
            />
            <MediaButton
              // disabled={(!isMeteorConnected && !isScreenBroadcasting) || !screenshareDataSavingSetting || !amIPresenter}
              data-test="startExternalVideo"
              color="default"
              showSettingsIcon
              text="Video Link"
              icon={<Icon iconName="external-video" />}
              onClick={handleExternalVideoClick}
            />
            <MediaButton
              // disabled={(!isMeteorConnected && !isScreenBroadcasting) || !screenshareDataSavingSetting || !amIPresenter}
              // data-test="startScreenShare"
              // color={amIBroadcasting ? 'primary' : 'default'}
              color="default"
              showSettingsIcon
              text="Google Docs"
              icon={<AddToDriveIcon sx={{ width: '48px', height: '48px' }} />}
              // icon={<Icon iconName="settings" />}
            />
          </Styled.MediaGrid>
        </Styled.ContentContainer>

        {/* Footer */}
        <Styled.FooterContainer>
          <Styled.ConfirmationButton
            aria-label="Share"
            data-test="stopSharing"
            label="Share"
            color={!screenIsBroadcasting ? 'primary' : 'danger'}
            onClick={onStopSharing}
            ghost={screenIsBroadcasting}
            customIcon={screenIsBroadcasting && <DisabledByDefaultIcon sx={{ width: '1.5rem', height: '1.5rem' }} />}
          />
        </Styled.FooterContainer>
      </Styled.ModalContainer>

      {isExternalVideoModalOpen && (
        <ExternalVideoModal
          onRequestClose={() => setExternalVideoModalOpen(false)}
          priority="low"
          setIsOpen={setExternalVideoModalOpen}
          isOpen={isExternalVideoModalOpen}
        />
      )}
    </Overlay>
  );
};

export default MediaSharingModal;
