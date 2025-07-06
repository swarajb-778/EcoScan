/**
 * Real-Time Collaboration System
 * WebRTC-based multi-user waste scanning sessions with operational transformation
 */

export interface CollaborationSession {
  id: string;
  name: string;
  creator: string;
  participants: Map<string, Participant>;
  isActive: boolean;
  createdAt: number;
  lastActivity: number;
  settings: SessionSettings;
}

export interface Participant {
  id: string;
  name: string;
  role: 'host' | 'participant' | 'observer';
  isOnline: boolean;
  lastSeen: number;
  cursor?: { x: number; y: number };
  color: string;
  capabilities: ParticipantCapabilities;
}

export interface SessionSettings {
  maxParticipants: number;
  allowGuestParticipants: boolean;
  shareScreenAllowed: boolean;
  voiceChatEnabled: boolean;
  collaborativeScanning: boolean;
  realTimeSync: boolean;
  recordSession: boolean;
}

export interface ParticipantCapabilities {
  canScan: boolean;
  canAnnotate: boolean;
  canShare: boolean;
  canModerate: boolean;
  canRecord: boolean;
}

export interface Operation {
  id: string;
  type: 'scan' | 'annotation' | 'cursor' | 'selection' | 'camera' | 'voice';
  author: string;
  timestamp: number;
  data: any;
  acknowledged: boolean;
}

export interface ScanOperation {
  type: 'scan';
  imageData: string; // base64
  results: Array<{
    class: string;
    confidence: number;
    bbox?: { x: number; y: number; width: number; height: number };
  }>;
  location?: { x: number; y: number };
}

export interface AnnotationOperation {
  type: 'annotation';
  target: string; // scan ID
  annotation: {
    text: string;
    position: { x: number; y: number };
    color: string;
    author: string;
  };
}

export interface CollaborationEvent {
  type: 'participant-joined' | 'participant-left' | 'operation-applied' | 'session-ended' | 'error';
  data: any;
  timestamp: number;
}

class RealTimeCollaboration {
  private currentSession: CollaborationSession | null = null;
  private localParticipant: Participant | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private operations: Operation[] = [];
  private operationQueue: Operation[] = [];
  
