# Complete fix for the button section
$filePath = "app\editor\page.tsx"
$content = Get-Content $filePath -Raw

# Find the section to replace - from activeTab check to the first Save Draft button
$search = @'
        {activeTab === "editor" && (
          <div className="flex items-center gap-2 shrink-0">
              onClick={() => setIsPreview(!isPreview)}
              className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary/50"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isPreview ? "Edit" : "Preview"}
              </span>
            </motion.button>

              onClick={() => setShowScheduleInput(!showScheduleInput)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold shadow-sm transition-colors",
                scheduledAt
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-background text-foreground hover:bg-secondary/50",
              )}
              title="Schedule"
            >
              <Calendar className="h-3.5 w-3.5" />
              {scheduledAt ? "Scheduled" : ""}
            </motion.button>

              onClick={handleSaveDraft}
              disabled={isSavingDraft || saved}
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold shadow-sm transition-colors",
                saved
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : "bg-background text-foreground hover:bg-secondary/50"
              )}
            >
'@

$replace = @'
        {activeTab === "editor" && (
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setIsPreview(!isPreview)}
              className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary/50"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isPreview ? "Edit" : "Preview"}
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setShowScheduleInput(!showScheduleInput)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold shadow-sm transition-colors",
                scheduledAt
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-background text-foreground hover:bg-secondary/50",
              )}
              title="Schedule"
            >
              <Calendar className="h-3.5 w-3.5" />
              {scheduledAt ? "Scheduled" : ""}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || saved}
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold shadow-sm transition-colors",
                saved
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : "bg-background text-foreground hover:bg-secondary/50"
              )}
            >
'@

$content = $content.Replace($search, $replace)

# Save
Set-Content $filePath -Value $content -NoNewline

Write-Host "All buttons fixed completely!"
