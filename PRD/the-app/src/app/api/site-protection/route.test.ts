import { NextRequest } from 'next/server';
import { GET, POST } from './route';

describe('Site Protection API Route', () => {
  it('handles GET request', async () => {
    const request = new NextRequest('http://localhost/api/site-protection');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it('handles POST request', async () => {
    const request = new NextRequest('http://localhost/api/site-protection', {
      method: 'POST',
      body: JSON.stringify({ password: 'test123' })
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});

const testExport = {};
export default testExport;