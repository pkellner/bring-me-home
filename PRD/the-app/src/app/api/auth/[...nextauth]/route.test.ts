import { GET, POST } from './route';

describe('NextAuth API Route', () => {
  it('exports GET handler', () => {
    expect(GET).toBeDefined();
    expect(typeof GET).toBe('function');
  });

  it('exports POST handler', () => {
    expect(POST).toBeDefined();
    expect(typeof POST).toBe('function');
  });
});

const testExport = {};
export default testExport;