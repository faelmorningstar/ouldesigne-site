const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
).matches;

const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

// Cursor personalizado
const cursor = $('.cursor');

if (cursor && hasFinePointer) {
    let cursorFrame = 0;
    let cursorX = 0;
    let cursorY = 0;

    document.addEventListener('pointermove', (event) => {
        cursorX = event.clientX;
        cursorY = event.clientY;

        if (!cursorFrame) {
            cursorFrame = requestAnimationFrame(() => {
                cursor.style.transform =
                    `translate3d(${cursorX}px, ${cursorY}px, 0)`;


                const target = document.elementFromPoint(
                    cursorX,
                    cursorY
                );

                const isPerception = target?.closest('.perception');

                cursor.classList.toggle(
                    'is-visible',
                    Boolean(isPerception)
                );

cursor.classList.remove('is-over-light');

                cursorFrame = 0;
            });
        }
    });


    document.documentElement.addEventListener('mouseleave', () => {
        cursor.classList.remove('is-visible');
    });
}

// Menu lateral
const menuButton = $('#menu-button');
const siteMenu = $('#site-menu');
const menuCloseButtons = $$('[data-menu-close]');
let focusBeforeMenu = null;

function setMenu(open) {
    if (!menuButton || !siteMenu) return;

    document.body.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    siteMenu.setAttribute('aria-hidden', String(!open));
    siteMenu.inert = !open;

    if (open) {
        focusBeforeMenu = document.activeElement;
        $('[data-menu-close]', siteMenu)?.focus();
    } else if (focusBeforeMenu instanceof HTMLElement) {
        focusBeforeMenu.focus();
    }
}

menuButton?.addEventListener('click', () => {
    const menuIsOpen =
        menuButton.getAttribute('aria-expanded') === 'true';

    setMenu(!menuIsOpen);
});

menuCloseButtons.forEach((button) => {
    button.addEventListener('click', () => setMenu(false));
});

$$('a', siteMenu || document.createElement('nav')).forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
});

document.addEventListener('keydown', (event) => {
    if (
        event.key === 'Escape' &&
        document.body.classList.contains('menu-open')
    ) {
        setMenu(false);
    }
});

// Abertura: bola branca, fallback, marca plana e modelo 3D
const heroBall = $('#hero-ball');
const flatLogo = $('#hero-flat-logo');
const heroFallback = $('#hero-fallback');
const modelContainer = $('#logo-3d-container');
const heroLoader = $('#hero-loader');

let modelReady = false;
let modelFailed = false;
let waitingForModel = false;
let introFinished = false;
let flatLogoAvailable = false;

function registerFlatLogo() {
    if (!flatLogo || !flatLogo.naturalWidth) return;

    flatLogoAvailable = true;
    flatLogo.hidden = false;
}

flatLogo?.addEventListener('load', registerFlatLogo);
flatLogo?.addEventListener('error', () => {
    flatLogoAvailable = false;
    flatLogo.hidden = true;
});

if (flatLogo?.complete) {
    registerFlatLogo();
}

function revealStaticMark() {
    if (flatLogoAvailable) {
        flatLogo?.classList.add('is-visible');
        heroFallback?.classList.remove('is-visible');
    } else {
        heroFallback?.classList.add('is-visible');
    }
}

function revealModel() {
    if (!modelReady) return;

    flatLogo?.classList.add('is-leaving');
    heroFallback?.classList.remove('is-visible');
    modelContainer?.classList.add('is-visible');
    heroLoader?.classList.add('is-hidden');
    document.body.classList.remove('is-loading');
    document.body.classList.add('intro-complete');
}

function finishIntro(useModel = true) {
    // Se o tempo de segurança já exibiu a marca estática, ainda permitimos
    // que o modelo 3D assuma a abertura assim que terminar de carregar.
    if (introFinished) {
        if (useModel && modelReady) revealModel();
        return;
    }

    introFinished = true;

    if (useModel && modelReady) {
        revealModel();
    } else {
        revealStaticMark();
    }

    heroLoader?.classList.add('is-hidden');
    document.body.classList.remove('is-loading');
    document.body.classList.add('intro-complete');
}

