(() => {

    const EVENTS_PER_PAGE = 6;
    const PAGE_DURATION = 10000;
    const FADE_DURATION = 500;

    let currentPage = 0;
    let totalPages = 1;
    let pageTimer = null;
    let mutationTimer = null;
    let captureBusy = false;

    const grid = document.getElementById("eventGrid");
    const indicator = document.getElementById("pageIndicator");

    if (!grid) {
        console.error("pagination.js : #eventGrid introuvable.");
        return;
    }

    function getEvents() {
        return Array.from(grid.querySelectorAll(".eventCard"));
    }

    function calculatePages() {
        const count = getEvents().length;
        totalPages = Math.max(1, Math.ceil(count / EVENTS_PER_PAGE));
        if (currentPage >= totalPages) currentPage = 0;
    }

    function updateIndicator() {
        if (!indicator) return;
        indicator.innerHTML = totalPages > 1
            ? `<span class="pageNumber">${currentPage + 1} / ${totalPages}</span>`
            : "";
    }

    function addStyles() {
        if (document.getElementById("paginationRuntimeStyles")) return;
        const style = document.createElement("style");
        style.id = "paginationRuntimeStyles";
        style.textContent = `
            .pageArrow,
            .screenshotButton {
                position: fixed;
                z-index: 99999;
                border: 0;
                cursor: pointer;
                user-select: none;
                font-family: inherit;
                box-shadow: 0 4px 18px rgba(0,0,0,.25);
            }
            .pageArrow {
                top: 50%;
                transform: translateY(-50%);
                width: 58px;
                height: 90px;
                border-radius: 18px;
                background: rgba(255,255,255,.92);
                color: #0a1330;
                font-size: 58px;
                line-height: 70px;
            }
            .pageArrowLeft { left: 12px; }
            .pageArrowRight { right: 12px; }
            .screenshotButton {
                right: 18px;
                bottom: 18px;
                width: 58px;
                height: 58px;
                border-radius: 50%;
                background: rgba(255,255,255,.95);
                font-size: 28px;
            }
            .pageArrow:hover { transform: translateY(-50%) scale(1.05); }
            .screenshotButton:hover { transform: scale(1.05); }
            .captureHidden { visibility: hidden !important; }
            .pagination-hidden { opacity: 0; transition: opacity ${FADE_DURATION}ms ease; }
            .pagination-visible { opacity: 1; transition: opacity ${FADE_DURATION}ms ease; }
        `;
        document.head.appendChild(style);
    }

    function createControls() {
        addStyles();

        let previousButton = document.getElementById("previousPageButton");
        if (!previousButton) {
            previousButton = document.createElement("button");
            previousButton.id = "previousPageButton";
            previousButton.className = "pageArrow pageArrowLeft";
            previousButton.type = "button";
            previousButton.setAttribute("aria-label", "Page précédente");
            previousButton.textContent = "‹";
            previousButton.addEventListener("click", previousPage);
            document.body.appendChild(previousButton);
        }

        let nextButton = document.getElementById("nextPageButton");
        if (!nextButton) {
            nextButton = document.createElement("button");
            nextButton.id = "nextPageButton";
            nextButton.className = "pageArrow pageArrowRight";
            nextButton.type = "button";
            nextButton.setAttribute("aria-label", "Page suivante");
            nextButton.textContent = "›";
            nextButton.addEventListener("click", nextPage);
            document.body.appendChild(nextButton);
        }

        let screenshotButton = document.getElementById("screenshotButton");
        if (!screenshotButton) {
            screenshotButton = document.createElement("button");
            screenshotButton.id = "screenshotButton";
            screenshotButton.className = "screenshotButton";
            screenshotButton.type = "button";
            screenshotButton.setAttribute("aria-label", "Faire une capture d'écran");
            screenshotButton.title = "Capture d'écran";
            screenshotButton.textContent = "📷";
            screenshotButton.addEventListener("click", captureScreen);
            document.body.appendChild(screenshotButton);
        }
    }

    function showPage(page, animate = false) {
        const events = getEvents();
        calculatePages();
        if (!events.length) {
            if (indicator) indicator.innerHTML = "";
            return;
        }

        if (page < 0 || page >= totalPages) page = 0;
        currentPage = page;

        events.forEach(event => { event.style.display = "none"; });
        events.slice(currentPage * EVENTS_PER_PAGE, (currentPage + 1) * EVENTS_PER_PAGE)
            .forEach(event => { event.style.display = ""; });

        updateIndicator();

        if (animate) {
            grid.classList.remove("pagination-visible");
            grid.classList.add("pagination-hidden");
            setTimeout(() => {
                grid.classList.remove("pagination-hidden");
                grid.classList.add("pagination-visible");
            }, FADE_DURATION);
        }
    }

    function previousPage() {
        calculatePages();
        if (totalPages <= 1) return;
        showPage((currentPage - 1 + totalPages) % totalPages, true);
        restartTimer();
    }

    function nextPage() {
        calculatePages();
        if (totalPages <= 1) return;
        showPage((currentPage + 1) % totalPages, true);
        restartTimer();
    }

    function restartTimer() {
        if (pageTimer) clearInterval(pageTimer);
        pageTimer = null;
        if (totalPages <= 1) return;
        pageTimer = setInterval(() => {
            calculatePages();
            showPage((currentPage + 1) % totalPages, true);
        }, PAGE_DURATION);
    }

    function loadHtml2Canvas() {
        if (typeof window.html2canvas === "function") return Promise.resolve();
        if (window.__html2canvasLoading) return window.__html2canvasLoading;

        window.__html2canvasLoading = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
            script.async = true;
            script.onload = () => {
                if (typeof window.html2canvas === "function") resolve();
                else reject(new Error("html2canvas chargé mais indisponible."));
            };
            script.onerror = () => {
                window.__html2canvasLoading = null;
                reject(new Error("Impossible de charger html2canvas."));
            };
            document.head.appendChild(script);
        });

        return window.__html2canvasLoading;
    }

    function setCaptureControlsHidden(hidden) {
        [
            document.getElementById("screenshotButton"),
            document.getElementById("previousPageButton"),
            document.getElementById("nextPageButton"),
            indicator
        ].filter(Boolean).forEach(element => {
            element.classList.toggle("captureHidden", hidden);
        });
    }

    async function captureScreen() {
        if (captureBusy) return;
        captureBusy = true;

        const button = document.getElementById("screenshotButton");

        try {
            if (button) {
                button.disabled = true;
                button.textContent = "⏳";
            }

            await loadHtml2Canvas();

            setCaptureControlsHidden(true);
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            const target = document.getElementById("screen") || document.body;
            const rect = target.getBoundingClientRect();

            const canvas = await window.html2canvas(target, {
                backgroundColor: null,
                scale: Math.max(1, window.devicePixelRatio || 1),
                useCORS: true,
                allowTaint: false,
                imageTimeout: 15000,
                logging: false,
                width: Math.ceil(rect.width),
                height: Math.ceil(rect.height),
                scrollX: 0,
                scrollY: 0,
                windowWidth: document.documentElement.clientWidth,
                windowHeight: document.documentElement.clientHeight
            });

            const filename = `affichage-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;

            canvas.toBlob(blob => {
                if (!blob) {
                    console.error("Impossible de créer le fichier PNG.");
                    return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }, "image/png");

        } catch (error) {
            console.error("Erreur lors de la capture :", error);
            alert("Impossible de réaliser la capture d'écran. Vérifiez la console du navigateur pour plus de détails.");
        } finally {
            setCaptureControlsHidden(false);
            if (button) {
                button.disabled = false;
                button.textContent = "📷";
            }
            captureBusy = false;
            restartTimer();
        }
    }

    const observer = new MutationObserver(() => {
        clearTimeout(mutationTimer);
        mutationTimer = setTimeout(() => {
            currentPage = 0;
            calculatePages();
            showPage(0, false);
            createControls();
            restartTimer();
        }, 100);
    });

    observer.observe(grid, { childList: true });

    createControls();
    calculatePages();
    showPage(0, false);
    restartTimer();

})();
