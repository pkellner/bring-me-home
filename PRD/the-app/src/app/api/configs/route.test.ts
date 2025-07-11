import { NextRequest } from 'next/server';
import { GET } from './route';

describe('Configs API Route', () => {
  it('handles GET request', async () => {
    const request = new NextRequest('http://localhost/api/configs');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});

const testExport = {};
export default testExport;