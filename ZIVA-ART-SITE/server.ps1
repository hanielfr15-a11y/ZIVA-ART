$port = 5500
$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $baseDir) { $baseDir = Get-Location }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Red
    Write-Host "     ZIVA ART - SERVIDOR LOCAL INICIADO COM SUCESSO!      " -ForegroundColor Green
    Write-Host "     Acesse no seu navegador: http://localhost:$port      " -ForegroundColor Cyan
    Write-Host "     (PIX Transparente e Mercado Pago Ativos)             " -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Red
    Start-Process "http://localhost:$port"
} catch {
    Write-Host "Servidor ja em execucao ou porta ocupada: $_" -ForegroundColor Yellow
}

$MP_TOKEN = "APP_USR-6831589121833969-082409-9cba38328b231e44ee8a872de03e5733-522171992"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Idempotency-Key")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $urlPath = $request.Url.LocalPath.TrimStart('/')

        # ROTA: /api/create-pix
        if ($urlPath -eq "api/create-pix" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $body = $reader.ReadToEnd()
            $reader.Close()

            $headers = @{
                "Authorization" = "Bearer $MP_TOKEN"
                "Content-Type" = "application/json"
                "X-Idempotency-Key" = [guid]::NewGuid().ToString()
            }

            try {
                $mpResp = Invoke-RestMethod -Uri "https://api.mercadopago.com/v1/payments" -Method Post -Headers $headers -Body $body
                $jsonOut = $mpResp | ConvertTo-Json -Depth 10
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonOut)
                $response.ContentType = "application/json; charset=utf-8"
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $errMsg = $_.Exception.Message
                $errJson = "{`"error`": `"Falha no Mercado Pago: $errMsg`"}"
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                $response.ContentType = "application/json; charset=utf-8"
                $response.StatusCode = 400
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $response.Close()
            continue
        }

        # ROTA: /api/check-pix
        if ($urlPath.StartsWith("api/check-pix/") -and $request.HttpMethod -eq "GET") {
            $paymentId = $urlPath.Replace("api/check-pix/", "")
            $headers = @{
                "Authorization" = "Bearer $MP_TOKEN"
            }
            try {
                $mpResp = Invoke-RestMethod -Uri "https://api.mercadopago.com/v1/payments/$paymentId" -Method Get -Headers $headers
                $jsonOut = $mpResp | ConvertTo-Json -Depth 10
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonOut)
                $response.ContentType = "application/json; charset=utf-8"
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $response.StatusCode = 404
            }
            $response.Close()
            continue
        }

        # ARQUIVOS ESTATICOS
        if ([string]::IsNullOrWhiteSpace($urlPath) -or $urlPath -eq '/') { 
            $urlPath = 'index.html' 
        }

        $filePath = Join-Path $baseDir $urlPath
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                '.html' { 'text/html; charset=utf-8' }
                '.css'  { 'text/css; charset=utf-8' }
                '.js'   { 'application/javascript; charset=utf-8' }
                '.json' { 'application/json; charset=utf-8' }
                '.png'  { 'image/png' }
                '.jpg'  { 'image/jpeg' }
                '.jpeg' { 'image/jpeg' }
                '.svg'  { 'image/svg+xml' }
                '.mp4'  { 'video/mp4' }
                '.pdf'  { 'application/pdf' }
                '.xlsx' { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
                default { 'application/octet-stream' }
            }
            $response.ContentType = $mime
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    } catch {}
}