import styled from "styled-components";

const HomeContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  background-color: ${({ theme }) => theme.background || "#f9f9f9"};
`;

export default HomeContainer;
