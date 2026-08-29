/* ============================================================
   GÉNÉRATEUR D'ÉVÉNEMENTS
   AfficheLEL-LRL

   Gestion des templates via GitHub API
   Même token que admin.js : localStorage / gh_token
============================================================ */


const GITHUB_OWNER =
    "bonnardadrien51";

const GITHUB_REPO =
    "AfficheLEL-LRL";

const TEMPLATES_PATH =
    "templates/templates.json";


/* ============================================================
   CHAMPS DU FORMULAIRE
============================================================ */

const FIELDS = [

    "titre",
    "image",
    "logo",
    "logo_fond",
    "fond",
    "tarif",
    "inscription",
    "lien_inscription",
    "statut",
    "lieu",
    "affichage_lieu"

];


/* ============================================================
   VARIABLES
============================================================ */

let templatesData = {
    templates: []
};

let templatesSha = null;

let currentTemplateId = "";


/* ============================================================
   TOKEN
============================================================ */

function getToken() {

    return (
        localStorage.getItem(
            "gh_token"
        ) || ""
    );

}


function setToken(token) {

    if (token) {

        localStorage.setItem(
            "gh_token",
            token
        );

    } else {

        localStorage.removeItem(
            "gh_token"
        );

    }

    refreshTokenStatus();

}


/* ============================================================
   AFFICHAGE TOKEN
============================================================ */

function refreshTokenStatus() {

    const status =
        document.getElementById(
            "tokenStatus"
        );

    if (!status) {
        return;
    }

    status.textContent =
        getToken()
            ? "Token enregistré ✓"
            : "Aucun token enregistré";

}


/* ============================================================
   BASE64 UTF-8
============================================================ */

function utf8ToBase64(str) {

    return btoa(
        unescape(
            encodeURIComponent(
                str
            )
        )
    );

}


function base64ToUtf8(str) {

    return decodeURIComponent(
        escape(
            atob(
                str.replace(
                    /\n/g,
                    ""
                )
            )
        )
    );

}


/* ============================================================
   HEADERS GITHUB
============================================================ */

function githubHeaders() {

    const headers = {

        "Accept":
            "application/vnd.github+json",

        "X-GitHub-Api-Version":
            "2022-11-28"

    };


    const token =
        getToken();


    if (token) {

        headers[
            "Authorization"
        ] =
            "Bearer " + token;

    }


    return headers;

}


/* ============================================================
   URL FICHIER GITHUB
============================================================ */

function githubFileUrl(path) {

    return (
        "https://api.github.com/repos/" +
        GITHUB_OWNER +
        "/" +
        GITHUB_REPO +
        "/contents/" +
        path
    );

}


/* ============================================================
   LIRE LE FICHIER TEMPLATES
============================================================ */

async function githubGetTemplates() {


    const response =
        await fetch(
            githubFileUrl(
                TEMPLATES_PATH
            ) +
            "?t=" +
            Date.now(),
            {
                method: "GET",
                headers:
                    githubHeaders()
            }
        );


    if (response.status === 404) {

        return {

            content: {
                templates: []
            },

            sha: null

        };

    }


    if (!response.ok) {

        const text =
            await response.text();

        throw new Error(
            "Impossible de lire templates.json (" +
            response.status +
            ") " +
            text
        );

    }


    const data =
        await response.json();


    let content;


    try {

        content =
            JSON.parse(
                base64ToUtf8(
                    data.content
                )
            );

    } catch (error) {

        throw new Error(
            "templates.json contient un JSON invalide."
        );

    }


    if (
        !content ||
        !Array.isArray(
            content.templates
        )
    ) {

        content = {
            templates: []
        };

    }


    return {

        content,
        sha:
            data.sha

    };

}


/* ============================================================
   SAUVEGARDER TEMPLATES SUR GITHUB
============================================================ */

