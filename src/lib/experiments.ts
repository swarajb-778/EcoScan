import type { Experiment } from '$lib/utils/ab-testing';

export const modelExperiment: Experiment = {
	id: 'model-variant-test',
	name: 'YOLOv8 Model Variant Test',
	description: 'Test performance and accuracy of different YOLOv8 model sizes',
	trafficAllocation: 0.5, // 50% of users will participate
	variants: [
		{
			id: 'control',
			name: 'YOLOv8n (Nano)',
			weight: 50,
			config: {
				modelPath: '/models/yolov8n.onnx',
				modelName: 'YOLOv8n'
			}
		},
		{
			id: 'variant-a',
			name: 'YOLOv8s (Small)',
			weight: 50,
			config: {
				modelPath: '/models/yolov8n.onnx', // Using yolov8n as 's' is not available
				modelName: 'YOLOv8s (simulated)'
			}
		}
	]
}; 