function showStaticMark() {
    heroBall?.classList.add('is-collapsing');

    window.setTimeout(() => {
        revealStaticMark();

        window.setTimeout(() => {
            if (modelReady) {
                finishIntro(true);
            } else if (modelFailed) {
                finishIntro(false);
            } else {
                waitingForModel = true;
            }
        }, prefersReducedMotion ? 50 : 1250);
    }, prefersReducedMotion ? 0 : 260);
}

function animateBall() {
    if (!heroBall || prefersReducedMotion) {
        showStaticMark();
        return;
    }

    let position = -60;
    let velocity = 0;
    let bounces = 0;
    let previousTime = performance.now();

    function frame(currentTime) {
        const delta = Math.min(
            (currentTime - previousTime) / 1000,
            0.034
        );

        previousTime = currentTime;

        const floor = window.innerHeight * 0.5;

        velocity += 2200 * delta;
        position += velocity * delta;

        if (position >= floor) {
            position = floor;
            velocity *= -0.48;
            bounces += 1;

            if (bounces >= 2) {
                heroBall.style.top = `${position}px`;
                showStaticMark();
                return;
            }
        }

        heroBall.style.top = `${position}px`;
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

window.addEventListener('ouldesign:model-ready', () => {
    modelReady = true;

    if (waitingForModel) {
        finishIntro(true);
    }
});

window.addEventListener('ouldesign:model-error', () => {
    modelFailed = true;

    if (waitingForModel) {
        finishIntro(false);
    }
});

animateBall();

// Evita que a abertura fique presa se um arquivo externo não carregar.
window.setTimeout(() => {
    if (!introFinished) {
        finishIntro(modelReady);
    }
}, 7000);

// Lanterna da seção escura: a atração afeta somente a máscara da luz.
const perception = $('#percepcao');

if (perception) {
    const title = $('#perception-title');
    const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let pointerInside = false;
    let lightFrame = 0;
    let previousTime = 0;
    let light = null;
    let target = null;

    function interactiveLight() {
        return pointerQuery.matches && !motionQuery.matches;
    }

    function phraseBounds() {
        const range = document.createRange();
        range.selectNodeContents(title);
        const bounds = range.getBoundingClientRect();
        const section = perception.getBoundingClientRect();
        return {
            x: bounds.left - section.left + bounds.width / 2,
            y: bounds.top - section.top + bounds.height / 2,
            left: bounds.left - section.left,
            right: bounds.right - section.left,
            top: bounds.top - section.top,
            bottom: bounds.bottom - section.top
        };
    }

    function writeLight() {
        perception.style.setProperty('--spot-x', `${light.x}px`);
        perception.style.setProperty('--spot-y', `${light.y}px`);
    }

    function stopLight() {
        cancelAnimationFrame(lightFrame);
        lightFrame = 0;
        previousTime = 0;
    }

    function animateLight(time) {
        lightFrame = 0;
        if (!visible || document.hidden) return;
        const elapsed = previousTime ? time - previousTime : 16;
        previousTime = time;
        const amount = 1 - Math.exp(-elapsed / 110);
        light.x += (target.x - light.x) * amount;
        light.y += (target.y - light.y) * amount;
        if (Math.hypot(target.x - light.x, target.y - light.y) < 0.3) {
            light = { ...target };
            previousTime = 0;
        } else {
            lightFrame = requestAnimationFrame(animateLight);
        }
        writeLight();
    }

    function moveLight(x, y, animate = interactiveLight()) {
        target = { x, y };
        if (!light) {
            light = { x: perception.clientWidth / 2, y: perception.clientHeight / 2 };
        }
        if (!animate || !visible || document.hidden) {
            stopLight();
            light = { ...target };
            writeLight();
        } else if (!lightFrame) {
            lightFrame = requestAnimationFrame(animateLight);
        }
    }

    function restLight(animate = interactiveLight()) {
        pointerInside = false;
        const focus = phraseBounds();
        moveLight(focus.x, focus.y, animate);
    }

    perception.addEventListener('pointermove', (event) => {
        if (!interactiveLight() || event.pointerType !== 'mouse' || !visible) return;
        pointerInside = true;
        const section = perception.getBoundingClientRect();
        const x = event.clientX - section.left;
        const y = event.clientY - section.top;
        const focus = phraseBounds();
        const distance = Math.hypot(
            x - clamp(x, focus.left, focus.right),
            y - clamp(y, focus.top, focus.bottom)
        );
        const proximity = clamp(1 - distance / 220, 0, 1);
        const attraction = 0.12 * proximity * proximity * (3 - 2 * proximity);
        const dx = (focus.x - x) * attraction;
        const dy = (focus.y - y) * attraction;
        const limit = Math.min(1, 36 / Math.max(Math.hypot(dx, dy), 1));
        moveLight(x + dx * limit, y + dy * limit);
    });

    perception.addEventListener('pointerleave', () => restLight());
    window.addEventListener('resize', () => {
        if (!pointerInside) restLight(false);
    });
    document.fonts.ready.then(() => {
        if (visible && !pointerInside) restLight(false);
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopLight();
        else if (visible) restLight();
    });
    pointerQuery.addEventListener('change', () => restLight(false));
    motionQuery.addEventListener('change', () => restLight(false));

    if ('IntersectionObserver' in window) {
        const lightObserver = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) restLight();
            else {
                stopLight();
                pointerInside = false;
                light = null;
                perception.style.removeProperty('--spot-x');
                perception.style.removeProperty('--spot-y');
            }
        });
        lightObserver.observe(perception);
    } else {
        restLight(false);
    }
}

