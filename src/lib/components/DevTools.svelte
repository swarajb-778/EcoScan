<script lang="ts">
	import { ConcurrentUserSimulator } from '$lib/utils/concurrent-simulation';
	import type { ModelConfig } from '$lib/types';
	import { onMount } from 'svelte';
	// import { testingFramework, type TestSuite, type TestResult } from '$lib/utils/testing-framework';
	import { isBrowser } from '$lib/utils/browser';

	let activeTab: 'simulation' | 'testing' = 'simulation';
	let numUsers = 5;
	let durationSeconds = 30;
	let isRunning = false;
	let simulator: ConcurrentUserSimulator | null = null;
	// let testingFrameworkInstance = testingFramework;
	// let testSuites: TestSuite[] = [];
	// let testResults: TestResult[] = [];
	let selectedSuite: string | null = null;
	let isTestRunning = false;
	let mounted = false;

	onMount(() => {
		if (!isBrowser) return;
		
		try {
			simulator = new ConcurrentUserSimulator();
		} catch (error) {
			console.error('Failed to initialize simulator:', error);
		}
		
		mounted = true;
		// initializeTestingFramework();
	});

	function initializeTestingFramework() {
		try {
			// testingFrameworkInstance = testingFramework;
			// Initialize with empty suites - they'll be populated when tests run
			// testSuites = [];
			// testResults = [];
		} catch (error) {
			console.error('Failed to initialize testing framework:', error);
		}
	}

	async function startSimulation() {
		if (!simulator || isRunning) return;
		
		isRunning = true;
		
		const config: ModelConfig = {
			modelPath: '/models/yolov8n.onnx',
			confidenceThreshold: 0.5,
			nmsThreshold: 0.4,
			inputSize: [640, 640],
			maxDetections: 100,
			providers: ['webgl', 'wasm']
		};

		try {
			await simulator.simulateUsers(numUsers, durationSeconds, config);
		} catch (error) {
			console.error('Simulation failed:', error);
		} finally {
			isRunning = false;
		}
	}

	async function stopSimulation() {
		if (simulator) {
			simulator.stop();
			isRunning = false;
		}
	}

	async function runSelectedTestSuite() {
		if (!mounted || !selectedSuite || isTestRunning) {
			return;
		}

		isTestRunning = true;
		
		try {
			// Testing functionality temporarily disabled for build fix
			console.log('Testing functionality temporarily disabled');
		} catch (error) {
			console.error('Test suite execution failed:', error);
		} finally {
			isTestRunning = false;
		}
	}

	function getSuiteName(suiteId: string): string {
		// return testSuites.find(s => s.id === suiteId)?.name ?? suiteId;
		return suiteId;
	}

	function getTestName(testId: string): string {
		// for (const suite of testSuites) {
		// 	const test = suite.tests.find(t => t.id === testId);
		// 	if (test) return test.name;
		// }
		return testId;
	}

	function getTestDuration(testId: string): number {
		// for (const suite of testSuites) {
		// 	const test = suite.tests.find(t => t.id === testId);
		// 	if (test) return test.duration;
		// }
		return 0;
	}

	function getTestStatus(testId: string): 'passed' | 'failed' | 'running' | 'not_started' {
		// for (const suite of testSuites) {
		// 	const test = suite.tests.find(t => t.id === testId);
		// 	if (test) return test.status;
		// }
		return 'not_started';
	}

	function getTestError(testId: string): string | undefined {
		// for (const suite of testSuites) {
		// 	const test = suite.tests.find(t => t.id === testId);
		// 	if (test) return test.error;
		// }
		return undefined;
	}

	function formatDuration(ms: number): string {
		if (ms < 1000) return `${ms.toFixed(0)}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'passed': return 'text-green-600';
			case 'failed': return 'text-red-600';
			case 'running': return 'text-blue-600';
			case 'skipped': return 'text-yellow-600';
			default: return 'text-gray-600';
		}
	}

	function getStatusIcon(status: string): string {
		switch (status) {
			case 'passed': return '✓';
			case 'failed': return '✗';
			case 'running': return '⟳';
			case 'skipped': return '⊝';
			default: return '○';
		}
	}
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
	<div class="flex items-center justify-between mb-6">
		<h2 class="text-xl font-semibold text-gray-900">Developer Tools</h2>
		
		<div class="flex bg-gray-100 rounded-lg p-1">
			<button
				class="px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200"
				class:bg-white={activeTab === 'simulation'}
				class:text-gray-900={activeTab === 'simulation'}
				class:text-gray-600={activeTab !== 'simulation'}
				on:click={() => activeTab = 'simulation'}
			>
				Simulation
			</button>
			<button
				class="px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200"
				class:bg-white={activeTab === 'testing'}
				class:text-gray-900={activeTab === 'testing'}
				class:text-gray-600={activeTab !== 'testing'}
				on:click={() => activeTab = 'testing'}
			>
				Testing
			</button>
		</div>
	</div>

	{#if activeTab === 'simulation'}
		<div class="space-y-4">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label for="numUsers" class="block text-sm font-medium text-gray-700 mb-2">
						Number of Users
					</label>
					<input
						id="numUsers"
						type="number"
						bind:value={numUsers}
						min="1"
						max="50"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
				
				<div>
					<label for="durationSeconds" class="block text-sm font-medium text-gray-700 mb-2">
						Duration (seconds)
					</label>
					<input
						id="durationSeconds"
						type="number"
						bind:value={durationSeconds}
						min="10"
						max="300"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
			</div>

			<div class="flex gap-2">
				<button
					on:click={startSimulation}
					disabled={isRunning || !mounted}
					class="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
				>
					{isRunning ? 'Running...' : 'Start Simulation'}
				</button>
				
				<button
					on:click={stopSimulation}
					disabled={!isRunning}
					class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
				>
					Stop
				</button>
			</div>

			{#if isRunning}
				<div class="bg-blue-50 border border-blue-200 rounded-md p-4">
					<div class="flex items-center">
						<div class="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
						<span class="text-sm text-blue-800">
							Simulating {numUsers} concurrent users for {durationSeconds} seconds...
						</span>
					</div>
				</div>
			{/if}

			{#if simulator && !isRunning}
				<div class="bg-gray-50 border border-gray-200 rounded-md p-4">
					<h3 class="font-medium text-gray-900 mb-2">Simulation Results</h3>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
						<div>
							<span class="text-gray-600">Total Users:</span>
							<span class="font-mono ml-1">{simulator.getResults().totalUsers}</span>
						</div>
						<div>
							<span class="text-gray-600">Completed:</span>
							<span class="font-mono ml-1">{simulator.getResults().completedUsers}</span>
						</div>
						<div>
							<span class="text-gray-600">Errors:</span>
							<span class="font-mono ml-1">{simulator.getResults().errors}</span>
						</div>
						<div>
							<span class="text-gray-600">Avg Time:</span>
							<span class="font-mono ml-1">{simulator.getResults().averageTime.toFixed(0)}ms</span>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="space-y-4">
			<div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
				<div class="flex items-center">
					<div class="text-yellow-600 mr-2">⚠️</div>
					<span class="text-sm text-yellow-800">
						Testing functionality is temporarily disabled for build stability. Will be restored in next update.
					</span>
				</div>
			</div>
		</div>
	{/if}
</div> 