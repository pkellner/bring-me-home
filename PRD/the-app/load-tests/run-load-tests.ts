#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface LoadTestConfig {
  baseUrl: string;
  testScenarios: Record<string, any>;
  publicPages: any;
  userBehaviorProfiles: any;
  performanceThresholds: any;
}

interface TestUrl {
  path: string;
  name: string;
  priority: string;
  type: string;
}

async function fetchDynamicUrls(): Promise<TestUrl[]> {
  try {
    console.log('🔍 Fetching dynamic URLs from database...');
    
    // Fetch all active towns
    const towns = await prisma.town.findMany({
      where: { isActive: true },
      select: { 
        slug: true, 
        name: true,
        persons: {
          where: { isActive: true },
          select: { slug: true, firstName: true, lastName: true },
          take: 5 // Limit to 5 persons per town for testing
        }
      }
    });

    const urls: TestUrl[] = [];

    // Add town URLs
    towns.forEach(town => {
      urls.push({
        path: `/${town.slug}`,
        name: `Town: ${town.name}`,
        priority: 'high',
        type: 'town'
      });

      // Add person URLs for this town
      town.persons.forEach(person => {
        urls.push({
          path: `/${town.slug}/${person.slug}`,
          name: `Person: ${person.firstName} ${person.lastName} (${town.name})`,
          priority: 'medium',
          type: 'person'
        });
      });
    });

    console.log(`✅ Found ${towns.length} towns and ${urls.filter(u => u.type === 'person').length} persons`);
    return urls;
  } catch (error) {
    console.error('❌ Error fetching dynamic URLs:', error);
    return [];
  }
}

async function generateArtilleryConfig(urls: TestUrl[], scenario: string = 'medium') {
  const config = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf-8')) as LoadTestConfig;
  const testScenario = config.testScenarios[scenario];
  
  // Combine static and dynamic URLs
  const allUrls = [
    ...config.publicPages.static,
    ...config.publicPages.auth,
    ...urls
  ];

  // Group URLs by priority
  const highPriorityUrls = allUrls.filter(u => u.priority === 'high');
  const mediumPriorityUrls = allUrls.filter(u => u.priority === 'medium');
  const lowPriorityUrls = allUrls.filter(u => u.priority === 'low');

  const artilleryConfig = {
    config: {
      target: config.baseUrl,
      phases: [
        {
          duration: parseInt(testScenario.duration),
          arrivalRate: testScenario.arrivalRate,
          rampTo: testScenario.rampTo
        }
      ],
      processor: './processor.js',
      plugins: {
        'metrics-by-endpoint': {}
      }
    },
    scenarios: [
      {
        name: 'High Priority Pages',
        weight: 50,
        flow: highPriorityUrls.map(url => ({
          get: {
            url: url.path,
            headers: {
              'User-Agent': 'Artillery Load Test'
            }
          }
        }))
      },
      {
        name: 'Medium Priority Pages',
        weight: 35,
        flow: mediumPriorityUrls.slice(0, 10).map(url => ({ // Limit to 10 URLs
          get: {
            url: url.path,
            headers: {
              'User-Agent': 'Artillery Load Test'
            }
          }
        }))
      },
      {
        name: 'Low Priority Pages',
        weight: 15,
        flow: lowPriorityUrls.map(url => ({
          get: {
            url: url.path,
            headers: {
              'User-Agent': 'Artillery Load Test'
            }
          }
        }))
      },
      {
        name: 'User Journey - Family Member',
        weight: 20,
        flow: [
          { get: { url: '/' } },
          { think: 3 },
          { get: { url: urls.find(u => u.type === 'town')?.path || '/borrego-springs' } },
          { think: 5 },
          { get: { url: urls.find(u => u.type === 'person')?.path || '/borrego-springs/john-smith' } },
          { think: 3 },
          { get: { url: '/show-your-support' } }
        ]
      }
    ]
  };

  return artilleryConfig;
}

async function runLoadTest(scenario: string = 'medium') {
  try {
    console.log(`\n🚀 Running load test with scenario: ${scenario}`);
    
    // Fetch dynamic URLs
    const dynamicUrls = await fetchDynamicUrls();
    
    console.log('\n📝 URLs to be tested:');
    console.log('─'.repeat(60));
    console.log('HIGH PRIORITY:');
    dynamicUrls.filter(u => u.priority === 'high').slice(0, 5).forEach(u => {
      console.log(`  ${u.path}`);
    });
    console.log('\nMEDIUM PRIORITY:');
    dynamicUrls.filter(u => u.priority === 'medium').slice(0, 5).forEach(u => {
      console.log(`  ${u.path}`);
    });
    console.log(`\n... and ${dynamicUrls.length - 10} more URLs`);
    console.log('─'.repeat(60));
    
    // Generate Artillery config
    const artilleryConfig = await generateArtilleryConfig(dynamicUrls, scenario);
    
    // Create reports directory
    mkdirSync(join(__dirname, 'reports'), { recursive: true });
    
    // Write Artillery config
    const configPath = join(__dirname, 'artillery-generated.yml');
    writeFileSync(configPath, JSON.stringify(artilleryConfig, null, 2));
    
    console.log(`\n📊 Generated test configuration with ${dynamicUrls.length} dynamic URLs`);
    
    // Check if Artillery is installed
    try {
      await execAsync('npx artillery --version');
    } catch {
      console.log('\n⚠️  Artillery not found. Installing...');
      await execAsync('npm install -D artillery');
    }
    
    // Run Artillery test
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(__dirname, 'reports', `report-${scenario}-${timestamp}.html`);
    
    console.log('\n🏃 Running Artillery load test...');
    const { stdout, stderr } = await execAsync(
      `npx artillery run ${configPath} --output ${reportPath.replace('.html', '.json')}`
    );
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    // Generate HTML report
    await execAsync(
      `npx artillery report ${reportPath.replace('.html', '.json')} --output ${reportPath}`
    );
    
    console.log(`\n✅ Load test completed! Report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Error running load test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const scenario = args[0] || 'medium';
const baseUrl = args[1] || null;

// Validate scenario
const config = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf-8')) as LoadTestConfig;
if (!config.testScenarios[scenario]) {
  console.error(`❌ Invalid scenario: ${scenario}`);
  console.log(`Available scenarios: ${Object.keys(config.testScenarios).join(', ')}`);
  console.log(`Usage: npx tsx run-load-tests.ts [scenario] [baseUrl]`);
  console.log(`Example: npx tsx run-load-tests.ts medium http://cache2.bring-me-home.com`);
  process.exit(1);
}

// Override base URL if provided
if (baseUrl) {
  config.baseUrl = baseUrl;
  console.log(`🌐 Using custom base URL: ${baseUrl}`);
}

// Run the load test
runLoadTest(scenario).catch(console.error);