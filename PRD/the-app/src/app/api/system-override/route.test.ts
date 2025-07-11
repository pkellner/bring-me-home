import { NextRequest } from 'next/server';
import { GET, POST } from './route';

describe('System Override API Route', () => {
  it('handles GET request', async () => {
    const request = new NextRequest('http://localhost/api/system-override');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it('handles POST request', async () => {
    const request = new NextRequest('http://localhost/api/system-override', {
      method: 'POST',
      body: JSON.stringify({ password: 'override123' })
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});

const testExport = {};
export default testExport;