# kill everything listening on the Next.js ports
3001,3002,3003,3004 | ForEach-Object {
    $p = Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue |
         Select-Object -ExpandProperty OwningProcess -Unique
    if ($p) { Stop-Process -Id $p -Force }
}

pnpm dev:mono