async function githubSaveTemplates(
    content,
    sha
) {


    const token =
        getToken();


    if (!token) {

        throw new Error(
            "Aucun token GitHub. Enregistre ton token avant de sauvegarder."
        );

    }


    const body = {

        message:
            "🎨 Mise à jour des templates du générateur",

        content:
            utf8ToBase64(
                JSON.stringify(
                    content,
                    null,
                    2
                )
            )

    };


    /*
       Si le fichier existe,
       GitHub exige son SHA.
    */

    if (sha) {

        body.sha =
            sha;

    }


    const response =
        await fetch(
            githubFileUrl(
                TEMPLATES_PATH
            ),
            {

                method:
                    "PUT",

                headers: {

                    ...githubHeaders(),

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify(
                        body
                    )

            }
        );


    if (!response.ok) {

        const text =
            await response.text();

        throw new Error(
            "Erreur GitHub lors de la sauvegarde (" +
            response.status +
            ") : " +
            text
        );

    }


    const result =
        await response.json();


    templatesSha =
        result.content
            ? result.content.sha
            : sha;


    return result;

}


/* ============================================================
   CHARGER LES TEMPLATES
============================================================ */

async function loadTemplates() {


    const status =
        document.getElementById(
            "templateStatus"
        );


    status.textContent =
        "Chargement des templates…";


    try {


        const result =
            await githubGetTemplates();


        templatesData =
            result.content;

        templatesSha =
            result.sha;


        populateTemplateSelect();


        status.textContent =

            templatesData.templates.length

                ? templatesData.templates.length +
                  " template(s) disponible(s)."

                : "Aucun template enregistré.";


    } catch (error) {


        console.error(
            error
        );


        status.textContent =
            "Impossible de charger les templates : " +
            error.message;


    }

}


/* ============================================================
   LISTE DES TEMPLATES
============================================================ */

function populateTemplateSelect() {


    const select =
        document.getElementById(
            "templateSelect"
        );


    select.innerHTML = "";


    const emptyOption =
        document.createElement(
            "option"
        );


    emptyOption.value =
        "";

    emptyOption.textContent =
        "— Aucun template —";


    select.appendChild(
        emptyOption
    );


    templatesData.templates
        .forEach(
            template => {


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    template.id;


                option.textContent =
                    template.nom ||
                    template.id;


                select.appendChild(
                    option
                );


            }
        );


}


/* ============================================================
   RÉCUPÉRER LES VALEURS DU FORMULAIRE
============================================================ */

function getFormData() {


    const data = {};


    FIELDS.forEach(
        field => {


            const element =
                document.getElementById(
                    "f_" + field
                );


            if (!element) {
                return;
            }


            data[field] =
                element.value.trim();


        }
    );


    return data;

}


/* ============================================================
   REMPLIR LE FORMULAIRE
============================================================ */

function setFormData(
    data
) {


    FIELDS.forEach(
        field => {


            const element =
                document.getElementById(
                    "f_" + field
                );


            if (!element) {
                return;
            }


            element.value =
                data &&
                data[field] !== undefined
                    ? data[field]
                    : "";


        }
    );


    generateJSON();

}


/* ============================================================
   GÉNÉRATION DU JSON
============================================================ */

function generateJSON() {


    const data =
        getFormData();


    document.getElementById(
        "jsonOutput"
    ).textContent =

        JSON.stringify(
            data,
            null,
            2
        );


    updateQRCode(
        data.lien_inscription
    );

}


/* ============================================================
   QR CODE
============================================================ */

function updateQRCode(
    url
) {


    const panel =
        document.getElementById(
            "qrPanel"
        );

    const container =
        document.getElementById(
            "qrcode"
        );

    const link =
        document.getElementById(
            "qrLink"
        );


    container.innerHTML =
        "";

    link.textContent =
        "";

    link.removeAttribute(
        "href"
    );


    if (!url) {

        panel.classList.add(
            "hidden"
        );

        return;

    }


    try {

        new URL(
            url
        );

    } catch (error) {

        panel.classList.add(
            "hidden"
        );

        return;

    }


    panel.classList.remove(
        "hidden"
    );


    link.href =
        url;

    link.textContent =
        url;


    if (
        typeof QRCode ===
        "undefined"
    ) {

        container.textContent =
            "QRCode.js n'est pas disponible.";

        return;

    }


    new QRCode(
        container,
        {

            text:
                url,

            width:
                200,

            height:
                200,

            correctLevel:
                QRCode.CorrectLevel.H

        }
    );


}


/* ============================================================
   CHARGER UN TEMPLATE DANS LE FORMULAIRE
============================================================ */

function loadSelectedTemplate() {


    const id =
        document.getElementById(
            "templateSelect"
        ).value;


    if (!id) {

        currentTemplateId =
            "";

        return;

    }


    const template =
        templatesData.templates
            .find(
                item =>
                    item.id ===
                    id
            );


    if (!template) {

        showMessage(
            "Template introuvable.",
            true
        );

        return;

    }


    currentTemplateId =
        template.id;


    setFormData(
        template.valeurs || {}
    );


    showMessage(
        "Template « " +
        (
            template.nom ||
            template.id
        ) +
        " » chargé."
    );

}


/* ============================================================
   NOM DE TEMPLATE
============================================================ */

function askTemplateName(
    defaultName = ""
) {


    const name =
        prompt(
            "Nom du template :",
            defaultName
        );


    if (
        name === null
    ) {

        return null;

    }


    const clean =
        name.trim();


    if (!clean) {

        alert(
            "Le nom du template ne peut pas être vide."
        );

        return null;

    }


    return clean;

}


/* ============================================================
   ID À PARTIR DU NOM
============================================================ */

function slugify(
    text
) {


    return text

        .normalize(
            "NFD"
        )

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .toLowerCase()

        .replace(
            /[^a-z0-9]+/g,
            "-"
        )

        .replace(
            /^-+|-+$/g,
            ""
        );

}


/* ============================================================
   ENREGISTRER COMME NOUVEAU TEMPLATE
============================================================ */

async function saveAsTemplate() {


    const name =
        askTemplateName();


    if (!name) {
        return;
    }


    let id =
        slugify(
            name
        );


    if (!id) {

        alert(
            "Impossible de créer un identifiant."
        );

        return;

    }


    /*
       Évite les doublons.
    */

    const existing =
        templatesData.templates
            .find(
                template =>
                    template.id ===
                    id
            );


    if (existing) {

        if (
            !confirm(
                "Un template portant ce nom existe déjà. Le remplacer ?"
            )
        ) {

            return;

        }


        templatesData.templates =
            templatesData.templates
                .filter(
                    template =>
                        template.id !==
                        id
                );

    }


    const template = {

        id,

        nom:
            name,

        valeurs:
            getFormData()

    };


    templatesData.templates.push(
        template
    );


    await saveTemplatesToGitHub();


    currentTemplateId =
        id;


    populateTemplateSelect();


    document.getElementById(
        "templateSelect"
    ).value =
        id;


    showMessage(
        "Template « " +
        name +
        " » enregistré sur GitHub."
    );

}


/* ============================================================
   MODIFIER LE TEMPLATE ACTUEL
============================================================ */

async function saveCurrentTemplate() {


    if (!currentTemplateId) {

        /*
           Si aucun template n'est sélectionné,
           on propose directement un nouveau.
        */

        await saveAsTemplate();

        return;

    }


    const template =
        templatesData.templates
            .find(
                item =>
                    item.id ===
                    currentTemplateId
            );


    if (!template) {

        await saveAsTemplate();

        return;

    }


    template.valeurs =
        getFormData();


    await saveTemplatesToGitHub();


    showMessage(
        "Template « " +
        (
            template.nom ||
            template.id
        ) +
        " » mis à jour."
    );

}


/* ============================================================
   SUPPRIMER TEMPLATE
============================================================ */

async function deleteCurrentTemplate() {


    const id =
        document.getElementById(
            "templateSelect"
        ).value;


    if (!id) {

        alert(
            "Sélectionne d'abord un template."
        );

        return;

    }


    const template =
        templatesData.templates
            .find(
                item =>
                    item.id ===
                    id
            );


    if (!template) {
        return;
    }


    if (
        !confirm(
            "Supprimer le template « " +
            (
                template.nom ||
                id
            ) +
            " » ?"
        )
    ) {

        return;

    }


    templatesData.templates =
        templatesData.templates
            .filter(
                item =>
                    item.id !==
                    id
            );


    await saveTemplatesToGitHub();


    currentTemplateId =
        "";


    populateTemplateSelect();


    showMessage(
        "Template supprimé."
    );

}


/* ============================================================
   SAUVEGARDE GITHUB
============================================================ */

async function saveTemplatesToGitHub() {


    const status =
        document.getElementById(
            "templateStatus"
        );


    status.textContent =
        "Sauvegarde sur GitHub…";


    try {


        const result =
            await githubSaveTemplates(
                templatesData,
                templatesSha
            );


        /*
           Après le commit on recharge le SHA.
        */

        templatesSha =
            result.content
                ? result.content.sha
                : templatesSha;


        status.textContent =
            "Templates sauvegardés sur GitHub ✓";


    } catch (error) {


        console.error(
            error
        );


        status.textContent =
            "Erreur de sauvegarde : " +
            error.message;


        throw error;

    }

}


/* ============================================================
   TOKEN SAVE
============================================================ */

document
    .getElementById(
        "tokenSave"
    )
    .addEventListener(
        "click",
        async () => {


            const input =
                document.getElementById(
                    "tokenInput"
                );


            const token =
                input.value.trim();


            if (!token) {

                alert(
                    "Entre ton token GitHub."
                );

                return;

            }


            setToken(
                token
            );


            input.value =
                "";


            await loadTemplates();

        }
    );


/* ============================================================
   TOKEN CLEAR
============================================================ */

document
    .getElementById(
        "tokenClear"
    )
    .addEventListener(
        "click",
        () => {


            if (
                confirm(
                    "Supprimer le token enregistré sur cet appareil ?"
                )
            ) {

                setToken("");

                document.getElementById(
                    "templateStatus"
                ).textContent =
                    "Token supprimé. Les templates restent consultables.";

            }

        }
    );


/* ============================================================
   TEMPLATE LOAD
============================================================ */

document
    .getElementById(
        "loadTemplateBtn"
    )
    .addEventListener(
        "click",
        loadSelectedTemplate
    );


/* ============================================================
   TEMPLATE SAVE
============================================================ */

document
    .getElementById(
        "saveTemplateBtn"
    )
    .addEventListener(
        "click",
        async () => {

            try {

                await saveCurrentTemplate();

            } catch (error) {

                alert(
                    error.message
                );

            }

        }
    );


/* ============================================================
   TEMPLATE SAVE AS
============================================================ */

document
    .getElementById(
        "saveAsTemplateBtn"
    )
    .addEventListener(
        "click",
        async () => {

            try {

                await saveAsTemplate();

            } catch (error) {

                alert(
                    error.message
                );

            }

        }
    );


/* ============================================================
   TEMPLATE DELETE
============================================================ */

document
    .getElementById(
        "deleteTemplateBtn"
    )
    .addEventListener(
        "click",
        async () => {

            try {

                await deleteCurrentTemplate();

            } catch (error) {

                alert(
                    error.message
                );

            }

        }
    );


/* ============================================================
   SÉLECTION TEMPLATE
============================================================ */

document
    .getElementById(
        "templateSelect"
    )
    .addEventListener(
        "change",
        () => {

            currentTemplateId =
                document.getElementById(
                    "templateSelect"
                ).value;

        }
    );


/* ============================================================
   PRESETS INSCRIPTION
============================================================ */

document
    .querySelectorAll(
        ".preset"
    )
    .forEach(
        button => {


            button.addEventListener(
                "click",
                () => {


                    document.getElementById(
                        "f_inscription"
                    ).value =
                        button.dataset.value;


                    generateJSON();

                }
            );


        }
    );


/* ============================================================
   ÉCOUTE DES CHAMPS
============================================================ */

FIELDS.forEach(
    field => {


        const element =
            document.getElementById(
                "f_" + field
            );


        if (!element) {
            return;
        }


        element.addEventListener(
            "input",
            generateJSON
        );


        element.addEventListener(
            "change",
            generateJSON
        );


    }
);


/* ============================================================
   COPIER JSON
============================================================ */

document
    .getElementById(
        "copyBtn"
    )
    .addEventListener(
        "click",
        async () => {


            const text =
                document.getElementById(
                    "jsonOutput"
                ).textContent;


            try {


                await navigator
                    .clipboard
                    .writeText(
                        text
                    );


                showMessage(
                    "JSON copié dans le presse-papiers."
                );


            } catch (error) {


                const textarea =
                    document.createElement(
                        "textarea"
                    );


                textarea.value =
                    text;


                document.body.appendChild(
                    textarea
                );


                textarea.select();


                document.execCommand(
                    "copy"
                );


                textarea.remove();


                showMessage(
                    "JSON copié."
                );

            }

        }
    );


/* ============================================================
   RESET
============================================================ */

document
    .getElementById(
        "resetBtn"
    )
    .addEventListener(
        "click",
        () => {


            if (
                !confirm(
                    "Réinitialiser tous les champs ?"
                )
            ) {

                return;

            }


            FIELDS.forEach(
                field => {


                    const element =
                        document.getElementById(
                            "f_" + field
                        );


                    if (element) {

                        element.value =
                            "";

                    }


                }
            );


            document.getElementById(
                "f_affichage_lieu"
            ).value =
                "3";


            currentTemplateId =
                "";


            document.getElementById(
                "templateSelect"
            ).value =
                "";


            generateJSON();

        }
    );


/* ============================================================
   MESSAGE
============================================================ */

function showMessage(
    text,
    error = false
) {


    const element =
        document.getElementById(
            "message"
        );


    element.textContent =
        text;


    element.classList.remove(
        "hidden"
    );


    element.style.background =
        error
            ? "rgba(232,93,117,.25)"
            : "rgba(114,213,114,.20)";


    setTimeout(
        () => {

            element.classList.add(
                "hidden"
            );

        },
        4000
    );

}


/* ============================================================
   INITIALISATION
============================================================ */

refreshTokenStatus();

generateJSON();

loadTemplates();
