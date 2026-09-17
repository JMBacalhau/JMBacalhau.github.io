// State variables for audio guide and chat
let isAudioEnabled = false;
let currentActiveSection = '';
let isChatOpen = false;
let chatHistory = [];

// Controls whether the AI reads its answers out loud
let isChatAudioEnabled = false;

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

// Dictionary containing the audio summaries for each section in Portuguese
const sectionExplanations = {
    'sec-abstract': "Resumo: Este artigo analisa a criação de corredores que acomodam várias infraestruturas ao mesmo tempo, como rodovias e linhas de energia. Os autores propõem dois novos métodos para calcular a melhor rota considerando a largura real e a disposição de cada modalidade.",
    'sec-intro': "Introdução: Aqui, os pesquisadores explicam que planejar um corredor multimodal é complexo porque ele precisa ser largo o suficiente e atender às restrições ambientais e físicas de diferentes modos de transporte simultaneamente.",
    'sec-related': "Trabalhos Relacionados e Lacunas: Nesta parte, o artigo revisa a literatura existente, apontando que a maioria dos métodos atuais ignora a largura do corredor ou falha em considerar as necessidades específicas de múltiplas modalidades.",
    'sec-methodology': "Metodologia: Os autores propõem duas abordagens. A primeira agrega os custos de todos os modos em um único mapa e calcula a rota. Vamos ver os detalhes a seguir.",
    'sec-fwla': "Encontrando o caminho de menor custo: Esta subseção explica os desafios do primeiro método. Ao tentar acomodar tudo em um único mapa de custos, o algoritmo pode criar restrições desnecessárias, já que não leva em conta a ordem e a largura de cada modo dentro do corredor."
};

// Configuration matching your Continue setup
const API_BASE = "https://precook-grew-starting.ngrok-free.dev/v1";
const API_KEY = "lm-studio";
const MODEL_NAME = "qwen/qwen3.5-9b"; 

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
        bubble.innerText = "Guia ativado! Role a página lentamente para ouvir a explicação de cada parte.";
        speakText("Guia de áudio ativado. Role a página para que eu explique o conteúdo para você.");
    } else {
        avatar.classList.remove('active');
        bubble.innerText = "Guia de áudio desativado. Clique em mim para reativar.";
        window.speechSynthesis.cancel();
        currentActiveSection = ''; 
    }
}

// Core function to synthesize speech
function speakText(text) {
    // A trava do isAudioEnabled foi removida desta linha
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    // Dica: você pode mudar para 'en-US' se o modelo responder primariamente em inglês
    utterance.lang = 'en-US';
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
    loadingDiv.textContent = 'Qwen is typing...';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch(`${API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                model: MODEL_NAME,
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

        // ADD THIS: Read the response if the speaker is toggled on
        if (isChatAudioEnabled) {
            speakText(aiResponse);
        }

    } catch (error) {
        console.error("Error communicating with local LLM:", error);
        document.getElementById('loadingIndicator').remove();
        appendMessage('assistant', 'Sorry, I encountered an error connecting to the local model. Make sure LM Studio is running and the ngrok tunnel is active.');
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
                    document.getElementById('speechBubble').innerText = "Explicando agora: " + sectionTitle;
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
            content: `You are a helpful AI assistant integrated into a web page. The user is reading a scientific article. Here is the full text of the article available on the page:\n\n${articleContext}\n\nAnswer the user's questions accurately based ONLY on this text. If the answer is not in the text, say you don't know.` 
        }
    ];

    const sections = document.querySelectorAll('.article-section');
    sections.forEach(section => observer.observe(section));
});


