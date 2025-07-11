import { NextRequest } from 'next/server';
import { POST } from './route';

describe('Comments Approve API Route', () => {
  it('handles POST request', async () => {
    const request = new NextRequest('http://localhost/api/admin/comments/1/approve', {
      method: 'POST'
    });
    const params = { id: '1' };
    const response = await POST(request, { params });
    expect(response.status).toBe(200);
  });
});

const testExport = {};
export default testExport;