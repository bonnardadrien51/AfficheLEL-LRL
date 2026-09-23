<?php
declare(strict_types=1);
session_start();
$usersFile = __DIR__ . '/auth/users.json';
$setup = !is_file($usersFile);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim((string)($_POST['email'] ?? ''));
    $password = (string)($_POST['password'] ?? '');
    $passwordConfirm = (string)($_POST['password_confirm'] ?? '');
    if ($setup) {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $error = 'Adresse e-mail invalide.';
        elseif (strlen($password) < 12) $error = 'Le mot de passe doit contenir au moins 12 caractères.';
        elseif ($password !== $passwordConfirm) $error = 'Les deux mots de passe ne correspondent pas.';
        else {
            if (!is_dir(__DIR__ . '/auth')) mkdir(__DIR__ . '/auth', 0750, true);
            $data = ['admin' => ['email'=>strtolower($email),'password_hash'=>password_hash($password, PASSWORD_DEFAULT),'created_at'=>date(DATE_ATOM)]];
            if (@file_put_contents($usersFile, json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), LOCK_EX) === false) {
                $error = 'Impossible d’enregistrer le compte administrateur. Vérifie les droits d’écriture du dossier auth.';
            } else {
                $_SESSION['admin_authenticated']=true; $_SESSION['admin_email']=strtolower($email); session_regenerate_id(true);
                header('Location: dashboard.php'); exit;
            }
        }
    } else {
        $users = json_decode((string)file_get_contents($usersFile), true);
        $account = $users['admin'] ?? null;
        if (!$account || !isset($account['email'],$account['password_hash']) ||
            !hash_equals(strtolower((string)$account['email']), strtolower($email)) ||
            !password_verify($password,(string)$account['password_hash'])) $error='Adresse e-mail ou mot de passe incorrect.';
        else {
            $_SESSION['admin_authenticated']=true; $_SESSION['admin_email']=strtolower($email); session_regenerate_id(true);
            header('Location: dashboard.php'); exit;
        }
    }
}
if (!$setup && !empty($_SESSION['admin_authenticated'])) { header('Location: dashboard.php'); exit; }
?>
<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= $setup ? 'Première connexion' : 'Connexion administrateur' ?> - L’établi ludique</title>
<link rel="stylesheet" href="admin.css">
<style>
.auth-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
.auth-card{width:min(430px,100%);padding:32px;border-radius:20px;background:#fff;box-shadow:0 10px 35px rgba(0,0,0,.12)}
.auth-card h1{margin-top:0}.auth-card label{display:block;margin:18px 0 7px;font-weight:700}
.auth-card input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #ccc;border-radius:10px;font:inherit}
.auth-card button{margin-top:24px;width:100%;padding:12px;border:0;border-radius:10px;background:#e8bed4;font:inherit;font-weight:800;cursor:pointer}
.auth-error{padding:12px;border-radius:10px;background:#ffe5e5;color:#8b0000}.auth-info{color:#555}
</style></head><body><main class="auth-page"><section class="auth-card">
<h1><?= $setup ? 'Première connexion' : 'Administration' ?></h1>
<p class="auth-info"><?= $setup ? 'Crée ton compte administrateur. Cette étape ne sera proposée qu’une seule fois.' : 'Connecte-toi pour accéder à l’administration.' ?></p>
<?php if (!empty($error)): ?><p class="auth-error"><?= htmlspecialchars($error,ENT_QUOTES,'UTF-8') ?></p><?php endif; ?>
<form method="post" autocomplete="on">
<label for="email">Adresse e-mail</label><input id="email" name="email" type="email" required autocomplete="username">
<label for="password">Mot de passe</label><input id="password" name="password" type="password" required autocomplete="<?= $setup ? 'new-password':'current-password' ?>">
<?php if ($setup): ?><label for="password_confirm">Confirmation du mot de passe</label><input id="password_confirm" name="password_confirm" type="password" required autocomplete="new-password"><?php endif; ?>
<button type="submit"><?= $setup ? 'Créer le compte administrateur':'Se connecter' ?></button>
</form></section></main></body></html>