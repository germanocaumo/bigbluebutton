import { IntlShape } from 'react-intl';
import { ActionButtonDropdownItemType } from 'bigbluebutton-html-plugin-sdk/dist/cjs/extensible-areas/action-button-dropdown-item/enums';

export interface ActionButtonPluginItem {
  type: ActionButtonDropdownItemType;
  id: string;
  icon?: string;
  label?: string;
  onClick?: () => void;
  allowed: boolean;
}

export interface MediaAreaContainerProps {
  amIPresenter?: boolean;
  amIModerator?: boolean;
  allowExternalVideo: boolean;
  intl: IntlShape;
  isSharingVideo: boolean;
  stopExternalVideoShare: () => void;
  isMeteorConnected: boolean;
  setPresentationFitToWidth: (fitToWidth: boolean) => void;
  hasPresentation: boolean;
}
