$filePath = "src/app/student_page/library/page.tsx"
$content = Get-Content $filePath -Raw

# Pattern to find summary Delete buttons without Archive button before them
# This looks for Move to Folder -> divider -> Delete (without Archive in between)
$pattern = '(Move to Folder\s*</button>\s*<div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />\s*<button\s+className="w-full text-left px-4 py-3 text-sm text-red-600[^>]*"\s+onClick=\{\(\) => \{\s*handleDeleteSummary\(summary\._id\);)'

# Count matches before replacement
$matches = [regex]::Matches($content, $pattern)
Write-Host "Found $($matches.Count) summary menus missing Archive button"

# Replacement that adds Archive button before Delete
$replacement = 'Move to Folder
                                      </button>
                                      <div className="h-px bg-gray-100 dark:bg-slate-700 mx-2" />
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-orange-600/10 hover:text-orange-600"
                                        onClick={() => {
                                          handleArchiveSummary(summary._id);
                                          setOpenMenuId(null);
                                        }}
                                      >
                                        Archive
                                      </button>
                                      <button
                                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                                        onClick={() => {
                                          handleDeleteSummary(summary._id);'

$content = $content -replace $pattern, $replacement

$content | Set-Content $filePath -NoNewline
Write-Host "Fixed archive buttons in summary menus"
