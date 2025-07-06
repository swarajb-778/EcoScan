import { ObjectDetector } from '$lib/ml/detector';
import { getMockImageData } from '$lib/utils/testing-framework';
import type { ModelConfig } from '$lib/types';

interface SimulationConfig {
	numUsers: number;
	durationSeconds: number;
	modelConfig: ModelConfig;
	thinkTimeMs?: number; // Time between actions to simulate user behavior
}

interface UserSession {
	id: number;
	detector: ObjectDetector;
	isProcessing: boolean;
	framesProcessed: number;
	errors: number;
	totalInferenceTime: number;
}

/**
 * Simulates concurrent users interacting with the object detection system
 * to stress-test the application's performance and stability.
 */
export class ConcurrentUserSimulator {
	private config: SimulationConfig;
	private sessions: UserSession[] = [];
	private isRunning = false;
	private reportInterval: any;

	constructor(config: SimulationConfig) {
		this.config = {
			thinkTimeMs: 100,
			...config
		};
	}

	public async start(): Promise<void> {
		if (this.isRunning) {
			console.warn('Simulator is already running.');
			return;
		}

		console.log(`🚀 Starting concurrent user simulation with ${this.config.numUsers} users for ${this.config.durationSeconds}s.`);
		this.isRunning = true;
		this.sessions = [];

		// Initialize sessions for each virtual user
		for (let i = 0; i < this.config.numUsers; i++) {
			const detector = new ObjectDetector(this.config.modelConfig);
			try {
				await detector.initialize();
				this.sessions.push({
					id: i,
					detector,
					isProcessing: false,
					framesProcessed: 0,
					errors: 0,
					totalInferenceTime: 0
				});
			} catch (error) {
				console.error(`Failed to initialize detector for user ${i}:`, error);
			}
		}
        
        if(this.sessions.length === 0){
            console.error('No sessions were created. Stopping simulation.');
            this.isRunning = false;
            return;
        }

		// Start processing loop for each user
		this.sessions.forEach((session) => this.runUserLoop(session));

		// Set up reporting
		this.reportInterval = setInterval(() => this.generateReport(), 5000);

		// Stop simulation after the configured duration
		setTimeout(() => this.stop(), this.config.durationSeconds * 1000);
	}

	private async runUserLoop(session: UserSession): Promise<void> {
		while (this.isRunning) {
			if (!session.isProcessing) {
				session.isProcessing = true;
				try {
					const mockImage = getMockImageData(640, 640);
					const startTime = performance.now();
					await session.detector.detect(mockImage);
					const endTime = performance.now();

					session.framesProcessed++;
					session.totalInferenceTime += endTime - startTime;
				} catch (error) {
					session.errors++;
					console.error(`Error in user session ${session.id}:`, error);
				} finally {
					session.isProcessing = false;
				}
			}
			await new Promise(resolve => setTimeout(resolve, this.config.thinkTimeMs));
		}
	}

	public stop(): void {
		if (!this.isRunning) return;

		console.log('🛑 Stopping simulation...');
		this.isRunning = false;
		clearInterval(this.reportInterval);
		this.generateReport(); // Final report

		// Clean up resources
		this.sessions.forEach(session => session.detector.dispose());
		this.sessions = [];
	}

	private generateReport(): void {
		if (this.sessions.length === 0) return;

		const totalFrames = this.sessions.reduce((sum, s) => sum + s.framesProcessed, 0);
		const totalErrors = this.sessions.reduce((sum, s) => sum + s.errors, 0);
		const totalInferenceTime = this.sessions.reduce((sum, s) => sum + s.totalInferenceTime, 0);
		const avgInferenceTime = totalFrames > 0 ? totalInferenceTime / totalFrames : 0;

		console.log('--- Simulation Report ---');
		console.log(`Active Users: ${this.sessions.length}`);
		console.log(`Total Frames Processed: ${totalFrames}`);
		console.log(`Total Errors: ${totalErrors}`);
		console.log(`Average Inference Time: ${avgInferenceTime.toFixed(2)}ms`);
		console.log('-------------------------');
	}
} 