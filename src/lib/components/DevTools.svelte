<script lang="ts">
	import { ConcurrentUserSimulator } from '$lib/utils/concurrent-simulation';
	import type { ModelConfig } from '$lib/types';
	import { onMount } from 'svelte';
	import { testingFramework, type TestSuite, type TestRun } from '$lib/utils/testing-framework';
	import { isBrowser } from '$lib/utils/browser';

	let activeTab: 'simulation' | 'testing' = 'simulation';
	let numUsers = 5;
	let durationSeconds = 30;
	let isRunning = false;
	let simulator: ConcurrentUserSimulator | null = null;
	let testingFramework: TestingFramework;
	let testSuites: TestSuite[] = [];
	let testRuns: TestRun[] = [];
	let selectedSuite: string | null = null;
	let isTestRunning = false;
	let mounted = false;

	onMount(() => {
		if (!isBrowser()) {
			console.warn('DevTools skipping initialization during SSR');
			return;
		}
		
		mounted = true;
		initializeTestingFramework();
	});

	function initializeTestingFramework() {
		try {
			testingFramework = new TestingFramework();
			testSuites = testingFramework.getAllTestSuites();
			testingFramework.setCallbacks(
				() => {},
				() => {
					// After each test, update the runs
					testRuns = [...testingFramework.getTestRuns()];
				},
				() => {
					// After suite completes
					isTestRunning = false;
					testRuns = [...testingFramework.getTestRuns()];
				}
			);
		} catch (error) {
			console.error('Failed to initialize testing framework:', error);
		}
	}

	const modelConfig: ModelConfig = {
		modelPath: '/models/yolov8n.onnx',
		inputSize: [640, 640],
		threshold: 0.5,
		iouThreshold: 0.5,
		classNames: [] // Add class names if needed
	};

	function startSimulation() {
		if (!mounted || !isBrowser() || isRunning) {
			console.warn('Cannot start simulation: not ready or already running');
			return;
		}

		isRunning = true;
		simulator = new ConcurrentUserSimulator({
			numUsers,
			durationSeconds,
			modelConfig
		});

		simulator.start().catch((error) => {
			console.error('Simulation failed:', error);
		}).finally(() => {
			isRunning = false;
			simulator = null;
		});
	}

	function stopSimulation() {
		if (!simulator) return;
		simulator.stop();
		isRunning = false;
		simulator = null;
	}

	async function runTestSuite() {
		if (!mounted || !selectedSuite || isTestRunning || !testingFramework) {
			console.warn('Cannot run test suite: not ready or invalid state');
			return;
		}
		
		isTestRunning = true;
		testRuns = []; // Clear previous runs for this suite
		
		try {
			await testingFramework.runTestSuite(selectedSuite);
		} catch (error) {
			console.error('Test suite execution failed:', error);
			isTestRunning = false;
		}
	}

	function getSuiteName(suiteId: string): string {
		return testSuites.find(s => s.id === suiteId)?.name ?? suiteId;
	}

	function getTestName(testId: string): string {
		for (const suite of testSuites) {
			const test = suite.tests.find(t => t.id === testId);
			if (test) return test.name;
		}
		return testId;
	}

	function validateSimulationParams(): boolean {
		return numUsers > 0 && numUsers <= 50 && durationSeconds >= 5 && durationSeconds <= 300;
	}
</script>

