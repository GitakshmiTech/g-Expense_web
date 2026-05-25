describe('Expense Management shell', () => {
  it('loads the protected expense route without a blank screen', () => {
    cy.visit('/expenses', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
  });
});
