const fields = [
    {
        id: "titre",
        label: "Titre général",
        type: "text",
        placeholder: "Ex : Livres dans la boucle"
    },
    {
        id: "sous_titre",
        label: "Sous-titre",
        type: "text",
        placeholder: "Ex : Escape Game : Madame Chouette"
    },
    {
        id: "image",
        label: "Image",
        type: "text",
        placeholder: "URL ou chemin de l'image"
    },
    {
        id: "logo",
        label: "Logo",
        type: "text",
        placeholder: "URL ou chemin du logo"
    },
    {
        id: "logo_fond",
        label: "Fond du logo",
        type: "text",
        placeholder: "#ffffff"
    },
    {
        id: "fond",
        label: "Fond",
        type: "text",
        placeholder: "URL ou chemin du fond"
    },
    {
        id: "tarif",
        label: "Tarif",
        type: "text",
        placeholder: "Ex : Gratuit"
    },
    {
        id: "inscription",
        label: "Inscription",
        type: "text",
        placeholder: "Ex : Réservation conseillée"
    },
    {
        id: "lien_inscription",
        label: "Lien d'inscription",
        type: "url",
        placeholder: "https://..."
    },
    {
        id: "statut",
        label: "Statut",
        type: "text",
        placeholder: "Ex : COMPLET"
    },
    {
        id: "lieu",
        label: "Lieu",
        type: "text",
        placeholder: "Ex : Maison Saint-Vincent"
    },
    {
        id: "affichage_lieu",
        label: "Affichage du lieu",
        type: "text",
        placeholder: "1, 2, 3..."
    }
];

const form = document.getElementById("generatorForm");
const output = document.getElementById("output");
const preview = document.getElementById("preview");

const logoPicker = document.getElementById("logoPicker");
const logoColor = document.getElementById("logoColor");


// ---------------------------------------------------------
// Création automatique des champs
// ---------------------------------------------------------

function createFields() {

    if (!form) return;

    form.innerHTML = "";

    fields.forEach(field => {

        const wrapper = document.createElement("div");
        wrapper.className = "field";

        const label = document.createElement("label");
        label.htmlFor = `f_${field.id}`;
        label.textContent = field.label;

        const input = document.createElement("input");

        input.id = `f_${field.id}`;
        input.name = field.id;
        input.type = field.type || "text";
        input.placeholder = field.placeholder || "";

        wrapper.appendChild(label);
        wrapper.appendChild(input);

        form.appendChild(wrapper);
    });

    addInscriptionPresets();
}


// ---------------------------------------------------------
// Boutons inscription
// ---------------------------------------------------------

function addInscriptionPresets() {

    const inscriptionInput = document.getElementById("f_inscription");

    if (!inscriptionInput) return;

    const container = document.createElement("div");
    container.className = "inscription-presets";

    const title = document.createElement("div");
    title.textContent = "Raccourcis inscription";
    title.className = "preset-title";

    container.appendChild(title);

    const presets = [
        "Réservation conseillée",
        "Réservation obligatoire",
        "Réservation sur place et en ligne",
        ""
    ];

    presets.forEach(value => {

        const button = document.createElement("button");

        button.type = "button";

        button.textContent =
            value === ""
                ? "Effacer"
                : value;

        button.dataset.inscription = value;

        button.addEventListener("click", () => {

            inscriptionInput.value = value;

            generate();

        });

        container.appendChild(button);
    });

    inscriptionInput.parentElement.appendChild(container);
}


// ---------------------------------------------------------
// Récupération des données
// ---------------------------------------------------------

function getData() {

    const data = {};

    fields.forEach(field => {

        const input = document.getElementById(`f_${field.id}`);

        if (!input) return;

        data[field.id] = input.value.trim();
    });

    return data;
}


// ---------------------------------------------------------
// Génération JSON
// ---------------------------------------------------------

function generate() {

    const data = getData();

    output.value = JSON.stringify(data, null, 2);

    updatePreview(data);

    updateQRCode(data.lien_inscription);
}


// ---------------------------------------------------------
// Prévisualisation
// ---------------------------------------------------------

