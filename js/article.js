// State variables
let isAudioEnabled = false;
let currentActiveSection = '';

// Dictionary containing the audio summaries for each section in Portuguese
const sectionExplanations = {
    'sec-abstract': "Resumo: Este artigo analisa a criação de corredores que acomodam várias infraestruturas ao mesmo tempo, como rodovias e linhas de energia. Os autores propõem dois novos métodos para calcular a melhor rota considerando a largura real e a disposição de cada modalidade.",
    'sec-intro': "Introdução: Aqui, os pesquisadores explicam que planejar um corredor multimodal é complexo porque ele precisa ser largo o suficiente e atender às restrições ambientais e físicas de diferentes modos de transporte simultaneamente.",
    'sec-related': "Trabalhos Relacionados e Lacunas: Nesta parte, o artigo revisa a literatura existente, apontando que a maioria dos métodos atuais ignora a largura do corredor ou falha em considerar as necessidades específicas de múltiplas modalidades.",
    'sec-methodology': "Metodologia: Os autores propõem duas abordagens. A primeira agrega os custos de todos os modos em um único mapa e calcula a rota. Vamos ver os detalhes a seguir.",
    'sec-fwla': "Encontrando o caminho de menor custo: Esta subseção explica os desafios do primeiro método. Ao tentar acomodar tudo em um único mapa de custos, o algoritmo pode criar restrições desnecessárias, já que não leva em conta a ordem e a largura de cada modo dentro do corredor."
};

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
        currentActiveSection = ''; // Reset section to allow replay if enabled again
    }
}

// Core function to synthesize speech
function speakText(text) {
    if (!isAudioEnabled || !('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech before starting a new one
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
}

// Intersection Observer configuration
const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -60% 0px', // Triggers when the section is near the top of the viewport
    threshold: 0
};

// Callback function executed when a section enters the viewport
const observerCallback = (entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            
            // If the section changed and audio is enabled, read the new summary
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

// Initialize the Intersection Observer
const observer = new IntersectionObserver(observerCallback, observerOptions);

// Attach the observer to all elements with the class 'article-section'
document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('.article-section');
    sections.forEach(section => observer.observe(section));
});