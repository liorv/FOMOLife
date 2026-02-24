$path='unit-tests\App.test.js'
$lines=Get-Content $path
# keep lines before test (1-based indexing) excluding line 432-555
$keep=$lines[0..430] + $lines[555..($lines.Count-1)]
$keep | Set-Content $path
