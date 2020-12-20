<!DOCTYPE html>
<?php
	// Force https
	if ($_SERVER['REQUEST_SCHEME'] == 'http' &&
		$_SERVER['HTTP_HOST'] != 'localhost')
		header('Location: https://'.$_SERVER['SERVER_NAME'].$_SERVER['REQUEST_URI']);

	// Varnish will not be caching pages where you are setting a cookie
	setcookie('disable-varnish', microtime(true), time()+600, '/');
	header('Expires: '.gmdate('D, d M Y H:i:s \G\M\T', time() + 1)); // 1 second

	// Calculate relative paths between the requested url & the ZEN package directory
	$dir = pathinfo ($_SERVER['SCRIPT_FILENAME'], PATHINFO_DIRNAME);
	$base_path = str_replace ($dir.'/', '', str_replace ('\\', '/', __DIR__).'/');
	$script = $base_path .pathinfo ($_SERVER['SCRIPT_FILENAME'], PATHINFO_FILENAME);

	$js = [];
	foreach (glob ($base_path.'*', GLOB_ONLYDIR ) AS $filename) {
		preg_match('/([a-z]+)$/', $filename, $m);
		if ($m) {
			$js[] = "sons.{$m[1]} = [];";
			$js[] = "liaisons.{$m[1]} = [];";
		}
	}
	foreach (glob ($base_path.'*/*.mp3') AS $filename) {
		preg_match('/([a-z]+)\/([a-z ]+\.mp3)/', $filename, $m);
		if ($m)
			$js[] = "sons.{$m[1]}.push('$filename');";
	}
	foreach (glob($base_path.'*/*.txt') as $filename) {
		preg_match('/([a-z ]+)\/[a-z ]+\.txt/', $filename, $rep);
		preg_match_all('/([a-z]+)[ |\.]/', $filename, $files);

		if ($files && $rep)
			foreach ($files[1] AS $f) {
				if (!is_dir($base_path.$f))
					echo "<p>Répertoire <u>$f</u> inexistant dans $filename</p>";
				if (!is_dir($base_path.$rep[1]))
					echo "<p>Répertoire <u>{$rep[1]}</u> inexistant dans $filename</p>";
				$js[] = "liaisons.{$rep[1]}.push('$f');";
				$js[] = "liaisons.$f.push('{$rep[1]}');";
			}
	}
?>

<html dir="ltr" lang="fr">
<head>
	<meta charset="utf-8" />
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1" />

	<title>ZEN</title>
	<link rel="shortcut icon" type="image/svg+xml" href="<?=$base_path?>icon.svg" />
	<link rel="icon" rel="alternate" type="image/png" href="<?=$base_path?>icon.png">

	<link href="<?=$script?>.css?<?=filesize($script.'.css')?>" rel="stylesheet">
	<script src="<?=$script?>.js?<?=filesize($script.'.js')?>" defer></script>
	<script>
		// Définition des sons
		var sons = [],
			liaisons = [];
		<?php echo implode ("\n\t\t", $js).PHP_EOL?>
	</script>
</head>

<body>
	<div>
		<p>Allongez-vous dans un endroit calme</p>
		<p>Utilisez des écouteurs</p>
	</div>
	<div>
		<p class="mobile">Posez le mobile sur votre abdomen</p>
	</div>

	<a onclick="flip()"><img id="flip" src="<?=$base_path?>start.svg" /></a>

	<div id="trace"></div>

	<div class="copyright">
		<p>Aucune information n'est mémorisée ni transmise.</p>
		<p>&copy <a href="https://github.com/Dominique92/zen">Dominique Cavailhez 2020</a></p>
	</div>
</body>
</html>