// Efeitos guiados pelo scroll
const languageSection = $('#linguagem');
const typeRows = $$('.type-stream__row');
const siteHeader = $('#site-header');
const aboutSignature = $('#about-signature');
const faqSection = $('#faq');
const faqItems = $$('.faq-card');

const scrollMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const journey = languageSection?.parentElement;
const theme = getComputedStyle(document.documentElement);
const journeyPalette = Object.fromEntries(['paper', 'yellow', 'ink'].map((name) => [
    name,
    theme.getPropertyValue(`--${name}`).trim().slice(1).match(/.{2}/g)
        .map((channel) => parseInt(channel, 16))
]));
journeyPalette.black = [7, 7, 7];

function mixJourneyColor(from, to, progress) {
    return from.map((channel, index) => Math.round(channel + (to[index] - channel) * progress));
}

function journeyLuminance(color) {
    return color.reduce((total, channel, index) => {
        const value = channel / 255;
        const linear = value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
        return total + linear * [0.2126, 0.7152, 0.0722][index];
    }, 0);
}

function journeyContrast(first, second) {
    const a = journeyLuminance(first);
    const b = journeyLuminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

let scrollFrame = 0;

function updateLanguageEffect() {
    if (
        !languageSection ||
        !typeRows.length
    ) {
        return;
    }

    if (scrollMotionQuery.matches) {
        ['--journey-bg', '--journey-ink', '--journey-muted'].forEach((property) => {
            journey?.style.removeProperty(property);
        });
        typeRows.forEach((row) => row.style.removeProperty('transform'));
        languageSection.style.setProperty('--stream-opacity', '0');
        languageSection.style.setProperty('--final-identity-opacity', '1');
        return;
    }

    const rect = languageSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const scrollDistance = Math.max(
        rect.height - viewportHeight,
        1
    );

    const progress = clamp(
        -rect.top / scrollDistance,
        0,
        1
    );

    // As superfícies vizinhas compartilham a cor enquanto a borda cruza a tela.
    const smooth = (value) => value * value * (3 - 2 * value);
    const entry = smooth(clamp((viewportHeight - rect.top) / viewportHeight, 0, 1));
    const exit = smooth(clamp((viewportHeight - rect.bottom) / viewportHeight, 0, 1));
    const background = exit > 0
        ? mixJourneyColor(journeyPalette.yellow, journeyPalette.paper, exit)
        : mixJourneyColor(journeyPalette.black, journeyPalette.yellow, entry);
    const foreground = journeyContrast(background, journeyPalette.paper) >
        journeyContrast(background, journeyPalette.ink)
        ? journeyPalette.paper : journeyPalette.ink;

    // A frase permanece discreta fora da lanterna, mas legível durante a passagem.
    let muted = foreground;
    for (let amount = 0.36; amount <= 1; amount += 0.04) {
        muted = mixJourneyColor(background, foreground, amount);
        if (journeyContrast(background, muted) >= 3.1) break;
    }
    journey?.style.setProperty('--journey-bg', `rgb(${background.join(', ')})`);
    journey?.style.setProperty('--journey-ink', `rgb(${foreground.join(', ')})`);
    journey?.style.setProperty('--journey-muted', `rgb(${muted.join(', ')})`);

    const startingOffsets = [-0.42, -0.67, -0.52];
    const exitOffset = smooth(clamp((progress - 0.8) / 0.16, 0, 1)) * viewportWidth * 1.04;

typeRows.forEach((row, index) => {
    const speed = Number(row.dataset.speed || 0.6);
    const startingOffset =
        startingOffsets[index] ??
        startingOffsets[startingOffsets.length - 1];

    const x =
        (startingOffset * viewportWidth) +
        (progress * speed * viewportWidth * 1.7) + exitOffset;

    row.style.transform = `translate3d(${x}px, 0, 0)`;
});

    languageSection.style.setProperty(
        '--stream-opacity',
        String(1 - smooth(clamp((progress - 0.84) / 0.08, 0, 1)))
    );
    languageSection.style.setProperty(
        '--final-identity-opacity',
        String(smooth(clamp((progress - 0.92) / 0.07, 0, 1)))
    );
}

function updateAboutSignature() {
    if (!aboutSignature) return;

    if (prefersReducedMotion) {
        aboutSignature.style.setProperty('--signature-reveal', '0%');
        return;
    }

    const rect = aboutSignature.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const progress = clamp(
        (viewportHeight * 0.9 - rect.top) /
        (viewportHeight * 0.72 + rect.height * 0.34),
        0,
        1
    );

    aboutSignature.style.setProperty(
        '--signature-reveal',
        `${(1 - progress) * 100}%`
    );
}

function updateFaqCards() {
    if (
        !faqSection ||
        !faqItems.length ||
        prefersReducedMotion
    ) {
        return;
    }

    const rect = faqSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const animationStart = viewportHeight * 0.7;
    const animationDistance = Math.max(
        rect.height - viewportHeight * 0.45,
        1
    );

    const sectionProgress = clamp(
        (animationStart - rect.top) / animationDistance,
        0,
        1
    );

    const cardStarts = [0.01, 0.3, 0.47, 0.64, 0.81];

    faqItems.forEach((card, index) => {
        const start = cardStarts[index] ?? 0.81;
        const duration = index === 0 ? 0.13 : 0.12;
        const localProgress = clamp(
            (sectionProgress - start) / duration,
            0,
            1
        );

        const eased = 1 - Math.pow(1 - localProgress, 3);
        const startingY = viewportHeight * 1.12;
        const endingY = -(faqItems.length - 1 - index) * 18;
        const currentY =
            startingY + (endingY - startingY) * eased;

        card.style.setProperty('--card-y', `${currentY}px`);
    });
}

function updateScrollEffects() {
    scrollFrame = 0;

    siteHeader?.classList.toggle(
        'is-scrolled',
        window.scrollY > 28
    );

    updateLanguageEffect();
    updateAboutSignature();
    updateFaqCards();
}

function requestScrollUpdate() {
    if (!scrollFrame) {
        scrollFrame = requestAnimationFrame(updateScrollEffects);
    }
}

window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', requestScrollUpdate);
scrollMotionQuery.addEventListener('change', requestScrollUpdate);
updateScrollEffects();

// Prévias do portfólio: somente hover de mouse, sem reprodução pelo scroll.
const portfolioVideos = $$('.portfolio-case video');
const portfolioPointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
const portfolioMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const hoveredPortfolioVideos = new Set();
let activePortfolioVideo = null;

function pausePortfolioVideo(video) {
    hoveredPortfolioVideos.delete(video);
    if (activePortfolioVideo === video) activePortfolioVideo = null;
    video.pause();
}

function pausePortfolioVideos() {
    portfolioVideos.forEach(pausePortfolioVideo);
}

function pauseOtherPortfolioVideos(currentVideo) {
    portfolioVideos.forEach((video) => {
        if (video !== currentVideo) pausePortfolioVideo(video);
    });
}

function canPreviewPortfolioVideo(video) {
    if (
        !portfolioPointerQuery.matches ||
        portfolioMotionQuery.matches ||
        document.hidden ||
        !hoveredPortfolioVideos.has(video) ||
        !('IntersectionObserver' in window)
    ) {
        return false;
    }

    const rect = video.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 &&
        rect.bottom > 0 && rect.top < window.innerHeight &&
        rect.right > 0 && rect.left < window.innerWidth;
}

portfolioVideos.forEach((video) => {
    const media = video.closest('.portfolio-case__media');
    video.pause();

    media?.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse') return;

        hoveredPortfolioVideos.add(video);
        if (!canPreviewPortfolioVideo(video)) return;

        activePortfolioVideo = video;
        pauseOtherPortfolioVideos(video);

        video.play().then(() => {
            if (activePortfolioVideo !== video || !canPreviewPortfolioVideo(video)) {
                pausePortfolioVideo(video);
            }
        }).catch(() => undefined);
    });

    media?.addEventListener('pointerleave', (event) => {
        if (event.pointerType === 'mouse') pausePortfolioVideo(video);
    });

    video.addEventListener('play', () => {
        if (activePortfolioVideo !== video || !canPreviewPortfolioVideo(video)) {
            pausePortfolioVideo(video);
            return;
        }
        pauseOtherPortfolioVideos(video);
    });
});