function updatePreview(data) {

    if (!preview) return;

    preview.innerHTML = "";

    const title = document.createElement("h2");

    title.textContent =
        data.titre ||
        data.sous_titre ||
        "Aperçu";

    preview.appendChild(title);

    if (data.titre && data.sous_titre) {

        const subtitle = document.createElement("h3");

        subtitle.textContent = data.sous_titre;

        preview.appendChild(subtitle);
    }

    if (data.image) {

        const img = document.createElement("img");

        img.src = data.image;

        img.alt = "";

        img.onerror = () => {
            img.style.display = "none";
        };

        preview.appendChild(img);
    }

    if (data.tarif) {

        const tarif = document.createElement("p");

        tarif.textContent = `Tarif : ${data.tarif}`;

        preview.appendChild(tarif);
    }

    if (data.inscription) {

        const inscription = document.createElement("p");

        inscription.textContent = data.inscription;

        preview.appendChild(inscription);
    }

    if (data.lieu) {

        const lieu = document.createElement("p");

        lieu.textContent = `📍 ${data.lieu}`;

        preview.appendChild(lieu);
    }
}


// ---------------------------------------------------------
// QR CODE
// ---------------------------------------------------------

function updateQRCode(url) {

    const qrContainer = document.getElementById("qrcode");

    const qrText = document.getElementById("qrCodeText");

    if (!qrContainer) return;

    qrContainer.innerHTML = "";

    if (qrText) {
        qrText.textContent = "";
    }

    if (!url) return;

    try {

        new QRCode(qrContainer, {
            text: url,
            width: 180,
            height: 180
        });

        if (qrText) {

            const link = document.createElement("a");

            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            link.textContent = url;

            qrText.appendChild(link);
        }

    } catch (error) {

        console.error("Erreur QR code :", error);

    }
}


// ---------------------------------------------------------
// Logo
// ---------------------------------------------------------

if (logoPicker) {

    logoPicker.addEventListener("change", () => {

        const file = logoPicker.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {

            const logoInput =
                document.getElementById("f_logo");

            if (logoInput) {

                logoInput.value = reader.result;

                generate();
            }
        };

        reader.readAsDataURL(file);
    });
}


if (logoColor) {

    logoColor.addEventListener("input", () => {

        const input =
            document.getElementById("f_logo_fond");

        if (input) {

            input.value = logoColor.value;

            generate();
        }
    });
}


// ---------------------------------------------------------
// Écoute des champs
// ---------------------------------------------------------

document.addEventListener("input", event => {

    if (
        event.target.matches(
            "#generatorForm input"
        )
    ) {

        generate();
    }
});


// ---------------------------------------------------------
// Copier JSON
// ---------------------------------------------------------

const copyButton =
    document.getElementById("copyButton");

if (copyButton) {

    copyButton.addEventListener("click", async () => {

        try {

            await navigator.clipboard.writeText(
                output.value
            );

            const oldText =
                copyButton.textContent;

            copyButton.textContent =
                "Copié !";

            setTimeout(() => {

                copyButton.textContent =
                    oldText;

            }, 1500);

        } catch (error) {

            console.error(error);

            alert(
                "Impossible de copier automatiquement."
            );
        }
    });
}


// ---------------------------------------------------------
// Réinitialisation
// ---------------------------------------------------------

const resetButton =
    document.getElementById("resetButton");

if (resetButton) {

    resetButton.addEventListener("click", () => {

        fields.forEach(field => {

            const input =
                document.getElementById(
                    `f_${field.id}`
                );

            if (input) {
                input.value = "";
            }
        });

        if (output) {
            output.value = "";
        }

        if (preview) {
            preview.innerHTML = "";
        }

        const qr =
            document.getElementById("qrcode");

        if (qr) {
            qr.innerHTML = "";
        }

        const qrText =
            document.getElementById("qrCodeText");

        if (qrText) {
            qrText.textContent = "";
        }
    });
}


// ---------------------------------------------------------
// Initialisation
// ---------------------------------------------------------

createFields();
generate();