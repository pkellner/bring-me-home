import { NextRequest } from 'next/server';
import { POST } from './route';

describe('Logout All API Route', () => {
  it('handles POST request', async () => {
    const request = new NextRequest('http://localhost/api/auth/logout-all', {
      method: 'POST'
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});

const testExport = {};
export default testExport;