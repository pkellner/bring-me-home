import { NextResponse } from 'next/server';

export async function GET() {
  const envVar = process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY;
  
  return NextResponse.json({
    NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY: envVar,
    type: typeof envVar,
    length: envVar?.length,
    equals_false: envVar === 'false',
    equals_true: envVar === 'true',
    all_env_keys: Object.keys(process.env).filter(key => key.includes('AWS')),
  });
}