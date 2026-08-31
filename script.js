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

                cursor.classList.add('is-visible');

                const target = document.elementFromPoint(
                    cursorX,
                    cursorY
                );

                const isLight = target?.closest(
                    '.language, .portfolio, .about, .faq'
                );

                cursor.classList.toggle(
                    'is-over-light',
                    Boolean(isLight)
                );

                cursorFrame = 0;
            });
        }
    });

    document.addEventListener('pointerover', (event) => {
        const interactive = event.target.closest(
            'a, button, summary, input, textarea, .portfolio-case__media'
        );

        cursor.classList.toggle(
            'is-hovering',
            Boolean(interactive)
        );
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
        }, prefersReducedMotion ? 50 : 820);
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

// Lanterna da seção escura
const perception = $('#percepcao');

perception?.addEventListener('pointermove', (event) => {
    if (!hasFinePointer) return;

    const rect = perception.getBoundingClientRect();

    perception.style.setProperty(
        '--spot-x',
        `${event.clientX - rect.left}px`
    );

    perception.style.setProperty(
        '--spot-y',
        `${event.clientY - rect.top}px`
    );
});

// Efeitos guiados pelo scroll
const languageSection = $('#linguagem');
const typeRows = $$('.type-stream__row');
const finalIdentity = $('.type-stream__final-identity');
const siteHeader = $('#site-header');
const faqSection = $('#faq');
const faqItems = $$('.faq-card');

let scrollFrame = 0;

function updateLanguageEffect() {
    if (
        !languageSection ||
        !typeRows.length
    ) {
        return;
    }

    if (prefersReducedMotion) {
        languageSection.style.backgroundColor = 'rgb(241, 216, 49)';
        languageSection.style.setProperty('--stream-opacity', '1');
        finalIdentity?.style.removeProperty('transform');
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

    // A cor começa a mudar quando a seção ainda está entrando na tela,
    // antes de as palavras iniciarem o deslocamento horizontal.
    const colorProgress = clamp(
        (viewportHeight * 1.05 - rect.top) / (viewportHeight * 0.92),
        0,
        1
    );

    const paper = [240, 235, 227];
    const yellow = [241, 216, 49];
    const mixedColor = paper.map((channel, index) =>
        Math.round(channel + (yellow[index] - channel) * colorProgress)
    );

    languageSection.style.backgroundColor = `rgb(${mixedColor.join(', ')})`;

    const startingOffsets = [-0.42, -0.67, -0.52];
    const identityRow = finalIdentity?.parentElement;
    const identityRowIndex = identityRow
        ? typeRows.indexOf(identityRow)
        : -1;
    const identitySpeed = identityRow
        ? Number(identityRow.dataset.speed || 0.6)
        : 0;
    const identityStartingOffset =
        startingOffsets[identityRowIndex] ?? 0;
    const identityLocalCenter = finalIdentity
        ? finalIdentity.offsetLeft + finalIdentity.offsetWidth / 2
        : 0;
    const naturalCenterProgress = finalIdentity
        ? clamp(
            (
                viewportWidth / 2 -
                identityLocalCenter -
                identityStartingOffset * viewportWidth
            ) /
            (identitySpeed * viewportWidth * 1.7),
            0.36,
            0.82
        )
        : 1;
    const identityPinDuration = 0.18;
    const identityPinStart = Math.max(
        naturalCenterProgress - identityPinDuration,
        0
    );
    const identityPinProgress = clamp(
        (progress - identityPinStart) / identityPinDuration,
        0,
        1
    );
    const exitProgress = clamp(
        (progress - naturalCenterProgress) /
        Math.max(1 - naturalCenterProgress, 0.01),
        0,
        1
    );
    const exitEase =
        exitProgress * exitProgress * (3 - 2 * exitProgress);

    let identityRowX = 0;

    typeRows.forEach((row, index) => {
        const speed = Number(row.dataset.speed || 0.6);
        const startingOffset =
            startingOffsets[index] ??
            startingOffsets[startingOffsets.length - 1];

        const normalX =
            (startingOffset * viewportWidth) +
            (progress * speed * viewportWidth * 1.7);
        const x =
            normalX +
            exitEase * viewportWidth * 1.65;

        row.style.transform = `translate3d(${x}px, 0, 0)`;

        if (row === identityRow) {
            identityRowX = x;
        }
    });

    if (finalIdentity && identityRow) {
        const startRowX =
            (identityStartingOffset * viewportWidth) +
            (
                identityPinStart *
                identitySpeed *
                viewportWidth *
                1.7
            );
        const startCenter = startRowX + identityLocalCenter;
        const targetCenter = viewportWidth / 2;
        const t = identityPinProgress;
        const t2 = t * t;
        const t3 = t2 * t;
        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const startingVelocity =
            identitySpeed *
            viewportWidth *
            1.7 *
            identityPinDuration;
        const currentCenter = identityRowX + identityLocalCenter;
        const desiredCenter = progress <= identityPinStart
            ? currentCenter
            : (
                h00 * startCenter +
                h10 * startingVelocity +
                h01 * targetCenter
            );

        finalIdentity.style.transform =
            `translate3d(${desiredCenter - currentCenter}px, 0, 0)`;
    }

    languageSection.style.setProperty('--stream-opacity', '1');
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
    updateFaqCards();
}

function requestScrollUpdate() {
    if (!scrollFrame) {
        scrollFrame = requestAnimationFrame(updateScrollEffects);
    }
}

window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', requestScrollUpdate);
updateScrollEffects();

// Reprodução dos novos vídeos do portfólio
const portfolioVideos = $$('.portfolio-case video');

if (
    'IntersectionObserver' in window &&
    !prefersReducedMotion
) {
    const videoObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                const video = entry.target;

                if (entry.isIntersecting) {
                    video.play().catch(() => undefined);
                } else {
                    video.pause();
                }
            });
        },
        {
            threshold: 0.28
        }
    );

    portfolioVideos.forEach((video) => {
        videoObserver.observe(video);
    });
} else {
    portfolioVideos.forEach((video) => {
        video.pause();
    });
}

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
    $('.about__title'),
    $('.about__body'),
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