if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting || entry.intersectionRatio === 0) {
                    pausePortfolioVideo(entry.target);
                }
            });
        },
        {
            threshold: 0
        }
    );

    portfolioVideos.forEach((video) => {
        videoObserver.observe(video);
    });
}

document.addEventListener('visibilitychange', pausePortfolioVideos);
portfolioPointerQuery.addEventListener('change', pausePortfolioVideos);
portfolioMotionQuery.addEventListener('change', pausePortfolioVideos);

// Mantém somente uma resposta do FAQ aberta
faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
        item.classList.toggle('is-open', item.open);

        if (!item.open) return;

        faqItems.forEach((otherItem) => {
            if (otherItem !== item) {
                otherItem.open = false;
            }
        });
    });
});

// Formulário preparado para o Formspree
const contactForm = $('#contact-form');
const formFeedback = $('#form-feedback');

contactForm?.addEventListener('submit', (event) => {
    if (!contactForm.action.includes('SEU_CODIGO')) {
        return;
    }

    event.preventDefault();

    if (formFeedback) {
        formFeedback.textContent =
            'O formulário está pronto. Falta apenas inserir o código do Formspree no arquivo index.html.';
    }
});

// Entrada suave dos elementos
const revealTargets = [
    ...$$('.section-heading'),
    ...$$('.portfolio-case'),
    $('.about__lead'),
    $('.about__body'),
    $('.project-archive__header'),
    ...$$('.archive-card'),
    $('.contact__intro'),
    $('.contact-form')
].filter(Boolean);

revealTargets.forEach((element) => {
    element.setAttribute('data-reveal', '');
});

if (
    'IntersectionObserver' in window &&
    !prefersReducedMotion
) {
    const revealObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                entry.target.classList.add('is-revealed');
                observer.unobserve(entry.target);
            });
        },
        {
            threshold: 0.12,
            rootMargin: '0px 0px -6% 0px'
        }
    );

    revealTargets.forEach((element) => {
        revealObserver.observe(element);
    });
} else {
    revealTargets.forEach((element) => {
        element.classList.add('is-revealed');
    });
}

// Ano automático no rodapé
const currentYear = $('#current-year');

if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
}
