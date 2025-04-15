import styled from 'styled-components';
import { smallOnly } from '/imports/ui/stylesheets/styled-components/breakpoints';
import Button from '/imports/ui/components/common/button/component';
import { btnPrimaryBg, colorDanger, colorWhite } from '/imports/ui/stylesheets/styled-components/palette';
import { lgBorderRadius } from '/imports/ui/stylesheets/styled-components/general';

const HideDropdownButton = styled(Button)`
  ${({ open }) => open && `
      @media ${smallOnly} {
        display:none;
      }
   `}
`;

const ConfirmationButton = styled(Button)`
  display: flex;
  height: 3.5rem;
  padding: var(--Spacing-spacing-16, 1rem);
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  flex: 1 0 0;
  border-radius: ${lgBorderRadius};

  ${({ color }) => color === 'danger' && `
    border: 1px solid ${colorDanger};
  `}

  &:hover {
    opacity: 0.8;
  }
`;

const IconContainer = styled.div`
  width: 1.5rem;
  height: 1.5rem;
  margin-right: 0.5rem;
`;

// Modal container positioned in the bottom right corner.
const ModalContainer = styled.div`
  position: fixed;
  bottom: 64px;
  right: 24px;
  background: ${colorWhite};
  border-radius: ${lgBorderRadius};
  width: 420px;
  box-shadow: -4px 4px 8px 0px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  z-index: 1100;
`;

// Header container to hold the title and close button.
const HeaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eaeaea;
`;

// Content container for the media grid.
const ContentContainer = styled.div`
  padding: 20px;
`;

// Grid layout for displaying media options.
const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  text-align: center;
`;

// Footer container for the stop sharing button.
const FooterContainer = styled.div`
  padding: 16px 20px;
  border-top: 1px solid #eaeaea;
  display: flex;
  justify-content: center;
`;

export default {
  HideDropdownButton,
  IconContainer,
  ConfirmationButton,
  ModalContainer,
  HeaderContainer,
  ContentContainer,
  MediaGrid,
  FooterContainer,
};
