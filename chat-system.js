// Chat System for Eskom Solar Shooter
// Implements both text chat and voice chat functionality

class ChatSystem {
    constructor() {
        this.isVoiceChatActive = false;
        this.isMuted = false;
        this.currentVoiceStream = null;
        this.audioContext = null;
        this.mediaRecorder = null;
        this.voiceAnalyser = null;
        
        // Create chat UI
        this.createChatUI();
        
        // Initialize event listeners
        this.initEventListeners();
        
        console.log('Chat system initialized');
    }
    
    // Create the chat UI elements
    createChatUI() {
        // Create main chat container
        const chatContainer = document.createElement('div');
        chatContainer.id = 'chat-container';
        chatContainer.style.position = 'absolute';
        chatContainer.style.bottom = '20px';
        chatContainer.style.left = '20px';
        chatContainer.style.width = '300px';
        chatContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        chatContainer.style.borderRadius = '8px';
        chatContainer.style.border = '2px solid rgba(0, 204, 255, 0.8)';
        chatContainer.style.boxShadow = '0 0 15px rgba(0, 204, 255, 0.5)';
        chatContainer.style.zIndex = '1000';
        chatContainer.style.display = 'none'; // Hidden by default
        chatContainer.style.transition = 'all 0.3s ease';
        chatContainer.style.overflow = 'hidden';
        
        // Chat header
        const chatHeader = document.createElement('div');
        chatHeader.style.padding = '8px 12px';
        chatHeader.style.backgroundColor = 'rgba(0, 204, 255, 0.3)';
        chatHeader.style.borderBottom = '1px solid rgba(0, 204, 255, 0.8)';
        chatHeader.style.display = 'flex';
        chatHeader.style.justifyContent = 'space-between';
        chatHeader.style.alignItems = 'center';
        
        const chatTitle = document.createElement('div');
        chatTitle.textContent = 'Game Chat';
        chatTitle.style.color = 'white';
        chatTitle.style.fontWeight = 'bold';
        chatTitle.style.fontFamily = 'Arial, sans-serif';
        
        const chatControls = document.createElement('div');
        chatControls.style.display = 'flex';
        chatControls.style.gap = '8px';
        
        // Voice chat toggle button
        const voiceChatButton = document.createElement('button');
        voiceChatButton.id = 'voice-chat-toggle';
        voiceChatButton.innerHTML = '🎤';
        voiceChatButton.title = 'Toggle Voice Chat';
        voiceChatButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        voiceChatButton.style.color = 'white';
        voiceChatButton.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        voiceChatButton.style.borderRadius = '4px';
        voiceChatButton.style.width = '30px';
        voiceChatButton.style.height = '30px';
        voiceChatButton.style.cursor = 'pointer';
        voiceChatButton.style.display = 'flex';
        voiceChatButton.style.alignItems = 'center';
        voiceChatButton.style.justifyContent = 'center';
        voiceChatButton.style.fontSize = '16px';
        
        // Mute button
        const muteButton = document.createElement('button');
        muteButton.id = 'mute-toggle';
        muteButton.innerHTML = '🔊';
        muteButton.title = 'Toggle Mute';
        muteButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        muteButton.style.color = 'white';
        muteButton.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        muteButton.style.borderRadius = '4px';
        muteButton.style.width = '30px';
        muteButton.style.height = '30px';
        muteButton.style.cursor = 'pointer';
        muteButton.style.display = 'flex';
        muteButton.style.alignItems = 'center';
        muteButton.style.justifyContent = 'center';
        muteButton.style.fontSize = '16px';
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.id = 'chat-close';
        closeButton.innerHTML = '✕';
        closeButton.title = 'Close Chat';
        closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        closeButton.style.color = 'white';
        closeButton.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        closeButton.style.borderRadius = '4px';
        closeButton.style.width = '30px';
        closeButton.style.height = '30px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.display = 'flex';
        closeButton.style.alignItems = 'center';
        closeButton.style.justifyContent = 'center';
        closeButton.style.fontSize = '16px';
        
        chatControls.appendChild(voiceChatButton);
        chatControls.appendChild(muteButton);
        chatControls.appendChild(closeButton);
        
        chatHeader.appendChild(chatTitle);
        chatHeader.appendChild(chatControls);
        
        // Chat messages area
        const chatMessages = document.createElement('div');
        chatMessages.id = 'chat-messages';
        chatMessages.style.height = '200px';
        chatMessages.style.overflowY = 'auto';
        chatMessages.style.padding = '10px';
        chatMessages.style.color = 'white';
        chatMessages.style.fontFamily = 'Arial, sans-serif';
        chatMessages.style.fontSize = '14px';
        
        // Voice chat visualization
        const voiceVisualization = document.createElement('div');
        voiceVisualization.id = 'voice-visualization';
        voiceVisualization.style.height = '40px';
        voiceVisualization.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        voiceVisualization.style.margin = '0 10px';
        voiceVisualization.style.borderRadius = '4px';
        voiceVisualization.style.display = 'none'; // Hidden by default
        
        const voiceCanvas = document.createElement('canvas');
        voiceCanvas.id = 'voice-canvas';
        voiceCanvas.style.width = '100%';
        voiceCanvas.style.height = '100%';
        
        voiceVisualization.appendChild(voiceCanvas);
        
        // Chat input area
        const chatInputArea = document.createElement('div');
        chatInputArea.style.display = 'flex';
        chatInputArea.style.padding = '10px';
        chatInputArea.style.borderTop = '1px solid rgba(0, 204, 255, 0.8)';
        
        const chatInput = document.createElement('input');
        chatInput.id = 'chat-input';
        chatInput.type = 'text';
        chatInput.placeholder = 'Type a message...';
        chatInput.style.flex = '1';
        chatInput.style.padding = '8px 12px';
        chatInput.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        chatInput.style.color = 'white';
        chatInput.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        chatInput.style.borderRadius = '4px';
        chatInput.style.outline = 'none';
        
        const sendButton = document.createElement('button');
        sendButton.id = 'chat-send';
        sendButton.innerHTML = '➤';
        sendButton.style.marginLeft = '8px';
        sendButton.style.padding = '8px 12px';
        sendButton.style.backgroundColor = 'rgba(0, 204, 255, 0.5)';
        sendButton.style.color = 'white';
        sendButton.style.border = 'none';
        sendButton.style.borderRadius = '4px';
        sendButton.style.cursor = 'pointer';
        
        chatInputArea.appendChild(chatInput);
        chatInputArea.appendChild(sendButton);
        
        // Assemble the chat container
        chatContainer.appendChild(chatHeader);
        chatContainer.appendChild(chatMessages);
        chatContainer.appendChild(voiceVisualization);
        chatContainer.appendChild(chatInputArea);
        
        // Chat toggle button (always visible)
        const chatToggle = document.createElement('button');
        chatToggle.id = 'chat-toggle';
        chatToggle.innerHTML = '💬';
        chatToggle.title = 'Toggle Chat';
        chatToggle.style.position = 'absolute';
        chatToggle.style.bottom = '20px';
        chatToggle.style.left = '20px';
        chatToggle.style.width = '40px';
        chatToggle.style.height = '40px';
        chatToggle.style.backgroundColor = 'rgba(0, 204, 255, 0.7)';
        chatToggle.style.color = 'white';
        chatToggle.style.border = 'none';
        chatToggle.style.borderRadius = '50%';
        chatToggle.style.cursor = 'pointer';
        chatToggle.style.zIndex = '999';
        chatToggle.style.fontSize = '20px';
        chatToggle.style.display = 'flex';
        chatToggle.style.alignItems = 'center';
        chatToggle.style.justifyContent = 'center';
        chatToggle.style.boxShadow = '0 0 10px rgba(0, 204, 255, 0.5)';
        
        // Voice activity indicator (visible when voice chat is active)
        const voiceIndicator = document.createElement('div');
        voiceIndicator.id = 'voice-indicator';
        voiceIndicator.style.position = 'absolute';
        voiceIndicator.style.bottom = '70px';
        voiceIndicator.style.left = '20px';
        voiceIndicator.style.width = '40px';
        voiceIndicator.style.height = '40px';
        voiceIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        voiceIndicator.style.color = 'white';
        voiceIndicator.style.border = 'none';
        voiceIndicator.style.borderRadius = '50%';
        voiceIndicator.style.zIndex = '999';
        voiceIndicator.style.fontSize = '20px';
        voiceIndicator.style.display = 'none'; // Hidden by default
        voiceIndicator.style.alignItems = 'center';
        voiceIndicator.style.justifyContent = 'center';
        voiceIndicator.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
        voiceIndicator.innerHTML = '🎤';
        
        // Add to the document
        document.body.appendChild(chatContainer);
        document.body.appendChild(chatToggle);
        document.body.appendChild(voiceIndicator);
        
        // Store references
        this.chatContainer = chatContainer;
        this.chatMessages = chatMessages;
        this.chatInput = chatInput;
        this.sendButton = sendButton;
        this.chatToggle = chatToggle;
        this.voiceChatButton = voiceChatButton;
        this.muteButton = muteButton;
        this.closeButton = closeButton;
        this.voiceVisualization = voiceVisualization;
        this.voiceCanvas = voiceCanvas;
        this.voiceIndicator = voiceIndicator;
    }
    
