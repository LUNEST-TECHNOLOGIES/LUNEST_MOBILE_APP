Get-ChildItem -Path src -Recurse -Include *.jsx,*.js | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match 'useEffect\s*\(' -and $content -notmatch 'import.*useEffect' -and $content -notmatch 'React\.useEffect') {
        Write-Output $_.FullName
    }
}
