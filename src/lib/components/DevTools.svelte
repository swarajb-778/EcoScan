<script lang="ts">
	import { ConcurrentUserSimulator } from '$lib/utils/concurrent-simulation';
	import type { ModelConfig } from '$lib/types';
	import { onMount } from 'svelte';
	import { TestingFramework, type TestSuite, type TestRun } from '$lib/utils/testing-framework';

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

	onMount(() => {
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
	});

	const modelConfig: ModelConfig = {
		modelPath: '/models/yolov8n.onnx',
		inputSize: [640, 640],
		threshold: 0.5,
		iouThreshold: 0.5,
		classNames: [] // Add class names if needed
	};

	function startSimulation() {
		if (isRunning) return;

		isRunning = true;
		simulator = new ConcurrentUserSimulator({
			numUsers,
			durationSeconds,
			modelConfig
		});

		simulator.start().finally(() => {
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
		if (!selectedSuite || isTestRunning) return;
		isTestRunning = true;
		testRuns = []; // Clear previous runs for this suite
		await testingFramework.runTestSuite(selectedSuite);
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
</script>

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
			<input type="number" id="numUsers" bind:value={numUsers} class="input input-bordered" min="1" max="50" />
		</div>
		<div class="form-control">
			<label class="label" for="duration">
				<span class="label-text">Duration (seconds)</span>
			</label>
			<input type="number" id="duration" bind:value={durationSeconds} class="input input-bordered" min="5" max="300" />
		</div>
		<div class="card-actions justify-end mt-4">
			<button class="btn btn-primary" on:click={startSimulation} disabled={isRunning}>
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
		<h2 class="card-title">Test Suites</h2>
		<p>Run automated tests to validate application stability and performance.</p>
		<div class="form-control">
			<label class="label" for="testSuite">
				<span class="label-text">Select Test Suite</span>
			</label>
			<select class="select select-bordered" bind:value={selectedSuite} disabled={isTestRunning}>
				<option disabled selected value={null}>Pick one</option>
				{#each testSuites as suite}
					<option value={suite.id}>{suite.name} ({suite.priority})</option>
				{/each}
			</select>
		</div>
		<div class="card-actions justify-end mt-4">
			<button class="btn btn-primary" on:click={runTestSuite} disabled={!selectedSuite || isTestRunning}>
				{#if isTestRunning}
					<span class="loading loading-spinner"></span>
					Running...
				{:else}
					Run Suite
				{/if}
			</button>
		</div>

		{#if testRuns.length > 0}
			<div class="divider">Test Results</div>
			<div class="space-y-4">
				{#each testRuns as run}
					<div class="collapse collapse-arrow bg-base-100">
						<input type="checkbox" checked /> 
						<div class="collapse-title text-xl font-medium">
							{getSuiteName(run.suiteId)} - {new Date(run.startTime).toLocaleTimeString()} ({run.summary.duration.toFixed(0)}ms)
							<div class="badge badge-secondary">{run.status}</div>
						</div>
						<div class="collapse-content"> 
							<ul class="steps steps-vertical lg:steps-horizontal w-full">
								{#each run.results as result}
									<li class="step" class:step-success={result.status === 'passed'} class:step-error={result.status === 'failed' || result.status === 'error'}>
										<div class="text-left p-2">
											<strong>{getTestName(result.testId)}</strong><br/>
											<span class="text-xs">{result.message} ({result.duration.toFixed(0)}ms)</span>
										</div>
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
{/if}

<style>
	.tab-active {
		border-bottom: none;
	}
</style> 