// seleciona os elementos que vamos animar
const palavra = document.querySelector('#palavra span');
const bola = document.querySelector('#bola');
const logoIntro = document.querySelector('#logo-intro');

// posição inicial da bola
bola.style.position = 'absolute';
bola.style.left = '50%';
bola.style.transform = 'translate(-50%, -50%)';
bola.style.top = '0px';

// etapa_A — bola cai, pinga 2x e encolhe virando a logo
function animarBola() {
    let posY = 0;
    let velocidade = 0;
    let gravidade = 0.8;
    let pulos = 0;
    const chao = window.innerHeight / 2;

    function cair() {
        velocidade += gravidade;
        posY += velocidade;

        if (posY >= chao) {
            posY = chao;
            velocidade *= -0.6;
            pulos++;

            if (pulos >= 2) {
                let escala = 1;
                let encolher = setInterval(() => {
                    escala -= 0.05;
                    bola.style.width = (80 * escala) + 'px';
                    bola.style.height = (80 * escala) + 'px';

                    if (escala <= 0.2) {
                        clearInterval(encolher);
                        bola.style.opacity = '0';
                        logoIntro.style.transition = 'opacity 1s';
                        logoIntro.style.opacity = '1';
                        logoIntro.classList.add('girando');
                    }
                }, 16);
                return;
            }
        }

        bola.style.top = posY + 'px';
        requestAnimationFrame(cair);
    }

    cair();
}

animarBola();

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

menuBtn.addEventListener('click', () => {
    menu.classList.toggle('aberto');
});

const menuLinks = document.querySelectorAll('#menu a');
menuLinks.forEach(link => {
    link.addEventListener('click', () => {
        menu.classList.remove('aberto');
    });
});

// efeito scroll stack — intro encolhe quando banner sobe
const intro = document.querySelector('#intro');

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const alturaIntro = intro.offsetHeight;

    if (scrollY < alturaIntro) {
        const progresso = scrollY / alturaIntro;
        const escala = 1 - progresso * 0.15;
        const opacidade = 1 - progresso * 1.5;
        intro.style.transform = `scale(${escala})`;
        intro.style.opacity = opacidade;
    }

    if (scrollY > alturaIntro) {
        intro.style.position = 'relative';
        intro.style.opacity = '0';
    } else {
        intro.style.position = 'sticky';
    }

    // muda cor do site quando chega no banner ← aqui
    const banner = document.querySelector('#banner');
    const bannerRect = banner.getBoundingClientRect();

    if (bannerRect.top <= 0 && bannerRect.bottom >= 0) {
        document.body.style.backgroundColor = '#f0ebe3';
        document.body.style.color = '#1a1a1a';
    } else {
        document.body.style.backgroundColor = '#1a1a1a';
        document.body.style.color = '#c8c0b0';
    }

    palavra.style.transform = `translateX(${scrollY * 0.1}px)`; // ← última linha
});