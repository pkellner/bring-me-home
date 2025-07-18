import { isSupportMapEnabled } from '../support-map';

describe('isSupportMapEnabled', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  it('should return true when ENABLE_SUPPORT_MAP is "true"', async () => {
    process.env.ENABLE_SUPPORT_MAP = 'true';
    const result = await isSupportMapEnabled();
    expect(result).toBe(true);
  });

  it('should return false when ENABLE_SUPPORT_MAP is "false"', async () => {
    process.env.ENABLE_SUPPORT_MAP = 'false';
    const result = await isSupportMapEnabled();
    expect(result).toBe(false);
  });

  it('should return false when ENABLE_SUPPORT_MAP is undefined', async () => {
    delete process.env.ENABLE_SUPPORT_MAP;
    const result = await isSupportMapEnabled();
    expect(result).toBe(false);
  });

  it('should return false when ENABLE_SUPPORT_MAP is any other value', async () => {
    process.env.ENABLE_SUPPORT_MAP = 'yes';
    const result = await isSupportMapEnabled();
    expect(result).toBe(false);
  });
});