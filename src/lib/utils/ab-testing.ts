import { writable, type Writable } from 'svelte/store';

export type ExperimentVariant = 'A' | 'B' | 'control';

export interface Experiment {
	id: string; // A unique identifier for the experiment (e.g., 'model-performance-test').
	name: string; // A human-readable name for the experiment.
	description: string; // A detailed description of what is being tested.
	variants: Record<string, any>; // Configuration for each variant (A, B, etc.).
	trafficAllocation: number; // The percentage of users (0-1) to be included in the experiment.
}

export interface ActiveExperiment {
	id: string;
	variant: ExperimentVariant;
}

const EXPERIMENTS_KEY = 'eco_scan_experiments';

/**
 * A/B Testing Framework for model versions and UI experiments.
 * This framework allows for controlled rollouts and performance comparisons.
 */
class ABTestingFramework {
	/**
	 * @type {Map<string, Experiment>}
	 */
	experiments = new Map<string, Experiment>();

	/**
	 * @type {import('svelte/store').Writable<Record<string, ActiveExperiment>>}
	 */
	activeExperiments: Writable<Record<string, ActiveExperiment>> = writable({});

	constructor() {
		if (typeof window !== 'undefined') {
			this.loadFromLocalStorage();
		}
	}

	/**
	 * Registers a new experiment.
	 * @param {Experiment} experimentConfig - The configuration for the experiment.
	 */
	registerExperiment(experimentConfig: Experiment) {
		this.experiments.set(experimentConfig.id, experimentConfig);
		this.assignVariant(experimentConfig.id);
	}

	/**
	 * Assigns a user to a variant for a given experiment.
	 * @param {string} experimentId
	 */
	assignVariant(experimentId: string) {
		const experiment = this.experiments.get(experimentId);
		if (!experiment) return;

		// Don't re-assign if already in experiment
		let currentAssignments = this.getAssignments();
		if (currentAssignments[experimentId]) return;

		// Decide if user is in the experiment based on traffic allocation
		if (Math.random() > experiment.trafficAllocation) {
			return; // User is not included in the experiment
		}

		// Simple A/B assignment
		const variant: ExperimentVariant = Math.random() < 0.5 ? 'A' : 'B';
		const assignment: ActiveExperiment = { id: experimentId, variant };

		this.activeExperiments.update((assignments) => {
			assignments[experimentId] = assignment;
			return assignments;
		});

		this.saveToLocalStorage();
	}

	/**
	 * Gets the assigned variant for a user for a specific experiment.
	 * @param {string} experimentId
	 * @returns {ExperimentVariant | null}
	 */
	getVariant(experimentId: string): ExperimentVariant | null {
		let variant: ExperimentVariant | null = null;
		this.activeExperiments.subscribe((assignments) => {
			variant = assignments[experimentId]?.variant ?? null;
		})();
		return variant;
	}

	/**
	 * Gets the configuration for the assigned variant.
	 * @param {string} experimentId
	 * @returns {any}
	 */
	getVariantConfig(experimentId: string): any {
		const experiment = this.experiments.get(experimentId);
		const variant = this.getVariant(experimentId);

		if (!experiment || !variant) {
			return experiment?.variants['control'] ?? {}; // Fallback to a 'control' or default
		}

		return experiment.variants[variant] ?? experiment.variants['control'] ?? {};
	}

	/**
	 * Gets all active experiment assignments.
	 * @returns {Record<string, ActiveExperiment>}
	 */
	getAssignments(): Record<string, ActiveExperiment> {
		let assignments: Record<string, ActiveExperiment> = {};
		this.activeExperiments.subscribe((value) => {
			assignments = value;
		})();
		return assignments;
	}

	/**
	 * Saves active experiment assignments to local storage.
	 * @private
	 */
	private saveToLocalStorage() {
		try {
			const assignments = this.getAssignments();
			localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(assignments));
		} catch (error) {
			console.error('Failed to save A/B testing state to localStorage:', error);
		}
	}

	/**
	 * Loads active experiment assignments from local storage.
	 * @private
	 */
	private loadFromLocalStorage() {
		try {
			const storedState = localStorage.getItem(EXPERIMENTS_KEY);
			if (storedState) {
				this.activeExperiments.set(JSON.parse(storedState));
			}
		} catch (error) {
			console.error('Failed to load A/B testing state from localStorage:', error);
			this.activeExperiments.set({});
		}
	}
}

export const abTestingFramework = new ABTestingFramework(); 