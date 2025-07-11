import { NextRequest } from 'next/server';
import { GET } from './route';

describe('Images API Route', () => {
  it('handles GET request', async () => {
    const request = new NextRequest('http://localhost/api/images/1');
    const params = { id: '1' };
    const response = await GET(request, { params });
    expect(response.status).toBe(200);
  });
});

const testExport = {};
export default testExport;