import type { Experiment } from '$lib/utils/ab-testing';

export const modelExperiment: Experiment = {
	id: 'yolo-model-variant-2023-q4',
	name: 'YOLOv8n vs. YOLOv8s Model Performance',
	description: 'Compare the performance and accuracy of a smaller (v8n) vs. a slightly larger (v8s) model.',
	trafficAllocation: 0.5, // 50% of users will participate
	variants: {
		control: {
			modelPath: '/models/yolov8n.onnx',
			modelName: 'YOLOv8n (Standard)',
		},
		A: {
			modelPath: '/models/yolov8n.onnx',
			modelName: 'YOLOv8n (Standard)',
		},
		B: {
			modelPath: '/models/yolov8s.onnx', // Assuming a yolov8s model exists for testing
			modelName: 'YOLOv8s (Experimental)',
		}
	}
}; 