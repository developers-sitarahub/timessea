# PowerShell script to fix the editor page
$filePath = "app\editor\page.tsx"
$content = Get-Content $filePath -Raw

# Remove the broken lines 454-457 (the incomplete button)
$pattern = '            <motion\.button\r?\n              whileHover=\{\{ scale: 1\.05 \}\}\r?\n              whileTap=\{\{ scale: 0\.95 \}\}\r?\n              type="button"\r?\n            '

$content = $content -replace $pattern, '            '

# Save the file
Set-Content $filePath -Value $content -NoNewline

Write-Host "File fixed successfully!"