    // Initialize event listeners
    initEventListeners() {
        // Toggle chat visibility
        this.chatToggle.addEventListener('click', () => {
            this.toggleChat();
        });
        
        // Close chat
        this.closeButton.addEventListener('click', () => {
            this.chatContainer.style.display = 'none';
        });
        
        // Send message on button click
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Send message on Enter key
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Toggle voice chat
        this.voiceChatButton.addEventListener('click', () => {
            this.toggleVoiceChat();
        });
        
        // Toggle mute
        this.muteButton.addEventListener('click', () => {
            this.toggleMute();
        });
        
        // Press-to-talk with V key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'v' && this.isVoiceChatActive && !this.isMuted) {
                this.startVoiceTransmission();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'v' && this.isVoiceChatActive) {
                this.stopVoiceTransmission();
            }
        });
    }
    
    // Toggle chat visibility
    toggleChat() {
        if (this.chatContainer.style.display === 'none') {
            this.chatContainer.style.display = 'block';
            // Scroll to bottom of chat
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        } else {
            this.chatContainer.style.display = 'none';
        }
    }
    
    // Send a text message
    sendMessage() {
        const message = this.chatInput.value.trim();
        if (message) {
            this.addChatMessage('You', message);
            this.chatInput.value = '';
            
            // In a real game, you would send this message to other players
            // For demo purposes, we'll simulate a response
            setTimeout(() => {
                this.addChatMessage('Bot Player', 'Roger that!');
            }, 1000);
        }
    }
    
    // Add a message to the chat
    addChatMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.style.marginBottom = '8px';
        
        const senderSpan = document.createElement('span');
        senderSpan.textContent = sender + ': ';
        senderSpan.style.fontWeight = 'bold';
        senderSpan.style.color = sender === 'You' ? '#00ccff' : '#ffcc00';
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        
        messageElement.appendChild(senderSpan);
        messageElement.appendChild(messageSpan);
        
        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    // Toggle voice chat
    toggleVoiceChat() {
        if (this.isVoiceChatActive) {
            this.deactivateVoiceChat();
        } else {
            this.activateVoiceChat();
        }
    }
    
    // Activate voice chat
    activateVoiceChat() {
        // Check if browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.addChatMessage('System', 'Voice chat is not supported in your browser.');
            return;
        }
        
        // Request microphone access
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                this.isVoiceChatActive = true;
                this.voiceChatButton.style.backgroundColor = 'rgba(0, 204, 255, 0.7)';
                this.voiceChatButton.innerHTML = '🎤';
                this.voiceVisualization.style.display = 'block';
                
                // Store the stream
                this.currentVoiceStream = stream;
                
                // Set up audio context for visualization
                this.setupAudioVisualization(stream);
                
                this.addChatMessage('System', 'Voice chat activated. Press and hold V to talk.');
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                this.addChatMessage('System', 'Could not access microphone. Check permissions.');
            });
    }
    
    // Deactivate voice chat
    deactivateVoiceChat() {
        this.isVoiceChatActive = false;
        this.voiceChatButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.voiceChatButton.innerHTML = '🎤';
        this.voiceVisualization.style.display = 'none';
        this.voiceIndicator.style.display = 'none';
        
        // Stop any ongoing transmission
        this.stopVoiceTransmission();
        
        // Close streams
        if (this.currentVoiceStream) {
            this.currentVoiceStream.getTracks().forEach(track => track.stop());
            this.currentVoiceStream = null;
        }
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
            this.voiceAnalyser = null;
        }
        
        this.addChatMessage('System', 'Voice chat deactivated.');
    }
    
    // Toggle mute
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.muteButton.innerHTML = '🔇';
            this.muteButton.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
            this.addChatMessage('System', 'Microphone muted.');
        } else {
            this.muteButton.innerHTML = '🔊';
            this.muteButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            this.addChatMessage('System', 'Microphone unmuted.');
        }
    }
    
    // Start voice transmission
    startVoiceTransmission() {
        if (!this.isVoiceChatActive || this.isMuted || !this.currentVoiceStream) return;
        
        this.voiceIndicator.style.display = 'flex';
        
        // In a real game, you would send the audio data to other players
        // For demo purposes, we'll just show the voice indicator
        
        // Start recording for visualization
        if (!this.mediaRecorder && this.currentVoiceStream) {
            this.mediaRecorder = new MediaRecorder(this.currentVoiceStream);
            this.mediaRecorder.start();
            
            // Pulse animation for voice indicator
            this.voiceIndicator.style.animation = 'pulse 0.5s infinite alternate';
        }
    }
    
    // Stop voice transmission
    stopVoiceTransmission() {
        this.voiceIndicator.style.display = 'none';
        this.voiceIndicator.style.animation = '';
        
        // Stop recording
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            this.mediaRecorder = null;
        }
    }
    
    // Set up audio visualization
    setupAudioVisualization(stream) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const source = this.audioContext.createMediaStreamSource(stream);
        this.voiceAnalyser = this.audioContext.createAnalyser();
        this.voiceAnalyser.fftSize = 256;
        source.connect(this.voiceAnalyser);
        
        // Set up canvas
        const canvas = this.voiceCanvas;
        const canvasCtx = canvas.getContext('2d');
        const bufferLength = this.voiceAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        // Draw visualization
        const draw = () => {
            if (!this.voiceAnalyser) return;
            
            requestAnimationFrame(draw);
            
            this.voiceAnalyser.getByteFrequencyData(dataArray);
            
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                
                canvasCtx.fillStyle = `rgb(${barHeight + 100}, 204, 255)`;
                canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
                
                x += barWidth + 1;
            }
        };
        
        draw();
    }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
@keyframes pulse {
    0% { transform: scale(1); }
    100% { transform: scale(1.1); }
}
`;
document.head.appendChild(style);

// Initialize the chat system when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a short time to ensure the game has initialized
    setTimeout(() => {
        window.chatSystem = new ChatSystem();
    }, 1000);
});