{#if mounted}
<div class="tabs tabs-boxed mb-4">
	<a class="tab" class:tab-active={activeTab === 'simulation'} on:click={() => activeTab = 'simulation'}>
		🚀 Simulation
	</a> 
	<a class="tab" class:tab-active={activeTab === 'testing'} on:click={() => activeTab = 'testing'}>
		🔬 Testing
	</a>
</div>

{#if activeTab === 'simulation'}
<div class="card bg-base-200 shadow-xl m-4 transition-all duration-300">
	<div class="card-body">
		<h2 class="card-title">Concurrent User Simulation</h2>
		<p>Stress-test the application by simulating multiple users.</p>
		<div class="form-control">
			<label class="label" for="numUsers">
				<span class="label-text">Number of Users</span>
			</label>
			<input 
				type="number" 
				id="numUsers" 
				bind:value={numUsers} 
				class="input input-bordered" 
				class:input-error={numUsers < 1 || numUsers > 50}
				min="1" 
				max="50" 
			/>
			{#if numUsers < 1 || numUsers > 50}
				<div class="label">
					<span class="label-text-alt text-error">Must be between 1 and 50</span>
				</div>
			{/if}
		</div>
		<div class="form-control">
			<label class="label" for="duration">
				<span class="label-text">Duration (seconds)</span>
			</label>
			<input 
				type="number" 
				id="duration" 
				bind:value={durationSeconds} 
				class="input input-bordered" 
				class:input-error={durationSeconds < 5 || durationSeconds > 300}
				min="5" 
				max="300" 
			/>
			{#if durationSeconds < 5 || durationSeconds > 300}
				<div class="label">
					<span class="label-text-alt text-error">Must be between 5 and 300 seconds</span>
				</div>
			{/if}
		</div>
		<div class="card-actions justify-end mt-4">
			<button 
				class="btn btn-primary" 
				class:btn-disabled={!validateSimulationParams()}
				on:click={startSimulation} 
				disabled={isRunning || !validateSimulationParams()}
			>
				{#if isRunning}
					<span class="loading loading-spinner"></span>
					Running...
				{:else}
					Start Simulation
				{/if}
			</button>
			<button class="btn btn-secondary" on:click={stopSimulation} disabled={!isRunning}>
				Stop
			</button>
		</div>
	</div>
</div>
{/if}

{#if activeTab === 'testing'}
<div class="card bg-base-200 shadow-xl m-4 transition-all duration-300">
	<div class="card-body">
		<h2 class="card-title">Automated Testing Suite</h2>
		<p>Run comprehensive tests to validate application functionality.</p>
		
		{#if testSuites.length > 0}
			<div class="form-control">
				<label class="label" for="suite-select">
					<span class="label-text">Select Test Suite</span>
				</label>
				<select 
					id="suite-select"
					class="select select-bordered" 
					bind:value={selectedSuite}
				>
					<option value={null}>Choose a test suite...</option>
					{#each testSuites as suite}
						<option value={suite.id}>{suite.name}</option>
					{/each}
				</select>
			</div>
			
			<div class="card-actions justify-end mt-4">
				<button 
					class="btn btn-primary" 
					on:click={runTestSuite} 
					disabled={!selectedSuite || isTestRunning}
				>
					{#if isTestRunning}
						<span class="loading loading-spinner"></span>
						Running Tests...
					{:else}
						Run Test Suite
					{/if}
				</button>
			</div>
		{:else}
			<div class="alert alert-warning">
				<span>No test suites available. TestingFramework may not be properly initialized.</span>
			</div>
		{/if}

		<!-- Test Results -->
		{#if testRuns.length > 0}
			<div class="mt-6">
				<h3 class="text-lg font-semibold mb-4">Test Results</h3>
				<div class="space-y-2 max-h-96 overflow-y-auto">
					{#each testRuns as run}
						<details class="collapse collapse-arrow bg-base-100">
							<summary class="collapse-title text-sm font-medium">
								<div class="flex items-center space-x-2">
									{#if run.status === 'passed'}
										<span class="badge badge-success badge-sm">✓</span>
									{:else if run.status === 'failed'}
										<span class="badge badge-error badge-sm">✗</span>
									{:else}
										<span class="badge badge-warning badge-sm">⧗</span>
									{/if}
									<span>{getTestName(run.testId)}</span>
									<span class="text-xs text-gray-500">({run.duration}ms)</span>
								</div>
							</summary>
							<div class="collapse-content text-xs">
								<div class="p-4 bg-gray-50 rounded">
									<p><strong>Suite:</strong> {getSuiteName(run.suiteId)}</p>
									<p><strong>Status:</strong> {run.status}</p>
									<p><strong>Duration:</strong> {run.duration}ms</p>
									{#if run.error}
										<p><strong>Error:</strong></p>
										<pre class="text-red-600 whitespace-pre-wrap">{run.error}</pre>
									{/if}
									{#if run.result}
										<p><strong>Result:</strong></p>
										<pre class="whitespace-pre-wrap">{JSON.stringify(run.result, null, 2)}</pre>
									{/if}
								</div>
							</div>
						</details>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
{/if}
{:else}
	<div class="alert alert-info">
		<span>Developer tools are initializing...</span>
	</div>
{/if}

<style>
	.tab-active {
		border-bottom: none;
	}
</style> 