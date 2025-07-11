// Correct import path for nested dynamic routes
import EditUserPage from './page';

describe('EditUserPage', () => {
  it('should be defined', () => {
    expect(EditUserPage).toBeDefined();
  });
  
  it('should be an async function (server component)', () => {
    expect(EditUserPage.constructor.name).toBe('AsyncFunction');
  });
});