  // WebRTC configuration
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };
  
  // Voice chat
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioAnalyzer: AnalyserNode | null = null;
  
  // Screen sharing
  private screenStream: MediaStream | null = null;
  private isSharing = false;
  
  // Operational Transformation
  private operationBuffer: Map<string, Operation[]> = new Map();
  private transformQueue: Operation[] = [];
  
  // Callbacks
  private onSessionUpdateCallback: ((session: CollaborationSession) => void) | null = null;
  private onParticipantUpdateCallback: ((participant: Participant) => void) | null = null;
  private onOperationCallback: ((operation: Operation) => void) | null = null;
  private onEventCallback: ((event: CollaborationEvent) => void) | null = null;

  constructor() {
    this.initializeCollaboration();
  }

  /**
   * Initialize collaboration system
   */
  private initializeCollaboration(): void {
    // Setup audio context for voice chat
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    console.log('[RealTimeCollaboration] Collaboration system initialized');
  }

  /**
   * Create a new collaboration session
   */
  async createSession(
    name: string,
    settings: Partial<SessionSettings> = {}
  ): Promise<CollaborationSession> {
    const sessionId = this.generateSessionId();
    const defaultSettings: SessionSettings = {
      maxParticipants: 10,
      allowGuestParticipants: true,
      shareScreenAllowed: true,
      voiceChatEnabled: true,
      collaborativeScanning: true,
      realTimeSync: true,
      recordSession: false
    };

    const session: CollaborationSession = {
      id: sessionId,
      name,
      creator: this.localParticipant?.id || 'anonymous',
      participants: new Map(),
      isActive: true,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      settings: { ...defaultSettings, ...settings }
    };

    // Create local participant as host
    this.localParticipant = {
      id: this.generateParticipantId(),
      name: 'Host',
      role: 'host',
      isOnline: true,
      lastSeen: Date.now(),
      color: this.generateParticipantColor(),
      capabilities: {
        canScan: true,
        canAnnotate: true,
        canShare: true,
        canModerate: true,
        canRecord: true
      }
    };

    session.participants.set(this.localParticipant.id, this.localParticipant);
    this.currentSession = session;

    // Initialize WebRTC for the session
    await this.initializeWebRTC();

    this.emitEvent({
      type: 'participant-joined',
      data: this.localParticipant,
      timestamp: Date.now()
    });

    console.log(`[RealTimeCollaboration] Session created: ${sessionId}`);
    return session;
  }

  /**
   * Join an existing session
   */
  async joinSession(sessionId: string, participantName: string): Promise<void> {
    // In a real implementation, this would connect to a signaling server
    // For demo purposes, we'll simulate joining
    
    this.localParticipant = {
      id: this.generateParticipantId(),
      name: participantName,
      role: 'participant',
      isOnline: true,
      lastSeen: Date.now(),
      color: this.generateParticipantColor(),
      capabilities: {
        canScan: true,
        canAnnotate: true,
        canShare: false,
        canModerate: false,
        canRecord: false
      }
    };

    // Simulate session data
    this.currentSession = {
      id: sessionId,
      name: 'Joined Session',
      creator: 'other-user',
      participants: new Map(),
      isActive: true,
      createdAt: Date.now() - 60000,
      lastActivity: Date.now(),
      settings: {
        maxParticipants: 10,
        allowGuestParticipants: true,
        shareScreenAllowed: true,
        voiceChatEnabled: true,
        collaborativeScanning: true,
        realTimeSync: true,
        recordSession: false
      }
    };

    this.currentSession.participants.set(this.localParticipant.id, this.localParticipant);

    await this.initializeWebRTC();

    this.emitEvent({
      type: 'participant-joined',
      data: this.localParticipant,
      timestamp: Date.now()
    });

    console.log(`[RealTimeCollaboration] Joined session: ${sessionId}`);
  }

  /**
   * Initialize WebRTC connections
   */
  private async initializeWebRTC(): Promise<void> {
    try {
      // Initialize media streams if voice chat is enabled
      if (this.currentSession?.settings.voiceChatEnabled) {
        await this.initializeVoiceChat();
      }

      // Setup peer connections for other participants
      // In a real implementation, this would be done through a signaling server
      console.log('[RealTimeCollaboration] WebRTC initialized');
    } catch (error) {
      console.error('[RealTimeCollaboration] Failed to initialize WebRTC:', error);
    }
  }

  /**
   * Initialize voice chat
   */
  private async initializeVoiceChat(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      // Setup audio analysis
      if (this.audioContext && this.localStream) {
        const source = this.audioContext.createMediaStreamSource(this.localStream);
        this.audioAnalyzer = this.audioContext.createAnalyser();
        this.audioAnalyzer.fftSize = 256;
        source.connect(this.audioAnalyzer);

        // Start voice activity detection
        this.startVoiceActivityDetection();
      }

      console.log('[RealTimeCollaboration] Voice chat initialized');
    } catch (error) {
      console.error('[RealTimeCollaboration] Failed to initialize voice chat:', error);
    }
  }

  /**
   * Start voice activity detection
   */
  private startVoiceActivityDetection(): void {
    if (!this.audioAnalyzer) return;

    const bufferLength = this.audioAnalyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVoiceActivity = () => {
      if (!this.audioAnalyzer) return;

      this.audioAnalyzer.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      // Detect speaking (threshold of 30 is arbitrary)
      const isSpeaking = average > 30;
      
      if (isSpeaking && this.localParticipant) {
        this.broadcastOperation({
          type: 'voice',
          author: this.localParticipant.id,
          data: { speaking: true, volume: average },
          timestamp: Date.now()
        });
      }

      requestAnimationFrame(checkVoiceActivity);
    };

    checkVoiceActivity();
  }

  /**
   * Create peer connection for a participant
   */
  private async createPeerConnection(participantId: string): Promise<RTCPeerConnection> {
    const peerConnection = new RTCPeerConnection(this.rtcConfig);
    
    // Add local stream if available
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Setup data channel for operations
    const dataChannel = peerConnection.createDataChannel('operations', {
      ordered: true
    });
    
    dataChannel.onopen = () => {
      console.log(`[RealTimeCollaboration] Data channel opened for ${participantId}`);
    };
    
    dataChannel.onmessage = (event) => {
      this.handleIncomingOperation(JSON.parse(event.data));
    };

    this.dataChannels.set(participantId, dataChannel);

    // Handle incoming streams
    peerConnection.ontrack = (event) => {
      console.log(`[RealTimeCollaboration] Received remote stream from ${participantId}`);
      // Handle remote audio/video streams
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to remote peer through signaling server
        this.sendSignalingMessage(participantId, {
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    this.peerConnections.set(participantId, peerConnection);
    return peerConnection;
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    if (!this.currentSession?.settings.shareScreenAllowed) {
      throw new Error('Screen sharing not allowed in this session');
    }

    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      this.isSharing = true;

      // Add screen share tracks to all peer connections
      this.peerConnections.forEach((peerConnection, participantId) => {
        this.screenStream!.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.screenStream!);
        });
      });

      // Handle screen share end
      this.screenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      this.broadcastOperation({
        type: 'camera',
        author: this.localParticipant!.id,
        data: { action: 'screen-share-started' },
        timestamp: Date.now()
      });

      console.log('[RealTimeCollaboration] Screen sharing started');
    } catch (error) {
      console.error('[RealTimeCollaboration] Failed to start screen sharing:', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    this.isSharing = false;

    this.broadcastOperation({
      type: 'camera',
      author: this.localParticipant!.id,
      data: { action: 'screen-share-stopped' },
      timestamp: Date.now()
    });

    console.log('[RealTimeCollaboration] Screen sharing stopped');
  }

  /**
   * Broadcast operation to all participants
   */
  private broadcastOperation(operationData: Omit<Operation, 'id' | 'acknowledged'>): void {
    const operation: Operation = {
      id: this.generateOperationId(),
      acknowledged: false,
      ...operationData
    };

    // Add to local operations
    this.operations.push(operation);
    
    // Apply operational transformation
    const transformedOperation = this.applyOperationalTransformation(operation);
    
    // Broadcast to all connected peers
    this.dataChannels.forEach((dataChannel, participantId) => {
      if (dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(transformedOperation));
      }
    });

    // Emit to local callbacks
    this.onOperationCallback?.(transformedOperation);
  }

  /**
   * Handle incoming operations from other participants
   */
  private handleIncomingOperation(operation: Operation): void {
    // Apply operational transformation
    const transformedOperation = this.applyOperationalTransformation(operation);
    
    // Add to operations list
    this.operations.push(transformedOperation);
    
    // Process the operation
    this.processOperation(transformedOperation);
    
    // Emit to callbacks
    this.onOperationCallback?.(transformedOperation);
  }

  /**
   * Apply operational transformation
   */
  private applyOperationalTransformation(operation: Operation): Operation {
    // Simplified operational transformation
    // In a real implementation, this would handle conflict resolution
    
    const conflictingOps = this.operations.filter(op => 
      op.timestamp > operation.timestamp - 1000 && // Within 1 second
      op.author !== operation.author &&
      this.operationsConflict(op, operation)
    );

    if (conflictingOps.length > 0) {
      // Apply transformation based on operation type
      return this.transformOperation(operation, conflictingOps);
    }

    return operation;
  }

  /**
   * Check if two operations conflict
   */
  private operationsConflict(op1: Operation, op2: Operation): boolean {
    // Define conflict rules based on operation types
    if (op1.type === 'scan' && op2.type === 'scan') {
      // Two scans at similar locations might conflict
      const loc1 = op1.data.location;
      const loc2 = op2.data.location;
      
      if (loc1 && loc2) {
        const distance = Math.sqrt(
          Math.pow(loc1.x - loc2.x, 2) + Math.pow(loc1.y - loc2.y, 2)
        );
        return distance < 50; // 50px threshold
      }
    }

    if (op1.type === 'annotation' && op2.type === 'annotation') {
      // Annotations on the same target might conflict
      return op1.data.target === op2.data.target;
    }

    return false;
  }

  /**
   * Transform operation to resolve conflicts
   */
  private transformOperation(operation: Operation, conflictingOps: Operation[]): Operation {
    let transformedOperation = { ...operation };

    conflictingOps.forEach(conflictOp => {
      if (operation.type === 'annotation' && conflictOp.type === 'annotation') {
        // Offset annotation position to avoid overlap
        transformedOperation.data.annotation.position.x += 20;
        transformedOperation.data.annotation.position.y += 20;
      }
      
      if (operation.type === 'scan' && conflictOp.type === 'scan') {
        // Adjust scan location
        if (transformedOperation.data.location) {
          transformedOperation.data.location.x += 30;
          transformedOperation.data.location.y += 30;
        }
      }
    });

    return transformedOperation;
  }

  /**
   * Process an operation
   */
  private processOperation(operation: Operation): void {
    if (!this.currentSession) return;

    switch (operation.type) {
      case 'scan':
        this.processScanOperation(operation);
        break;
      case 'annotation':
        this.processAnnotationOperation(operation);
        break;
      case 'cursor':
        this.processCursorOperation(operation);
        break;
      case 'voice':
        this.processVoiceOperation(operation);
        break;
      case 'camera':
        this.processCameraOperation(operation);
        break;
    }

    // Update session activity
    this.currentSession.lastActivity = Date.now();
  }

  /**
   * Process scan operation
   */
  private processScanOperation(operation: Operation): void {
    const scanData = operation.data as ScanOperation;
    
    // Emit scan result to UI
    this.emitEvent({
      type: 'operation-applied',
      data: {
        type: 'scan',
        author: operation.author,
        results: scanData.results,
        location: scanData.location
      },
      timestamp: operation.timestamp
    });
  }

  /**
   * Process annotation operation
   */
  private processAnnotationOperation(operation: Operation): void {
    const annotationData = operation.data as AnnotationOperation;
    
    // Emit annotation to UI
    this.emitEvent({
      type: 'operation-applied',
      data: {
        type: 'annotation',
        annotation: annotationData.annotation,
        target: annotationData.target
      },
      timestamp: operation.timestamp
    });
  }

  /**
   * Process cursor operation
   */
  private processCursorOperation(operation: Operation): void {
    const participant = this.currentSession?.participants.get(operation.author);
    if (participant) {
      participant.cursor = operation.data.cursor;
      this.onParticipantUpdateCallback?.(participant);
    }
  }

  /**
   * Process voice operation
   */
  private processVoiceOperation(operation: Operation): void {
    // Update participant speaking status
    const participant = this.currentSession?.participants.get(operation.author);
    if (participant) {
      // Visual indicator for speaking participant
      this.emitEvent({
        type: 'operation-applied',
        data: {
          type: 'voice',
          participantId: operation.author,
          speaking: operation.data.speaking,
          volume: operation.data.volume
        },
        timestamp: operation.timestamp
      });
    }
  }

  /**
   * Process camera operation
   */
  private processCameraOperation(operation: Operation): void {
    this.emitEvent({
      type: 'operation-applied',
      data: {
        type: 'camera',
        action: operation.data.action,
        participantId: operation.author
      },
      timestamp: operation.timestamp
    });
  }

  /**
   * Share scan result with session
   */
  shareScanResult(
    imageData: string,
    results: Array<{ class: string; confidence: number; bbox?: any }>,
    location?: { x: number; y: number }
  ): void {
    if (!this.localParticipant?.capabilities.canScan) {
      throw new Error('Participant cannot perform scans');
    }

    this.broadcastOperation({
      type: 'scan',
      author: this.localParticipant.id,
      data: {
        type: 'scan',
        imageData,
        results,
        location
      } as ScanOperation,
      timestamp: Date.now()
    });
  }

  /**
   * Add annotation to scan
   */
  addAnnotation(
    targetScanId: string,
    text: string,
    position: { x: number; y: number }
  ): void {
    if (!this.localParticipant?.capabilities.canAnnotate) {
      throw new Error('Participant cannot add annotations');
    }

    this.broadcastOperation({
      type: 'annotation',
      author: this.localParticipant.id,
      data: {
        type: 'annotation',
        target: targetScanId,
        annotation: {
          text,
          position,
          color: this.localParticipant.color,
          author: this.localParticipant.name
        }
      } as AnnotationOperation,
      timestamp: Date.now()
    });
  }

  /**
   * Update cursor position
   */
  updateCursor(x: number, y: number): void {
    if (!this.localParticipant) return;

    this.localParticipant.cursor = { x, y };

    // Throttle cursor updates
    this.throttledCursorUpdate(x, y);
  }

  /**
   * Throttled cursor update
   */
  private throttledCursorUpdate = this.throttle((x: number, y: number) => {
    this.broadcastOperation({
      type: 'cursor',
      author: this.localParticipant!.id,
      data: { cursor: { x, y } },
      timestamp: Date.now()
    });
  }, 100);

  /**
   * Leave session
   */
  leaveSession(): void {
    if (!this.currentSession || !this.localParticipant) return;

    // Clean up WebRTC connections
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    
    this.dataChannels.forEach((dc) => dc.close());
    this.dataChannels.clear();

    // Stop media streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    // Emit leave event
    this.emitEvent({
      type: 'participant-left',
      data: this.localParticipant,
      timestamp: Date.now()
    });

    // Clear session data
    this.currentSession = null;
    this.localParticipant = null;
    this.operations = [];

    console.log('[RealTimeCollaboration] Left session');
  }

  /**
   * Send signaling message (placeholder for real signaling server)
   */
  private sendSignalingMessage(participantId: string, message: any): void {
    // In a real implementation, this would send to a signaling server
    console.log(`[RealTimeCollaboration] Signaling message to ${participantId}:`, message);
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate participant ID
   */
  private generateParticipantId(): string {
    return 'participant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate operation ID
   */
  private generateOperationId(): string {
    return 'op_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate participant color
   */
  private generateParticipantColor(): string {
    const colors = [
      '#FF6B35', '#004E7F', '#2E8B57', '#FF4500', '#9932CC',
      '#FF1493', '#00CED1', '#FFD700', '#FF69B4', '#32CD32'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Throttle function
   */
  private throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecTime = 0;
    
    return (...args: Parameters<T>) => {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func(...args);
        lastExecTime = currentTime;
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func(...args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  /**
   * Emit event to callbacks
   */
  private emitEvent(event: CollaborationEvent): void {
    this.onEventCallback?.(event);
  }

  /**
   * Set callbacks
   */
  setCallbacks(
    onSessionUpdate: (session: CollaborationSession) => void,
    onParticipantUpdate: (participant: Participant) => void,
    onOperation: (operation: Operation) => void,
    onEvent: (event: CollaborationEvent) => void
  ): void {
    this.onSessionUpdateCallback = onSessionUpdate;
    this.onParticipantUpdateCallback = onParticipantUpdate;
    this.onOperationCallback = onOperation;
    this.onEventCallback = onEvent;
  }

  /**
   * Get current session
   */
  getCurrentSession(): CollaborationSession | null {
    return this.currentSession;
  }

  /**
   * Get local participant
   */
  getLocalParticipant(): Participant | null {
    return this.localParticipant;
  }

  /**
   * Get operations history
   */
  getOperations(): Operation[] {
    return [...this.operations];
  }

  /**
   * Check if screen sharing is active
   */
  isScreenSharing(): boolean {
    return this.isSharing;
  }
}

export const realTimeCollaboration = new RealTimeCollaboration();
export default RealTimeCollaboration; 