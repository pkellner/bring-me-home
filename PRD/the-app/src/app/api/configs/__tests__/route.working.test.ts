/**
 * Testing Next.js 15 API Routes
 * 
 * API routes need:
 * 1. Mock node environment first
 * 2. Proper mocking of dependencies
 * 3. Testing the response format
 */

import { GET, POST } from '../route';
import { getConfigs, updateConfigs } from '@/lib/config';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/config', () => ({
  getConfigs: jest.fn(),
  updateConfigs: jest.fn()
}));

describe('Configs API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/configs', () => {
    it('should return configs', async () => {
      const mockConfigs = { theme: 'dark', language: 'en' };
      (getConfigs as jest.Mock).mockResolvedValue(mockConfigs);

      const request = new NextRequest('http://localhost:3000/api/configs');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockConfigs);
    });

    it('should handle errors', async () => {
      (getConfigs as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const request = new NextRequest('http://localhost:3000/api/configs');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/configs', () => {
    it('should update configs', async () => {
      const newConfigs = { theme: 'light' };
      (updateConfigs as jest.Mock).mockResolvedValue(newConfigs);

      const request = new NextRequest('http://localhost:3000/api/configs', {
        method: 'POST',
        body: JSON.stringify(newConfigs)
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(newConfigs);
    });
  });
});