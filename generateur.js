javascript
/*
============================================================
 GÉNÉRATEUR JSON ÉVÉNEMENT
 AfficheLEL-LRL
============================================================
*/


const fields = [

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


/*
============================================================
 RÉCUPÉRATION D'UN CHAMP
============================================================
*/

function getValue(name) {

    const element =
        document.getElementById(
            "f_" + name
        );

    if (!element) {
        return "";
    }

    return element.value.trim();

}


/*
============================================================
 GÉNÉRATION DU JSON
============================================================
*/

function generate() {


    const data = {};


    fields.forEach(
        name => {

            data[name] =
                getValue(name);

        }
    );


    document.getElementById(
        "output"
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


/*
============================================================
 COULEUR DU LOGO
============================================================
*/


const logoPicker =
    document.getElementById(
        "f_logo_fond_picker"
    );


const logoColor =
    document.getElementById(
        "f_logo_fond"
    );


logoPicker.addEventListener(
    "input",
    event => {

        logoColor.value =
            event.target.value;

        generate();

    }
);


logoColor.addEventListener(
    "input",
    event => {


        const value =
            event.target.value.trim();


        if (
            /^#[0-9a-fA-F]{6}$/
                .test(value)
        ) {

            logoPicker.value =
                value;

        }


        generate();

    }
);


/*
============================================================
 ÉCOUTE DES CHAMPS
============================================================
*/


fields.forEach(
    name => {


        const element =
            document.getElementById(
                "f_" + name
            );


        if (!element) {
            return;
        }


        element.addEventListener(
            "input",
            generate
        );


        element.addEventListener(
            "change",
            generate
        );


    }
);


/*
============================================================
 BOUTONS DE TEXTE D'INSCRIPTION
============================================================
*/


document
    .querySelectorAll(
        "[data-inscription]"
    )
    .forEach(
        button => {


            button.addEventListener(
                "click",
                () => {


                    document.getElementById(
                        "f_inscription"
                    ).value =

                        button.dataset
                            .inscription;


                    generate();


                }
            );


        }
    );


/*
============================================================
 QR CODE
============================================================
*/


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


    /*
    Vérification simple de l'URL
    */

    try {

        new URL(url);

    }

    catch (error) {

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


    /*
    QRCode.js
    */

    if (
        typeof QRCode ===
        "undefined"
    ) {

        container.textContent =
            "Impossible de charger le générateur de QR code.";

        return;

    }


    new QRCode(
        container,
        {

            text: url,

            width: 200,

            height: 200,

            correctLevel:
                QRCode.CorrectLevel.H

        }
    );


}


/*
============================================================
 COPIER LE JSON
============================================================
*/


document
    .getElementById(
        "copyBtn"
    )
    .addEventListener(
        "click",
        async () => {


            const text =
                document.getElementById(
                    "output"
                ).textContent;


            const button =
                document.getElementById(
                    "copyBtn"
                );


            try {


                await navigator
                    .clipboard
                    .writeText(
                        text
                    );


            }

            catch (error) {


                /*
                Solution de secours pour
                les navigateurs qui bloquent
                navigator.clipboard.
                */


                const textarea =
                    document.createElement(
                        "textarea"
                    );


                textarea.value =
                    text;


                textarea.style.position =
                    "fixed";


                textarea.style.opacity =
                    "0";


                document.body.appendChild(
                    textarea
                );


                textarea.focus();


                textarea.select();


                document.execCommand(
                    "copy"
                );


                document.body.removeChild(
                    textarea
                );


            }


            const original =
                button.textContent;


            button.textContent =
                "✓ Copié !";


            button.classList.add(
                "copied"
            );


            setTimeout(
                () => {

                    button.textContent =
                        original;

                    button.classList.remove(
                        "copied"
                    );

                },

                1500
            );


        }
    );


/*
============================================================
 RÉINITIALISER
============================================================
*/


document
    .getElementById(
        "resetBtn"
    )
    .addEventListener(
        "click",
        () => {


            fields.forEach(
                name => {


                    const element =
                        document.getElementById(
                            "f_" + name
                        );


                    if (!element) {
                        return;
                    }


                    if (
                        element.tagName ===
                        "SELECT"
                    ) {


                        if (
                            name ===
                            "affichage_lieu"
                        ) {

                            element.value =
                                "3";

                        }

                        else {

                            element.value =
                                "";

                        }

                    }

                    else {

                        element.value =
                            "";

                    }


                }
            );


            document.getElementById(
                "f_logo_fond_picker"
            ).value =
                "#ffffff";


            document.getElementById(
                "f_logo_fond"
            ).value =
                "";


            generate();


        }
    );


/*
============================================================
 GÉNÉRATION INITIALE
============================================================
*/


generate();
