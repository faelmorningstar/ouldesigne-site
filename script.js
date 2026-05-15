// seleciona os elementos que vamos animar
const palavra = document.querySelector('#palavra span');
const bola = document.querySelector('#bola');
const logoIntro = document.querySelector('#logo-intro');

// posição inicial da bola (fora da tela, no topo)
bola.style.top = '-100px';
bola.style.position = 'absolute';

// etapa_A — bola cai, pinga 2x e some
function animarBola() {
    let posY = -100;       // posição vertical da bola
    let velocidade = 0;    // velocidade inicial
    let gravidade = 0.8;   // força da gravidade
    let pulos = 0;         // contador de pulos
    let chao = window.innerHeight / 2; // meio da tela = chão

    function cair() {
        velocidade += gravidade;  // acelera a cada frame
        posY += velocidade;       // move a bola para baixo

        if (posY >= chao) {       // se chegou no chão
            posY = chao;
            velocidade *= -0.5;   // inverte e reduz a velocidade (pulo)
            pulos++;

            if (pulos >= 2) {     // após 2 pulos
                setTimeout(() => {
                    bola.style.opacity = '0';                    // esconde a bola
                    logoIntro.style.transition = 'opacity 1s';   // transição suave
                    logoIntro.style.opacity = '1';               // mostra a logo
                    logoIntro.classList.add('girando');          // etapa_B — gira a logo
                }, 300);
                return;           // para a animação
            }
        }

        bola.style.top = posY + 'px'; // atualiza posição na tela
        requestAnimationFrame(cair);   // próximo frame
    }

    cair(); // inicia a queda
}

animarBola(); // executa tudo

// FAQ — abre e fecha ao clicar
const perguntas = document.querySelectorAll('#faq article');

perguntas.forEach(pergunta => {
    pergunta.addEventListener('click', () => {
        pergunta.classList.toggle('aberto');
    });
});

// Menu hamburguer — abre e fecha ao clicar
const menuBtn = document.querySelector('#menu-btn');
const menu = document.querySelector('#menu');

// abre/fecha ao clicar no ≡
menuBtn.addEventListener('click', () => {
    menu.classList.toggle('aberto');
});

// fecha o menu ao clicar em qualquer link dentro dele
const menuLinks = document.querySelectorAll('#menu a');
menuLinks.forEach(link => {
    link.addEventListener('click', () => {
        menu.classList.remove('aberto'); // remove a classe aberto
    });
});