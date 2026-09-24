<?php
declare(strict_types=1);
require __DIR__ . '/auth/guard.php';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Administration — L'établi ludique</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
body{margin:0;background:#0a1330;color:#fff;font-family:"Baloo 2","Segoe UI",Arial,sans-serif;padding:24px}
.page{max-width:1100px;margin:auto}
header{display:flex;align-items:center;gap:20px;margin-bottom:30px;flex-wrap:wrap}
header img{height:70px;width:auto}
h1{margin:0;font-size:34px}
header p{margin:4px 0;color:#a9b0cc}
.logout{margin-left:auto;color:#fff;background:#3a4066;padding:9px 14px;border-radius:9px;text-decoration:none;font-weight:700}
h2{font-size:22px;margin:25px 0 12px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.card{display:block;text-decoration:none;color:#fff;background:#141c40;border:1px solid #30385f;border-radius:16px;padding:20px;transition:.15s}
.card:hover{transform:translateY(-2px);border-color:#e97126}
.icon{font-size:30px;margin-bottom:8px}
.card h3{margin:0 0 5px;font-size:21px}
.card p{margin:0;color:#a9b0cc;line-height:1.35}
.note{margin-top:25px;padding:14px 16px;background:#111a3b;border-radius:12px;color:#c6cbe0}
@media(max-width:600px){body{padding:14px}header img{height:55px}h1{font-size:28px}.logout{margin-left:0}}
</style>
</head>
<body>
<div class="page">
<header>
<img src="agenda/img/logo-etabli.svg" alt="L'établi ludique">
<div>
<h1>Administration</h1>
<p>Gestion des événements, communications et outils de L'établi ludique</p>
</div>
<a class="logout" href="auth/logout.php">Déconnexion</a>
</header>

<h2>Événements</h2>
<div class="grid">
<a class="card" href="evenements.php"><div class="icon">📅</div><h3>Gestion des événements</h3><p>Statuts, communications associées et événements à venir.</p></a>
<a class="card" href="communication/evenements.html"><div class="icon">🗓️</div><h3>Événements à copier</h3><p>Sélectionner et copier les événements pour les communications.</p></a>
</div>

<h2>Communication</h2>
<div class="grid">
<a class="card" href="communication/mails.html"><div class="icon">✉️</div><h3>Gestion des mails</h3><p>Modèles de mails, variables et historique d'utilisation.</p></a>
<a class="card" href="communication/generiques.html"><div class="icon">📣</div><h3>Communications génériques</h3><p>Posts Facebook et Instagram avec suivi des publications.</p></a>
</div>

<h2>Outils</h2>
<div class="grid">
<a class="card" href="generateur.html"><div class="icon">🖼️</div><h3>Générateur</h3><p>Créer les visuels et affiches à partir des données d'événements.</p></a>
<a class="card" href="verif-visuels.html"><div class="icon">🔎</div><h3>Vérification des visuels</h3><p>Contrôler les visuels et les éléments nécessaires.</p></a>
<a class="card" href="absences.js"><div class="icon">🏖️</div><h3>Absences</h3><p>Gestion des périodes d'absence et vacances.</p></a>
</div>

<div class="note">Cette page devient le point d'entrée de l'administration après la connexion.</div>
</div>
</body>
</html>