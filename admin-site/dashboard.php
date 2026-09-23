<?php
declare(strict_types=1);
if (session_status() !== PHP_SESSION_ACTIVE) session_start();
if (empty($_SESSION['admin_authenticated'])) { header('Location: index.php'); exit; }
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=swap" rel="stylesheet">
<title>Administration - Événements</title><link rel="stylesheet" href="admin.css">
</head>
<body>
<div id="tokenBar">
<span id="tokenStatus">Aucun token enregistré</span><input id="tokenInput" type="password" autocomplete="off" placeholder="Token GitHub">
<button id="tokenSave">Enregistrer</button><button id="tokenClear">Effacer</button>
<a href="auth/logout.php" style="margin-left:auto;">Déconnexion</a>
</div>
<h1>Administration des événements</h1>
<p id="hint">Gérez le statut des événements à venir. Les événements sont chargés depuis <strong>agenda.json</strong>.<br><br>
Les modifications sont enregistrées dans <strong>status-overrides.json</strong> et ne modifient pas votre calendrier Google.</p>
<div id="filters"><input id="searchInput" type="search" placeholder="Rechercher un événement...">
<select id="labelFilter"><option value="">Tous les calendriers</option></select></div>
<div id="eventList">Chargement des événements…</div>
<script src="admin.js"></script>
</body></html>