# Fix the Publish button opening tag
$filePath = "app\editor\page.tsx"
$content = Get-Content $filePath -Raw

# Find and replace the section from line 463 onwards
$search = @'
            </motion.button>

              disabled={
'@

$replace = @'
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              disabled={
'@

$content = $content.Replace($search, $replace)

# Save
Set-Content $filePath -Value $content -NoNewline

Write-Host "Publish button fixed!"
