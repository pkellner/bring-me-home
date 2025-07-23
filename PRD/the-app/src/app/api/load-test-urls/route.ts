import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface TestUrl {
  path: string;
  name: string;
  category: 'static' | 'auth' | 'api' | 'town' | 'person';
  priority: 'high' | 'medium' | 'low';
  cacheable: boolean;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const includeStatic = searchParams.get('includeStatic') !== 'false';
    const includeAuth = searchParams.get('includeAuth') !== 'false';
    const includeApi = searchParams.get('includeApi') !== 'false';
    const includeTowns = searchParams.get('includeTowns') !== 'false';
    const includePersons = searchParams.get('includePersons') !== 'false';
    const maxPersonsPerTown = parseInt(searchParams.get('maxPersonsPerTown') || '3');
    const allPersons = searchParams.get('allPersons') === 'true';
    // const allTowns = searchParams.get('allTowns') === 'true'; // Reserved for future use
    
    const urls: TestUrl[] = [];

    // Static pages
    if (includeStatic) {
      urls.push(
        { path: '/', name: 'Homepage', category: 'static', priority: 'high', cacheable: false },
        { path: '/learn-more', name: 'Learn More', category: 'static', priority: 'medium', cacheable: false },
        { path: '/show-your-support', name: 'Show Your Support', category: 'static', priority: 'medium', cacheable: false },
        { path: '/code-of-conduct', name: 'Code of Conduct', category: 'static', priority: 'low', cacheable: false },
        { path: '/privacy-policy', name: 'Privacy Policy', category: 'static', priority: 'low', cacheable: false },
        { path: '/configs', name: 'Configurations', category: 'static', priority: 'low', cacheable: false }
      );
    }

    // Auth pages
    if (includeAuth) {
      urls.push(
        { path: '/auth/signin', name: 'Sign In', category: 'auth', priority: 'medium', cacheable: false },
        { path: '/auth/register', name: 'Register', category: 'auth', priority: 'low', cacheable: false },
        { path: '/auth/forgot-password', name: 'Forgot Password', category: 'auth', priority: 'low', cacheable: false }
      );
    }

    // API endpoints (these support caching)
    if (includeApi) {
      urls.push(
        { path: '/api/homepage-data', name: 'Homepage Data API', category: 'api', priority: 'high', cacheable: true },
        { path: '/api/configs', name: 'Configs API', category: 'api', priority: 'medium', cacheable: true }
      );
    }

    // Fetch dynamic URLs from database
    if (includeTowns || includePersons) {
      const towns = await prisma.town.findMany({
        where: { isActive: true },
        select: {
          slug: true,
          name: true,
          ...(includePersons && {
            persons: {
              where: { isActive: true },
              select: { slug: true, firstName: true, lastName: true },
              take: allPersons ? undefined : maxPersonsPerTown
            }
          })
        }
      });

      // Add town pages and their API endpoints
      towns.forEach(town => {
        if (includeTowns) {
          urls.push({
            path: `/${town.slug}`,
            name: `Town: ${town.name}`,
            category: 'town',
            priority: 'high',
            cacheable: false
          });

          if (includeApi) {
            urls.push({
              path: `/api/town-data/${town.slug}`,
              name: `Town Data API: ${town.name}`,
              category: 'api',
              priority: 'high',
              cacheable: true
            });
          }
        }

        // Add person pages and their API endpoints
        if (includePersons && town.persons && Array.isArray(town.persons)) {
          town.persons.forEach(person => {
            urls.push({
              path: `/${town.slug}/${person.slug}`,
              name: `Person: ${person.firstName} ${person.lastName}`,
              category: 'person',
              priority: 'medium',
              cacheable: false
            });

            if (includeApi) {
              urls.push({
                path: `/api/person-data/${town.slug}/${person.slug}`,
                name: `Person Data API: ${person.firstName} ${person.lastName}`,
                category: 'api',
                priority: 'medium',
                cacheable: true
              });
            }
          });
        }
      });
    }

    // Return metadata about the test configuration
    const response = {
      urls,
      metadata: {
        totalUrls: urls.length,
        categories: {
          static: urls.filter(u => u.category === 'static').length,
          auth: urls.filter(u => u.category === 'auth').length,
          api: urls.filter(u => u.category === 'api').length,
          town: urls.filter(u => u.category === 'town').length,
          person: urls.filter(u => u.category === 'person').length
        },
        cacheableUrls: urls.filter(u => u.cacheable).length,
        generatedAt: new Date().toISOString()
      },
      testScenarios: {
        light: {
          duration: 30,
          concurrentUsers: 5,
          description: 'Light load - 5 concurrent users for 30 seconds'
        },
        medium: {
          duration: 60,
          concurrentUsers: 20,
          description: 'Medium load - 20 concurrent users for 60 seconds'
        },
        heavy: {
          duration: 120,
          concurrentUsers: 50,
          description: 'Heavy load - 50 concurrent users for 2 minutes'
        }
      },
      parameters: {
        includeStatic: { default: true, description: 'Include static pages like homepage, privacy policy' },
        includeAuth: { default: true, description: 'Include auth pages like signin, register' },
        includeApi: { default: true, description: 'Include API endpoints that support caching' },
        includeTowns: { default: true, description: 'Include town listing pages' },
        includePersons: { default: true, description: 'Include person detail pages' },
        maxPersonsPerTown: { default: 3, description: 'Max persons per town (unless allPersons=true)' },
        allPersons: { default: false, description: 'Include ALL persons (may be many!)' }
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': '*', // Allow cross-origin requests for testing
      }
    });
  } catch (error) {
    console.error('Error generating load test URLs:', error);
    return NextResponse.json(
      { error: 'Failed to generate load test URLs' },
      { status: 500 }
    );
  }
}