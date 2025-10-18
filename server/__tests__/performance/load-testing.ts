/**
 * Load Testing Script
 * 
 * Tests application performance under load using autocannon
 * 
 * Note: This requires optional dependency:
 * npm install --save-dev autocannon @types/autocannon
 */

// @ts-ignore - Optional dependency
import autocannon from 'autocannon';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface LoadTestConfig {
  url: string;
  name: string;
  method: 'GET' | 'POST';
  body?: any;
  headers?: Record<string, string>;
  connections: number;
  duration: number;
}

interface LoadTestResult {
  name: string;
  requests: {
    total: number;
    average: number;
    mean: number;
    p50: number;
    p95: number;
    p99: number;
  };
  latency: {
    average: number;
    mean: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    average: number;
    mean: number;
  };
  errors: number;
  timeouts: number;
  passed: boolean;
}

const LOAD_TESTS: LoadTestConfig[] = [
  {
    url: 'http://localhost:5000/api/health',
    name: 'Health Check',
    method: 'GET',
    connections: 100,
    duration: 10,
  },
  {
    url: 'http://localhost:5000/api/search',
    name: 'Search Endpoint (Cached)',
    method: 'POST',
    body: JSON.stringify({ query: 'sustainable fashion' }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test_token',
    },
    connections: 50,
    duration: 15,
  },
  {
    url: 'http://localhost:5000/api/search-history',
    name: 'Search History',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer test_token',
    },
    connections: 100,
    duration: 10,
  },
];

const PERFORMANCE_THRESHOLDS = {
  maxAverageLatency: 500, // 500ms
  maxP95Latency: 2000, // 2s
  maxP99Latency: 3000, // 3s
  minRequestsPerSecond: 100,
  maxErrorRate: 0.01, // 1%
};

async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  console.log(`\n🔥 Running load test: ${config.name}`);
  console.log(`   URL: ${config.url}`);
  console.log(`   Connections: ${config.connections}`);
  console.log(`   Duration: ${config.duration}s`);

  const instance = autocannon({
    url: config.url,
    method: config.method,
    body: config.body,
    headers: config.headers,
    connections: config.connections,
    duration: config.duration,
  });

  return new Promise((resolve, reject) => {
    autocannon.track(instance, { renderProgressBar: true });

    instance.on('done', (result: any) => {
      const requests = result.requests;
      const latency = result.latency;
      const throughput = result.throughput;

      const errorRate = result.errors / result.requests.total;
      const avgLatency = latency.mean;
      const p95Latency = latency.p95;
      const p99Latency = latency.p99;
      const reqPerSec = requests.mean;

      const passed = 
        avgLatency <= PERFORMANCE_THRESHOLDS.maxAverageLatency &&
        p95Latency <= PERFORMANCE_THRESHOLDS.maxP95Latency &&
        p99Latency <= PERFORMANCE_THRESHOLDS.maxP99Latency &&
        reqPerSec >= PERFORMANCE_THRESHOLDS.minRequestsPerSecond &&
        errorRate <= PERFORMANCE_THRESHOLDS.maxErrorRate;

      const testResult: LoadTestResult = {
        name: config.name,
        requests: {
          total: requests.total,
          average: requests.average,
          mean: requests.mean,
          p50: requests.p50,
          p95: requests.p95,
          p99: requests.p99,
        },
        latency: {
          average: latency.average,
          mean: latency.mean,
          p50: latency.p50,
          p95: latency.p95,
          p99: latency.p99,
        },
        throughput: {
          average: throughput.average,
          mean: throughput.mean,
        },
        errors: result.errors,
        timeouts: result.timeouts,
        passed,
      };

      resolve(testResult);
    });

    instance.on('error', reject);
  });
}

function formatResult(result: LoadTestResult): string {
  const { name, requests, latency, throughput, errors, timeouts, passed } = result;
  
  return `
📊 ${name} ${passed ? '✅' : '❌'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Requests:
  Total:       ${requests.total.toLocaleString()}
  Per Second:  ${requests.mean.toFixed(2)} ${requests.mean >= PERFORMANCE_THRESHOLDS.minRequestsPerSecond ? '✅' : '❌'}
  
Latency:
  Average:     ${latency.mean.toFixed(2)}ms ${latency.mean <= PERFORMANCE_THRESHOLDS.maxAverageLatency ? '✅' : '❌'}
  p50:         ${latency.p50.toFixed(2)}ms
  p95:         ${latency.p95.toFixed(2)}ms ${latency.p95 <= PERFORMANCE_THRESHOLDS.maxP95Latency ? '✅' : '❌'}
  p99:         ${latency.p99.toFixed(2)}ms ${latency.p99 <= PERFORMANCE_THRESHOLDS.maxP99Latency ? '✅' : '❌'}

Throughput:
  Average:     ${(throughput.mean / 1024 / 1024).toFixed(2)} MB/s

Errors:
  Total:       ${errors}
  Timeouts:    ${timeouts}
  Error Rate:  ${((errors / requests.total) * 100).toFixed(2)}% ${(errors / requests.total) <= PERFORMANCE_THRESHOLDS.maxErrorRate ? '✅' : '❌'}
`;
}

async function runAllLoadTests() {
  console.log('🚀 Starting Load Testing...\n');
  console.log('⚠️  Make sure the development server is running on http://localhost:5000\n');

  const results: LoadTestResult[] = [];
  const failures: string[] = [];

  for (const config of LOAD_TESTS) {
    try {
      const result = await runLoadTest(config);
      results.push(result);
      console.log(formatResult(result));

      if (!result.passed) {
        if (result.latency.mean > PERFORMANCE_THRESHOLDS.maxAverageLatency) {
          failures.push(`${config.name}: Average latency ${result.latency.mean.toFixed(2)}ms > ${PERFORMANCE_THRESHOLDS.maxAverageLatency}ms`);
        }
        if (result.latency.p95 > PERFORMANCE_THRESHOLDS.maxP95Latency) {
          failures.push(`${config.name}: P95 latency ${result.latency.p95.toFixed(2)}ms > ${PERFORMANCE_THRESHOLDS.maxP95Latency}ms`);
        }
        if (result.requests.mean < PERFORMANCE_THRESHOLDS.minRequestsPerSecond) {
          failures.push(`${config.name}: Requests/sec ${result.requests.mean.toFixed(2)} < ${PERFORMANCE_THRESHOLDS.minRequestsPerSecond}`);
        }
        if (result.errors / result.requests.total > PERFORMANCE_THRESHOLDS.maxErrorRate) {
          failures.push(`${config.name}: Error rate ${((result.errors / result.requests.total) * 100).toFixed(2)}% > ${PERFORMANCE_THRESHOLDS.maxErrorRate * 100}%`);
        }
      }

    } catch (error) {
      console.error(`❌ Error running load test ${config.name}:`, error);
      failures.push(`${config.name}: Test failed - ${error}`);
    }
  }

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(__dirname, `load-test-report-${timestamp}.json`);
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📈 SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.passed).length}`);
  console.log(`Failed: ${failures.length}`);

  if (failures.length > 0) {
    console.log('\n❌ FAILURES:');
    failures.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('\n✅ All load tests passed!');
    process.exit(0);
  }
}

// Run load tests
runAllLoadTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
