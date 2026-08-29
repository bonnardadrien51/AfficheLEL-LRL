(() => {

    /*
    ============================================================
    CONFIGURATION
    ============================================================
    */

    // Nombre maximum d'événements visibles par page
    const EVENTS_PER_PAGE = 6;

    // Temps entre deux changements automatiques
    const PAGE_DURATION = 10000;

    // Durée de l'animation
    const FADE_DURATION = 500;


    /*
    ============================================================
    VARIABLES
    ============================================================
    */

    let currentPage = 0;
    let totalPages = 1;

    let pageTimer = null;
    let mutationTimer = null;

    let html2canvasLoaded = false;
    let html2canvasLoading = null;


    /*
    ============================================================
    ÉLÉMENTS
    ============================================================
    */

    const grid =
        document.getElementById("eventGrid");

    const indicator =
        document.getElementById("pageIndicator");


    if (!grid) {

        console.error(
            "pagination.js : #eventGrid introuvable."
        );

        return;

    }


    /*
    ============================================================
    RÉCUPÉRATION DES ÉVÉNEMENTS
    ============================================================
    */

    function getEvents() {

        return Array.from(
            grid.querySelectorAll(".eventCard")
        );

    }


    /*
    ============================================================
    CALCUL DU NOMBRE DE PAGES
    ============================================================
    */

    function calculatePages() {

        const events = getEvents();

        totalPages = Math.max(
            1,
            Math.ceil(
                events.length /
                EVENTS_PER_PAGE
            )
        );


        if (currentPage >= totalPages) {

            currentPage = 0;

        }

    }


    /*
    ============================================================
    INDICATEUR DE PAGE
    ============================================================
    */

    function updateIndicator() {

        if (!indicator) {
            return;
        }


        /*
        S'il n'y a qu'une seule page,
        on ne montre pas le compteur.
        */

        if (totalPages <= 1) {

            indicator.innerHTML = "";

            return;

        }


        indicator.innerHTML = `

            <span class="pageNumber">
                ${currentPage + 1} / ${totalPages}
            </span>

        `;

    }


    /*
    ============================================================
    CRÉATION DES CONTRÔLES
    ============================================================
    */

    function createControls() {

        /*
        --------------------------------------------------------
        FLÈCHE GAUCHE
        --------------------------------------------------------
        */

        let previousButton =
            document.getElementById(
                "previousPageButton"
            );


        if (!previousButton) {

            previousButton =
                document.createElement("button");

            previousButton.id =
                "previousPageButton";

            previousButton.className =
                "pageArrow pageArrowLeft";

            previousButton.type =
                "button";

            previousButton.setAttribute(
                "aria-label",
                "Page précédente"
            );

            previousButton.innerHTML = "‹";

            document.body.appendChild(
                previousButton
            );


            previousButton.addEventListener(
                "click",
                previousPage
            );

        }


        /*
        --------------------------------------------------------
        FLÈCHE DROITE
        --------------------------------------------------------
        */

        let nextButton =
            document.getElementById(
                "nextPageButton"
            );


        if (!nextButton) {

            nextButton =
                document.createElement("button");

            nextButton.id =
                "nextPageButton";

            nextButton.className =
                "pageArrow pageArrowRight";

            nextButton.type =
                "button";

            nextButton.setAttribute(
                "aria-label",
                "Page suivante"
            );

            nextButton.innerHTML = "›";

            document.body.appendChild(
                nextButton
            );


            nextButton.addEventListener(
                "click",
                nextPage
            );

        }


        /*
        --------------------------------------------------------
        BOUTON CAPTURE
        --------------------------------------------------------
        */

        let screenshotButton =
            document.getElementById(
                "screenshotButton"
            );


        if (!screenshotButton) {

            screenshotButton =
                document.createElement("button");

            screenshotButton.id =
                "screenshotButton";

            screenshotButton.className =
                "screenshotButton";

            screenshotButton.type =
                "button";

            screenshotButton.setAttribute(
                "aria-label",
                "Faire une capture d'écran"
            );

            screenshotButton.title =
                "Capture d'écran";

            screenshotButton.innerHTML = "📷";

            document.body.appendChild(
                screenshotButton
            );


            screenshotButton.addEventListener(
                "click",
                captureScreen
            );

        }

    }


    /*
    ============================================================
    AFFICHAGE D'UNE PAGE
    ============================================================
    */

    function showPage(
        page,
        animate = false
    ) {

        const events = getEvents();

        calculatePages();


        if (!events.length) {

            if (indicator) {
                indicator.innerHTML = "";
            }

            return;

        }


        /*
        Sécurité
        */

        if (
            page < 0 ||
            page >= totalPages
        ) {

            page = 0;

        }


        currentPage = page;


        /*
        Cacher tous les événements
        */

        events.forEach(
            event => {

                event.style.display =
                    "none";

            }
        );


        /*
        Déterminer les événements
        de la page actuelle
        */

        const start =
            currentPage *
            EVENTS_PER_PAGE;

        const end =
            start +
            EVENTS_PER_PAGE;


        const visibleEvents =
            events.slice(
                start,
                end
            );


        visibleEvents.forEach(
            event => {

                event.style.display =
                    "";

            }
        );


        /*
        Mise à jour du compteur
        */

        updateIndicator();


        /*
        Animation
        */

        if (animate) {

            grid.classList.remove(
                "pagination-visible"
            );

            grid.classList.add(
                "pagination-hidden"
            );


            setTimeout(
                () => {

                    grid.classList.remove(
                        "pagination-hidden"
                    );

                    grid.classList.add(
                        "pagination-visible"
                    );

                },
                FADE_DURATION
            );

        }

    }


    /*
    ============================================================
    PAGE PRÉCÉDENTE
    ============================================================
    */

    function previousPage() {

        calculatePages();


        if (totalPages <= 1) {
            return;
        }


        const previous =
            (
                currentPage -
                1 +
                totalPages
            ) % totalPages;


        showPage(
            previous,
            true
        );


        restartTimer();

    }


    /*
    ============================================================
    PAGE SUIVANTE
    ============================================================
    */

    function nextPage() {

        calculatePages();


        if (totalPages <= 1) {
            return;
        }


        const next =
            (
                currentPage +
                1
            ) % totalPages;


        showPage(
            next,
            true
        );


        restartTimer();

    }


    /*
    ============================================================
    TIMER AUTOMATIQUE
    ============================================================
    */

    function restartTimer() {

        if (pageTimer) {

            clearInterval(
                pageTimer
            );

        }


        /*
        Une seule page :
        inutile de lancer le timer.
        */

        if (totalPages <= 1) {

            pageTimer = null;

            return;

        }


        pageTimer =
            setInterval(
                () => {

                    calculatePages();

                    const next =
                        (
                            currentPage +
                            1
                        ) % totalPages;


                    showPage(
                        next,
                        true
                    );

                },
                PAGE_DURATION
            );

    }


    /*
    ============================================================
    CHARGEMENT DE HTML2CANVAS
    ============================================================
    */

    function loadHtml2Canvas() {

        /*
        Déjà chargé
        */

        if (
            html2canvasLoaded &&
            typeof window.html2canvas ===
                "function"
        ) {

            return Promise.resolve();

        }


        /*
        Chargement déjà en cours
        */

        if (html2canvasLoading) {

            return html2canvasLoading;

        }


        html2canvasLoading =
            new Promise(
                (resolve, reject) => {

                    const script =
                        document.createElement(
                            "script"
                        );


                    script.src =
                        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";


                    script.onload =
                        () => {

                            html2canvasLoaded =
                                true;

                            resolve();

                        };


                    script.onerror =
                        () => {

                            html2canvasLoading =
                                null;

                            reject(
                                new Error(
                                    "Impossible de charger html2canvas."
                                )
                            );

                        };


                    document.head.appendChild(
                        script
                    );

                }
            );


        return html2canvasLoading;

    }


    /*
    ============================================================
    CAPTURE D'ÉCRAN
    ============================================================
    */

    async function captureScreen() {

        const button =
            document.getElementById(
                "screenshotButton"
            );

        const previousButton =
            document.getElementById(
                "previousPageButton"
            );

        const nextButton =
            document.getElementById(
                "nextPageButton"
            );


        try {

            /*
            ----------------------------------------------------
            Désactiver le bouton pendant la capture
            ----------------------------------------------------
            */

            if (button) {

                button.disabled = true;

                button.innerHTML = "⏳";

            }


            /*
            ----------------------------------------------------
            Charger html2canvas
            ----------------------------------------------------
            */

            await loadHtml2Canvas();


            /*
            ----------------------------------------------------
            Masquer temporairement les contrôles
            ----------------------------------------------------
            */

            if (button) {

                button.classList.add(
                    "captureHidden"
                );

            }

            if (previousButton) {

                previousButton.classList.add(
                    "captureHidden"
                );

            }

            if (nextButton) {

                nextButton.classList.add(
                    "captureHidden"
                );

            }

            if (indicator) {

                indicator.classList.add(
                    "captureHidden"
                );

            }


            /*
            ----------------------------------------------------
            Petite pause pour laisser le navigateur
            appliquer le masquage
            ----------------------------------------------------
            */

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        100
                    )
            );


            /*
            ----------------------------------------------------
            Capture de la page
            ----------------------------------------------------
            */

            const canvas =
                await window.html2canvas(
                    document.body,
                    {

                        backgroundColor:
                            null,

                        scale:
                            window.devicePixelRatio ||
                            1,

                        useCORS:
                            true,

                        allowTaint:
                            false,

                        logging:
                            false,

                        width:
                            document.documentElement
                                .clientWidth,

                        height:
                            document.documentElement
                                .clientHeight,

                        windowWidth:
                            document.documentElement
                                .clientWidth,

                        windowHeight:
                            document.documentElement
                                .clientHeight

                    }
                );


            /*
            ----------------------------------------------------
            Conversion PNG
            ----------------------------------------------------
            */

            const image =
                canvas.toDataURL(
                    "image/png"
                );


            /*
            ----------------------------------------------------
            Téléchargement
            ----------------------------------------------------
            */

            const now =
                new Date();


            const year =
                now.getFullYear();

            const month =
                String(
                    now.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                );

            const day =
                String(
                    now.getDate()
                ).padStart(
                    2,
                    "0"
                );

            const hours =
                String(
                    now.getHours()
                ).padStart(
                    2,
                    "0"
                );

            const minutes =
                String(
                    now.getMinutes()
                ).padStart(
                    2,
                    "0"
                );

            const seconds =
                String(
                    now.getSeconds()
                ).padStart(
                    2,
                    "0"
                );


            const filename =
                `affichage-${year}-${month}-${day}-${hours}-${minutes}-${seconds}.png`;


            const link =
                document.createElement(
                    "a"
                );

            link.download =
                filename;

            link.href =
                image;

            link.click();


        }
        catch (error) {

            console.error(
                "Erreur lors de la capture :",
                error
            );


            alert(
                "Impossible de réaliser la capture d'écran."
            );

        }
        finally {

            /*
            ----------------------------------------------------
            Réafficher les contrôles
            ----------------------------------------------------
            */

            if (button) {

                button.classList.remove(
                    "captureHidden"
                );

                button.disabled =
                    false;

                button.innerHTML =
                    "📷";

            }


            if (previousButton) {

                previousButton.classList.remove(
                    "captureHidden"
                );

            }


            if (nextButton) {

                nextButton.classList.remove(
                    "captureHidden"
                );

            }


            if (indicator) {

                indicator.classList.remove(
                    "captureHidden"
                );

            }


            /*
            Le timer repart après la capture.
            */

            restartTimer();

        }

    }


    /*
    ============================================================
    OBSERVATION DES MODIFICATIONS
    ============================================================
    */

    const observer =
        new MutationObserver(
            () => {

                clearTimeout(
                    mutationTimer
                );


                mutationTimer =
                    setTimeout(
                        () => {

                            currentPage = 0;

                            calculatePages();


                            showPage(
                                0,
                                false
                            );


                            createControls();

                            restartTimer();

                        },
                        50
                    );

            }
        );


    observer.observe(
        grid,
        {
            childList: true
        }
    );


    /*
    ============================================================
    CSS
    ============================================================
    */

    const style =
        document.createElement(
            "style"
        );


    style.textContent = `

        /*
        ========================================================
        ANIMATION
        ========================================================
        */

        #eventGrid {

            transition:
                opacity
                ${FADE_DURATION}ms
                ease;

        }


        #eventGrid.pagination-hidden {

            opacity: 0;

        }


        #eventGrid.pagination-visible {

            opacity: 1;

        }


        /*
        ========================================================
        COMPTEUR DE PAGE
        ========================================================
        */

        #pageIndicator {

            position: fixed;

            right: 2vw;
            bottom: 1.5vh;

            display: flex;

            align-items: center;

            justify-content: center;

            font-family:
                "Baloo 2",
                "Segoe UI",
                Arial,
                sans-serif;

            font-size: 1.2vw;

            font-weight: 700;

            color: white;

            opacity: 0.65;

            z-index: 1000;

            pointer-events: none;

        }


        #pageIndicator .pageNumber {

            min-width: 3vw;

            text-align: center;

            white-space: nowrap;

        }


        /*
        ========================================================
        FLÈCHES LATÉRALES
        ========================================================
        */

        .pageArrow {

            position: fixed;

            top: 50%;

            transform:
                translateY(-50%);

            width: 3vw;

            height: 8vh;

            padding: 0;

            border: none;

            background: transparent;

            color: white;

            font-family:
                "Baloo 2",
                "Segoe UI",
                Arial,
                sans-serif;

            font-size: 4vw;

            font-weight: 700;

            line-height: 1;

            cursor: pointer;

            opacity: 0.25;

            z-index: 1001;

            transition:
                opacity 0.2s ease,
                transform 0.2s ease;

        }


        .pageArrow:hover {

            opacity: 0.9;

        }


        .pageArrow:active {

            opacity: 1;

        }


        .pageArrowLeft {

            left: 0.5vw;

        }


        .pageArrowRight {

            right: 0.5vw;

        }


        /*
        ========================================================
        BOUTON CAPTURE
        ========================================================
        */

        .screenshotButton {

            position: fixed;

            right: 0.8vw;

            bottom: 1.2vh;

            width: 2.2vw;

            height: 2.2vw;

            min-width: 28px;

            min-height: 28px;

            padding: 0;

            border: 1px solid
                rgba(
                    255,
                    255,
                    255,
                    0.25
                );

            border-radius: 5px;

            background:
                rgba(
                    0,
                    0,
                    0,
                    0.25
                );

            color: white;

            font-size: 1vw;

            line-height: 1;

            display: flex;

            align-items: center;

            justify-content: center;

            cursor: pointer;

            opacity: 0.35;

            z-index: 1002;

            transition:
                opacity 0.2s ease,
                transform 0.2s ease,
                background 0.2s ease;

        }


        .screenshotButton:hover {

            opacity: 0.9;

            background:
                rgba(
                    0,
                    0,
                    0,
                    0.55
                );

            transform:
                scale(1.08);

        }


        .screenshotButton:active {

            transform:
                scale(0.95);

        }


        .screenshotButton:disabled {

            cursor:
                wait;

        }


        /*
        ========================================================
        MASQUAGE POUR LA CAPTURE
        ========================================================
        */

        .captureHidden {

            display: none !important;

        }

    `;


    document.head.appendChild(
        style
    );


    /*
    ============================================================
    INITIALISATION
    ============================================================
    */

    function init() {

        calculatePages();

        createControls();

        showPage(
            0,
            false
        );

        restartTimer();

    }


    init();

})();
