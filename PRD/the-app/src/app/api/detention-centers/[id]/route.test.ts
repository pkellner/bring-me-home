import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from './route';

describe('Detention Centers API Route', () => {
  it('handles GET request', async () => {
    const request = new NextRequest('http://localhost/api/detention-centers/1');
    const params = { id: '1' };
    const response = await GET(request, { params });
    expect(response.status).toBe(200);
  });

  it('handles PUT request', async () => {
    const request = new NextRequest('http://localhost/api/detention-centers/1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Center' })
    });
    const params = { id: '1' };
    const response = await PUT(request, { params });
    expect(response.status).toBe(200);
  });

  it('handles DELETE request', async () => {
    const request = new NextRequest('http://localhost/api/detention-centers/1', {
      method: 'DELETE'
    });
    const params = { id: '1' };
    const response = await DELETE(request, { params });
    expect(response.status).toBe(200);
  });
});

const testExport = {};
export default testExport;