import { canvas, ctx } from '../core/canvas.js';
import { ASSETS, IMAGES } from '../core/assets.js';
import { keys, controlMode, CONTROLSMODES } from '../core/input.js';
import { ParallaxLayer } from '../core/parallax.js';
import { game } from '../game/state.js';

const DialogSystem = {
  isOpen: false,
  currentDialog: null,
  currentIndex: 0,
  onCloseCallback: null,
  typewriterInterval: null,
  autoAdvanceTimer: null,
  isTyping: false,
  
  /**
   * Inicializa o sistema de diálogo
   */
  init() {
    const dialogModal = document.getElementById('dialogModal');
    const closeDialog = document.getElementById('closeDialog');
    const dialogNext = document.getElementById('dialogNext');
    
    // Fechar diálogo
    closeDialog.addEventListener('click', () => this.close());
    dialogModal.addEventListener('click', (e) => {
      if (e.target === dialogModal) this.close();
    });
    
    // Botão próximo
    dialogNext.addEventListener('click', () => this.next());
    
    // Tecla ESC para fechar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
      // Enter ou Espaço para próximo (funciona mesmo durante digitação)
      if ((e.key === 'Enter' || e.key === ' ') && this.isOpen && !this.hasChoices()) {
        e.preventDefault();
        this.next();
      }
    });
  },
  
  /**
   * Verifica se um tutorial já foi executado
   * @param {number|string} tutorialId - ID do tutorial
   * @returns {boolean} - true se já foi executado, false caso contrário
   */
  isTutorialExecuted(tutorialId) {
    if (tutorialId === undefined || tutorialId === null) return false;
    
    try {
      const executedTutorials = localStorage.getItem('shooter_tutorials_executed');
      if (!executedTutorials) return false;
      
      const tutorials = JSON.parse(executedTutorials);
      return Array.isArray(tutorials) && tutorials.includes(tutorialId.toString());
    } catch (e) {
      console.error('DialogSystem: Erro ao verificar tutorial executado', e);
      return false;
    }
  },
  
  /**
   * Marca um tutorial como executado no localStorage
   * @param {number|string} tutorialId - ID do tutorial
   */
  markTutorialAsExecuted(tutorialId) {
    if (tutorialId === undefined || tutorialId === null) return;
    
    try {
      const executedTutorials = localStorage.getItem('shooter_tutorials_executed');
      let tutorials = [];
      
      if (executedTutorials) {
        tutorials = JSON.parse(executedTutorials);
        if (!Array.isArray(tutorials)) tutorials = [];
      }
      
      const idStr = tutorialId.toString();
      if (!tutorials.includes(idStr)) {
        tutorials.push(idStr);
        localStorage.setItem('shooter_tutorials_executed', JSON.stringify(tutorials));
      }
    } catch (e) {
      console.error('DialogSystem: Erro ao salvar tutorial executado', e);
    }
  },
  
  /**
   * Mostra um diálogo
   * @param {Object} dialog - Objeto de diálogo com estrutura:
   *   {
   *     speaker: "Nome do Personagem",
   *     portrait: "caminho/para/imagem.png", // opcional - retrato do personagem
   *     messages: ["Mensagem 1", "Mensagem 2", ...],
   *     type: "tutorial", // opcional - se for "tutorial", verifica localStorage antes de mostrar
   *     id: 0, // opcional - ID do tutorial (necessário se type: "tutorial")
   *     paused: true, // opcional - se deve pausar o jogo (padrão: true)
   *     buttonNext: "Próximo", // opcional - texto do botão "Próximo" (padrão: "Próximo")
   *     buttonClose: "Fechar", // opcional - texto do botão "Fechar" (padrão: "Fechar")
   *     choices: [{text: "Opção 1", action: function() {...}}, ...], // opcional
   *     onClose: function() {...} // opcional
   *   }
   */
  show(dialog) {
    if (!dialog || !dialog.messages || dialog.messages.length === 0) {
      console.warn('DialogSystem: Diálogo inválido');
      return;
    }
    
    // Verifica se é um tutorial e se já foi executado
    if (dialog.type === 'tutorial' && dialog.id !== undefined && dialog.id !== null) {
      if (this.isTutorialExecuted(dialog.id)) {
        // Tutorial já foi executado, não mostra mas chama o callback se existir
        console.log('DialogSystem: Tutorial', dialog.id, 'já foi executado, pulando...');
        if (dialog.onClose && typeof dialog.onClose === 'function') {
          dialog.onClose();
        }
        return;
      }
    }
    
    this.currentDialog = dialog;
    this.currentIndex = 0;
    this.onCloseCallback = dialog.onClose || null;
    
    // Define textos padrão dos botões se não fornecidos
    this.currentDialog.buttonNext = dialog.buttonNext || 'Próximo';
    this.currentDialog.buttonClose = dialog.buttonClose || 'Fechar';
    
    // Verifica se deve pausar o jogo (padrão: true)
    const shouldPause = dialog.paused !== false; // Se não for especificado ou for true, pausa
    
    // Pausa o jogo se necessário e se estiver rodando
    if (shouldPause && window.game && !window.game.isPaused) {
      this.wasPaused = false;
      window.game.isPaused = true;
    } else {
      // Se não deve pausar ou o jogo já estava pausado, marca como já estava pausado
      this.wasPaused = window.game ? window.game.isPaused : true;
    }
    
    this.isOpen = true;
    this.render();
    
    const dialogModal = document.getElementById('dialogModal');
    dialogModal.classList.add('active');
  },
  
  /**
   * Renderiza o diálogo atual
   */
  render() {
    const dialog = this.currentDialog;
    if (!dialog) return;
    
    const speakerName = document.getElementById('dialogSpeakerName');
    const dialogMessage = document.getElementById('dialogMessage');
    const dialogChoices = document.getElementById('dialogChoices');
    const dialogNext = document.getElementById('dialogNext');
    const dialogPortraitImage = document.getElementById('dialogPortraitImage');
    
    // Define o nome do personagem
    speakerName.textContent = dialog.speaker || 'Personagem';
    
    // Define o retrato do personagem
    if (dialog.portrait) {
      // Aceita tanto string (caminho) quanto objeto Image do sistema de assets
      let portraitSrc = '';
      
      if (typeof dialog.portrait === 'string') {
        // Se for string, verifica se existe no objeto IMAGES (assets carregados)
        const imageKey = Object.keys(IMAGES).find(key => 
          ASSETS[key] === dialog.portrait || key === dialog.portrait
        );
        
        if (imageKey && IMAGES[imageKey] && IMAGES[imageKey].complete) {
          // Usa a imagem já carregada do sistema de assets
          portraitSrc = IMAGES[imageKey].src;
        } else {
          // Usa o caminho direto se não estiver nos assets
          portraitSrc = dialog.portrait;
        }
      } else if (dialog.portrait instanceof Image) {
        // Se for um objeto Image, usa diretamente
        portraitSrc = dialog.portrait.src;
      }
      
      if (portraitSrc && portraitSrc.trim() !== '') {
        dialogPortraitImage.src = portraitSrc;
        dialogPortraitImage.style.display = 'block';
        dialogPortraitImage.onload = () => {
          dialogPortraitImage.style.opacity = '1';
        };
      } else {
        dialogPortraitImage.style.display = 'none';
      }
    } else {
      // Se não houver retrato, esconde o elemento
      dialogPortraitImage.src = '';
      dialogPortraitImage.style.display = 'none';
    }
    
    // Cancela digitação anterior se houver
    this.stopTypewriter();
    
    // Limpa a mensagem
    dialogMessage.textContent = '';
    
    // Mensagem atual
    const currentMessage = dialog.messages[this.currentIndex];
    
    // Verifica se deve avançar automaticamente (quando paused: false)
    const shouldAutoAdvance = dialog.paused === false;
    
    // Verifica se há escolhas na última mensagem
    const hasChoices = dialog.choices && dialog.choices.length > 0 && this.currentIndex === dialog.messages.length - 1;
    
    // Se não deve pausar e não há escolhas, esconde o botão "Próximo"
    if (shouldAutoAdvance && !hasChoices) {
      dialogNext.classList.add('hidden');
    }
    
    // Inicia o efeito de digitação
    this.startTypewriter(currentMessage || '', dialogMessage, () => {
      // Callback quando termina de digitar
      // Verifica se há escolhas
      if (hasChoices) {
        // Se há escolhas, sempre mostra (mesmo com paused: false, o usuário precisa escolher)
        this.renderChoices(dialog.choices);
        dialogNext.classList.add('hidden');
      } else {
        dialogChoices.classList.remove('active');
        dialogChoices.innerHTML = '';
        
        // Se deve avançar automaticamente (paused: false) e não há escolhas
        if (shouldAutoAdvance) {
          if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
          const autoAdvanceDelay = 1500; // 1.5 segundos
          const dialogRef = dialog;
          this.autoAdvanceTimer = setTimeout(() => {
            this.autoAdvanceTimer = null;
            // Ignora se o diálogo já mudou/fechou
            if (!this.isOpen || this.currentDialog !== dialogRef) return;
            if (this.currentIndex < dialogRef.messages.length - 1) {
              this.next();
            } else {
              this.close();
            }
          }, autoAdvanceDelay);
        } else {
          // Mostra ou esconde botão "Próximo" (comportamento normal)
          if (this.currentIndex < dialog.messages.length - 1) {
            dialogNext.classList.remove('hidden');
            dialogNext.textContent = dialog.buttonNext || 'Próximo';
          } else {
            dialogNext.classList.remove('hidden');
            dialogNext.textContent = dialog.buttonClose || 'Fechar';
          }
        }
      }
    });
  },
  
  /**
   * Inicia o efeito de digitação (typewriter)
   * @param {string} text - Texto a ser digitado
   * @param {HTMLElement} element - Elemento onde o texto será exibido
   * @param {Function} onComplete - Callback quando termina de digitar
   */
  startTypewriter(text, element, onComplete) {
    this.isTyping = true;
    let index = 0;
    const speed = 30; // Velocidade em milissegundos por caractere
    
    // Desabilita botão "Próximo" enquanto digita
    const dialogNext = document.getElementById('dialogNext');
    if (dialogNext) {
      dialogNext.disabled = true;
      dialogNext.style.opacity = '0.5';
      dialogNext.style.cursor = 'not-allowed';
    }
    
    this.typewriterInterval = setInterval(() => {
      if (index < text.length) {
        element.textContent += text[index];
        index++;
      } else {
        this.stopTypewriter();
        this.isTyping = false;
        
        // Reabilita botão "Próximo"
        if (dialogNext) {
          dialogNext.disabled = false;
          dialogNext.style.opacity = '1';
          dialogNext.style.cursor = 'pointer';
        }
        
        // Chama callback quando termina
        if (onComplete && typeof onComplete === 'function') {
          onComplete();
        }
      }
    }, speed);
  },
  
  /**
   * Para o efeito de digitação
   */
  stopTypewriter() {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    this.isTyping = false;
  },
  
  /**
   * Renderiza as escolhas do diálogo
   */
  renderChoices(choices) {
    const dialogChoices = document.getElementById('dialogChoices');
    const dialogNext = document.getElementById('dialogNext');
    
    dialogChoices.innerHTML = '';
    dialogChoices.classList.add('active');
    
    choices.forEach((choice, index) => {
      const choiceButton = document.createElement('button');
      choiceButton.className = 'dialogChoice';
      choiceButton.textContent = choice.text || `Opção ${index + 1}`;
      choiceButton.addEventListener('click', () => {
        if (choice.action && typeof choice.action === 'function') {
          choice.action();
        }
        this.close();
      });
      
      dialogChoices.appendChild(choiceButton);
    });
  },
  
  /**
   * Avança para a próxima mensagem
   */
  next() {
    if (!this.currentDialog) return;
    
    // Se ainda está digitando, completa o texto imediatamente
    if (this.isTyping) {
      this.stopTypewriter();
      const dialogMessage = document.getElementById('dialogMessage');
      const currentMessage = this.currentDialog.messages[this.currentIndex];
      dialogMessage.textContent = currentMessage || '';
      this.isTyping = false;
      
      // Reabilita botão
      const dialogNext = document.getElementById('dialogNext');
      if (dialogNext) {
        dialogNext.disabled = false;
        dialogNext.style.opacity = '1';
        dialogNext.style.cursor = 'pointer';
      }
      
      // Renderiza escolhas ou botão se necessário
      const dialog = this.currentDialog;
      const dialogChoices = document.getElementById('dialogChoices');
      const dialogNextBtn = document.getElementById('dialogNext');
      
      if (dialog.choices && dialog.choices.length > 0 && this.currentIndex === dialog.messages.length - 1) {
        this.renderChoices(dialog.choices);
        dialogNextBtn.classList.add('hidden');
      } else {
        dialogChoices.classList.remove('active');
        dialogChoices.innerHTML = '';
        
        if (this.currentIndex < dialog.messages.length - 1) {
          dialogNextBtn.classList.remove('hidden');
          dialogNextBtn.textContent = dialog.buttonNext || 'Próximo';
        } else {
          dialogNextBtn.classList.remove('hidden');
          dialogNextBtn.textContent = dialog.buttonClose || 'Fechar';
        }
      }
      return;
    }
    
    // Avança normalmente
    if (this.currentIndex < this.currentDialog.messages.length - 1) {
      this.currentIndex++;
      this.render();
    } else {
      this.close();
    }
  },
  
  /**
   * Verifica se há escolhas no diálogo atual
   */
  hasChoices() {
    return this.currentDialog && 
           this.currentDialog.choices && 
           this.currentDialog.choices.length > 0 &&
           this.currentIndex === this.currentDialog.messages.length - 1;
  },
  
  /**
   * Fecha o diálogo
   */
  close() {
    // Para a digitação se estiver ativa
    this.stopTypewriter();
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
    
    const dialogModal = document.getElementById('dialogModal');
    dialogModal.classList.remove('active');
    
    this.isOpen = false;
    
    // Retoma o jogo se não estava pausado antes
    if (window.game && !this.wasPaused) {
      window.game.isPaused = false;
    }
    
    // Se for um tutorial, marca como executado antes de limpar
    const currentDialog = this.currentDialog;
    if (currentDialog && currentDialog.type === 'tutorial' && currentDialog.id !== undefined && currentDialog.id !== null) {
      this.markTutorialAsExecuted(currentDialog.id);
      console.log('DialogSystem: Tutorial', currentDialog.id, 'marcado como executado');
    }
    
    // Limpa o diálogo atual
    this.currentDialog = null;
    this.currentIndex = 0;
    
    // Reabilita botão
    const dialogNext = document.getElementById('dialogNext');
    if (dialogNext) {
      dialogNext.disabled = false;
      dialogNext.style.opacity = '1';
      dialogNext.style.cursor = 'pointer';
    }
    
    // Chama callback de fechamento se existir
    const callback = this.onCloseCallback;
    this.onCloseCallback = null; // Limpa antes de chamar para evitar chamadas múltiplas
    
    if (callback && typeof callback === 'function') {
      // Usa setTimeout para garantir que o DOM foi atualizado antes de chamar o callback
      setTimeout(() => {
        callback();
      }, 50);
    }
  },
  
  /**
   * Exemplo de uso:
   * 
   * Usando imagem do sistema de assets (RECOMENDADO - mais performático):
   * DialogSystem.show({
   *   speaker: "Comandante",
   *   portrait: IMAGES.commander, // Usa imagem já carregada dos assets
   *   messages: [
   *     "Bem-vindo, piloto!",
   *     "Você está pronto para a missão?",
   *     "Boa sorte lá fora!"
   *   ],
   *   buttonNext: "Continuar", // Texto personalizado do botão "Próximo" (opcional)
   *   buttonClose: "Entendi", // Texto personalizado do botão "Fechar" (opcional)
   *   onClose: () => {
   *     console.log("Diálogo fechado!");
   *   }
   * });
   * 
   * Ou usando caminho direto (também funciona):
   * DialogSystem.show({
   *   speaker: "Comandante",
   *   portrait: "./images/commander.png", // Caminho direto
   *   messages: ["Bem-vindo, piloto!"]
   * });
   * 
   * Com escolhas:
   * DialogSystem.show({
   *   speaker: "Comandante",
   *   portrait: IMAGES.commander,
   *   messages: [
   *     "Você aceita a missão?"
   *   ],
   *   buttonNext: "Avançar",
   *   buttonClose: "Sair",
   *   choices: [
   *     {
   *       text: "Sim, vou aceitar!",
   *       action: () => {
   *         console.log("Aceitou a missão!");
   *       }
   *     },
   *     {
   *       text: "Preciso pensar...",
   *       action: () => {
   *         console.log("Recusou por enquanto.");
   *       }
   *     }
   *   ]
   * });
   */
};


export { DialogSystem };
