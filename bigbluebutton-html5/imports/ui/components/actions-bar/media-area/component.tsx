import React, { useState, useCallback } from 'react';
import { defineMessages, IntlShape } from 'react-intl';
import { ActionButtonDropdownItemType } from 'bigbluebutton-html-plugin-sdk/dist/cjs/extensible-areas/action-button-dropdown-item/enums';

import Styled from './styles';
import MediaSharingModal from '/imports/ui/components/actions-bar/media-area/media-sharing/component';

interface ActionButtonPluginItem {
  type: ActionButtonDropdownItemType;
  id: string;
  icon?: string;
  label?: string;
  onClick?: () => void;
  allowed: boolean;
}

interface MediaAreaProps {
  amIPresenter?: boolean;
  intl: IntlShape;
  amIModerator?: boolean;
  handleTakePresenter: () => void;
  allowExternalVideo: boolean;
  stopExternalVideoShare: () => void;
  isCameraAsContentEnabled: boolean;
  hasCameraAsContent: boolean;
  isMeteorConnected: boolean;
  hasPresentation: boolean;
  isPresentationEnabled: boolean;
  isSharingVideo: boolean;
  actionButtonDropdownItems: ActionButtonPluginItem[];
  isPresentationManagementDisabled?: boolean;
  setPresentationFitToWidth: (fitToWidth: boolean) => void;
}

const defaultProps = {
  isPresentationManagementDisabled: false,
  amIPresenter: false,
  amIModerator: false,
};

const intlMessages = defineMessages({
  mediaLabel: {
    id: 'app.actionsBar.actionsDropdown.actionsLabel',
    description: 'Actions button label',
  },
});

const MediaArea = (props: MediaAreaProps) => {
  const {
    intl,
    amIPresenter,
    amIModerator,
    isMeteorConnected,
    actionButtonDropdownItems,
    isCameraAsContentEnabled,
    hasCameraAsContent,
    hasPresentation,
    handleTakePresenter,
    isPresentationManagementDisabled,
    isPresentationEnabled,
    isSharingVideo,
    allowExternalVideo,
    stopExternalVideoShare,
    setPresentationFitToWidth,
  } = props;

  const [menuOpen, setMenuOpen] = useState(false);

  const handleToggleMenu = useCallback(() => {
    setMenuOpen(!menuOpen);
  }, [menuOpen]);

  if (!isMeteorConnected) {
    return null;
  }

  return (
    <>
      <Styled.HideDropdownButton
        hideLabel
        aria-label={intl.formatMessage(intlMessages.mediaLabel)}
        data-test="mediaAreaButton"
        label={intl.formatMessage(intlMessages.mediaLabel)}
        icon="media-area"
        color={menuOpen ? 'primary' : 'default'}
        size="lg"
        circle
        onClick={handleToggleMenu}
      />
      <MediaSharingModal
        open={menuOpen}
        onClose={handleToggleMenu}
        intl={intl}
        amIPresenter={amIPresenter}
        amIModerator={amIModerator}
        isMeteorConnected={isMeteorConnected}
        actionButtonDropdownItems={actionButtonDropdownItems}
        isCameraAsContentEnabled={isCameraAsContentEnabled}
        hasCameraAsContent={hasCameraAsContent}
        hasPresentation={hasPresentation}
        handleTakePresenter={handleTakePresenter}
        isPresentationManagementDisabled={isPresentationManagementDisabled}
        isPresentationEnabled={isPresentationEnabled}
        isSharingVideo={isSharingVideo}
        allowExternalVideo={allowExternalVideo}
        stopExternalVideoShare={stopExternalVideoShare}
        setPresentationFitToWidth={setPresentationFitToWidth}
      />
    </>
  );
};

MediaArea.defaultProps = defaultProps;

export default React.memo(MediaArea);
