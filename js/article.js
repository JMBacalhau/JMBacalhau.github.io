// State variables for audio guide and chat
let isAudioEnabled = false;
let currentActiveSection = '';
let isChatOpen = false;
let chatHistory = [];

// Configuration (Consider moving sensitive values to a secure backend or environment variables)
const API_CONFIG = {
    BASE_URL: "https://precook-grew-starting.ngrok-free.dev/v1",
    KEY: "lm-studio",
    MODEL: "qwen/qwen3-4b-2507"
};

// Controls whether the AI reads its answers out loud
let isChatAudioEnabled = false;

// Speech recognition setup
let recognition;
let isListening = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // Match the article language

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('chatInput');
        input.value = transcript;
        stopListening();
        sendMessage();
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopListening();
    };

    recognition.onend = () => {
        stopListening();
    };
}

function toggleSpeechRecognition() {
    if (!recognition) {
        alert("Speech Recognition is not supported in this browser.");
        return;
    }

    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

function startListening() {
    isListening = true;
    recognition.start();
    const micBtn = document.getElementById('micBtn');
    micBtn.textContent = '🛑';
    micBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
    micBtn.style.borderColor = 'red';
}

function stopListening() {
    isListening = false;
    if (recognition) recognition.stop();
    const micBtn = document.getElementById('micBtn');
    micBtn.textContent = '🎤';
    micBtn.style.backgroundColor = 'transparent';
    micBtn.style.borderColor = 'rgba(255, 215, 0, 0.3)';
}

function toggleChatAudio() {
    isChatAudioEnabled = !isChatAudioEnabled;
    const audioBtn = document.getElementById('chatAudioBtn');
    
    if (isChatAudioEnabled) {
        audioBtn.textContent = '🔊';
        audioBtn.title = 'Mute AI Responses';
    } else {
        audioBtn.textContent = '🔇';
        audioBtn.title = 'Read AI Responses Aloud';
        window.speechSynthesis.cancel(); // Stops current speech if muted
    }
}

// Dictionary containing the audio summaries for each section in English
const sectionExplanations = {
    'sec-abstract': "Abstract: This article analyzes the creation of corridors that accommodate multiple infrastructures at the same time, such as highways and power lines. The authors propose two new methods to calculate the best route considering the real width and arrangement of each mode.",
    'sec-intro': "Introduction: Here, the researchers explain that planning a multi-modal corridor is complex because it must be wide enough and meet the environmental and physical constraints of different transportation modes simultaneously.",
    'sec-related': "Related Work and Gaps: In this part, the article reviews existing literature, pointing out that most current methods ignore corridor width or fail to consider the specific needs of multiple modes.",
    'sec-methodology': "Methodology: The authors propose two approaches. The first aggregates costs of all modes into a single map and calculates the route. We'll see the details next.",
    'sec-fwla': "Finding the Least Cost Path: This subsection explains the challenges of the first method. By trying to accommodate everything in a single cost map, the algorithm may create unnecessary constraints, as it does not account for the order and width of each mode within the corridor."
};

// Function to scrape the article text from the HTML
function getArticleContext() {
    const headerElement = document.querySelector('header');
    const headerText = headerElement ? headerElement.innerText : '';
    
    const contentElement = document.getElementById('content-wrapper');
    const bodyText = contentElement ? contentElement.innerText : '';
    
    return `Title and Authors:\n${headerText}\n\nArticle Content:\n${bodyText}`;
}

// Function to toggle the audio guide on and off
function toggleAudioGuide() {
    const avatar = document.getElementById('avatarEmoji');
    const bubble = document.getElementById('speechBubble');
    
    isAudioEnabled = !isAudioEnabled;

    if (isAudioEnabled) {
        avatar.classList.add('active');
        bubble.innerText = "Guide activated! Scroll down slowly to hear the explanation for each part.";
        speakText("Audio guide activated. Scroll the page so I can explain the content to you.");
    } else {
        avatar.classList.remove('active');
        bubble.innerText = "Audio guide deactivated. Click me to reactivate.";
        window.speechSynthesis.cancel();
        currentActiveSection = ''; 
    }
}

// Core function to synthesize speech
function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Changed to English
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
}

// Toggles the visibility of the chat UI and hides the speech bubble
function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    const speechBubble = document.getElementById('speechBubble');
    
    isChatOpen = !isChatOpen;
    
    if (isChatOpen) {
        chatWindow.classList.add('active');
        document.getElementById('chatInput').focus();
        
        if (speechBubble) {
            speechBubble.style.opacity = '0';
            speechBubble.style.visibility = 'hidden';
        }
    } else {
        chatWindow.classList.remove('active');
        
        if (speechBubble) {
            speechBubble.style.opacity = '1';
            speechBubble.style.visibility = 'visible';
        }
    }
}

// Submits the message when the Enter key is pressed
function handleChatEnter(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Appends a new message bubble to the chat window
function appendMessage(role, text) {
    const chatMessages = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(role === 'user' ? 'user-message' : 'ai-message');
    msgDiv.textContent = text;
    
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Sends the user message to the ngrok API endpoint
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    appendMessage('user', text);
    input.value = '';
    
    chatHistory.push({ role: "user", content: text });

    const chatMessages = document.getElementById('chatMessages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-indicator';
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.style.display = 'block'; // Ensure it's visible
    loadingDiv.textContent = 'Assistant is typing...';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.KEY}`,
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                model: API_CONFIG.MODEL,
                messages: chatHistory,
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;

        document.getElementById('loadingIndicator').remove();

        appendMessage('assistant', aiResponse);
        chatHistory.push({ role: "assistant", content: aiResponse });

        if (isChatAudioEnabled) {
            speakText(aiResponse);
        }

    } catch (error) {
        console.error("Error communicating with local LLM:", error);
        const indicator = document.getElementById('loadingIndicator');
        if (indicator) indicator.remove();
        appendMessage('assistant', 'Sorry, I encountered an error connecting to the model. Please check if the server is active.');
    }
}

// Intersection Observer configuration for the audio guide
const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
};

const observerCallback = (entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            
            if (currentActiveSection !== sectionId) {
                currentActiveSection = sectionId;
                
                if (isAudioEnabled && sectionExplanations[sectionId]) {
                    const sectionTitle = entry.target.querySelector('h3').innerText;
                    document.getElementById('speechBubble').innerText = "Explaining now: " + sectionTitle;
                    speakText(sectionExplanations[sectionId]);
                }
            }
        }
    });
};

const observer = new IntersectionObserver(observerCallback, observerOptions);

// Initialize observers and system context when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const articleContext = getArticleContext();
    
    chatHistory = [
        { 
            role: "system", 
            content: `You are a helpful AI assistant integrated into a web page. The user is reading a scientific article. Here is the full text of the article available on the page:\n\n${articleContext}\n\nAnswer the user's questions accurately based ONLY on this text. All responses must be in English. If the answer is not in the text, say you don't know.` 
        }
    ];

    const sections = document.querySelectorAll('.article-section');
    sections.forEach(section => observer.observe(section));
});


