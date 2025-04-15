import React, { FunctionComponent } from 'react';
import { IconButton } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import Styled from './styles';

export interface MediaButtonProps {
  color: string;
  showSettingsIcon: boolean;
  text: string;
  onClick?: () => void;
  /** The main icon to be rendered in the button */
  icon: React.ReactElement;
}

export const MediaButton: FunctionComponent<MediaButtonProps> = ({
  color,
  showSettingsIcon,
  text,
  onClick,
  icon,
}) => {
  return (
    <Styled.MediaButtonContainer>
      <Styled.ButtonFrame color={color} onClick={onClick}>
        {showSettingsIcon && (
          <Styled.SettingsContainer>
            <IconButton size="small">
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Styled.SettingsContainer>
        )}
        <Styled.IconWrapper>
          {icon}
        </Styled.IconWrapper>
      </Styled.ButtonFrame>
      <Styled.ButtonText>{text}</Styled.ButtonText>
    </Styled.MediaButtonContainer>
  );
};

export default MediaButton;
