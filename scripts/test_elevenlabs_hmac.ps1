param(
    [string]$WebhookUrl = "https://opps.one/api/webhooks/elevenlabs",
    [string]$AgentId = "agent_8001kmdjn3t0ezft8hqwq1k0bv78"
)

$ErrorActionPreference = "Stop"

function Get-DopplerSecret($Name) {
    $value = & doppler secrets get $Name --project escolta_doppler --config dev --plain 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Could not get $Name from Doppler: $value"
        exit 1
    }
    return ($value | Out-String).Trim()
}

function ConvertTo-Hex($Bytes) {
    return [BitConverter]::ToString($Bytes).Replace("-", "").ToLowerInvariant()
}

$secret = Get-DopplerSecret "ELEVENLABS_WEBHOOK_SECRET"
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

$payloadObject = @{
    type            = "post_call_transcription"
    event_timestamp = $timestamp
    data            = @{
        conversation_id = "test_hmac_$timestamp"
        agent_id        = $AgentId
        transcript      = @(
            @{ role = "user"; message = "Prueba HMAC oficial" },
            @{ role = "agent"; message = "Prueba recibida" }
        )
        analysis        = @{
            data_collection_results = @{
                nombre                 = @{ value = "Test Hmac" }
                resumen_conversacion   = @{ value = "Prueba controlada de webhook HMAC oficial." }
                calificacion           = @{ value = "POTENCIAL" }
            }
        }
    }
}

$payload = $payloadObject | ConvertTo-Json -Depth 10 -Compress
$signedPayload = "$timestamp.$payload"

$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($secret)
$digest = ConvertTo-Hex $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($signedPayload))
$signature = "t=$timestamp,v0=$digest"

Write-Host "Testing: $WebhookUrl"
Write-Host "Signature: [SET]"
Write-Host "Conversation: test_hmac_$timestamp"

$tempFile = New-TemporaryFile
try {
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempFile, $payload, $utf8NoBom)

    $response = & curl.exe `
        --silent `
        --show-error `
        --write-out "`nHTTP_STATUS:%{http_code}" `
        --request POST `
        --header "Content-Type: application/json" `
        --header "elevenlabs-signature: $signature" `
        --data-binary "@$tempFile" `
        $WebhookUrl

    $body = ($response -join "`n") -replace "`nHTTP_STATUS:\d+$", ""
    $statusLine = ($response | Select-String -Pattern "HTTP_STATUS:\d+$" | Select-Object -Last 1).Matches.Value
    $status = $statusLine -replace "HTTP_STATUS:", ""

    Write-Host "Status: $status"
    Write-Host "Body: $body"

    if ($status -lt 200 -or $status -ge 300) {
        exit 1
    }
} finally {
    Remove-Item -LiteralPath $tempFile -Force -ErrorAction SilentlyContinue
}
