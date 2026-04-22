# Script: Configure ElevenLabs Post-Call Webhook
# Ejecutar: .\scripts\_el_webhook_setup.ps1

param(
    [string]$ApiKey = "",
    [string]$WebhookSecret = ""
)

$AGENT_OMAR  = "agent_8001kmdjn3t0ezft8hqwq1k0bv78" # Omar — único agente activo
$WEBHOOK_URL = if ($env:ELEVENLABS_WEBHOOK_URL) { $env:ELEVENLABS_WEBHOOK_URL } else { "https://opps.one/api/webhooks/elevenlabs" }

# Read from Doppler if not passed as params
function Get-DopplerSecret($Name) {
    $value = & doppler secrets get $Name --project escolta_doppler --config dev --plain 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Could not get $Name from Doppler: $value"
        exit 1
    }
    return ($value | Out-String).Trim()
}

if (-not $ApiKey) {
    $ApiKey = Get-DopplerSecret "ELEVEN_LABS_API_KEY"
}
if (-not $WebhookSecret) {
    $WebhookSecret = Get-DopplerSecret "ELEVENLABS_WEBHOOK_SECRET"
}

if (-not $ApiKey -or $ApiKey -like "*Error*") {
    Write-Error "Could not get ELEVEN_LABS_API_KEY from Doppler"; exit 1
}

$headers = @{
    "xi-api-key"   = $ApiKey
    "Content-Type" = "application/json"
}

function Get-Agent($AgentId) {
    return Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$AgentId" -Headers $headers -Method GET
}

function Set-AgentWebhook($AgentId, $AgentName) {
    Write-Host "`n--- Configuring: $AgentName ($AgentId) ---"
    
    # Read before
    $before = Get-Agent $AgentId
    $beforeUrl = $before.conversation_config.platform_settings.post_call_webhook.url
    Write-Host "  Before: URL='$beforeUrl'"

    # Build patch body using raw JSON string to avoid serialization issues
    $bodyJson = '{"conversation_config":{"platform_settings":{"post_call_webhook":{"url":"' + $WEBHOOK_URL + '","secret":"' + $WebhookSecret + '"}}}}'
    
    try {
        $res = Invoke-RestMethod `
            -Uri "https://api.elevenlabs.io/v1/convai/agents/$AgentId" `
            -Headers $headers `
            -Method PATCH `
            -Body $bodyJson
        
        # Verify
        $after = Get-Agent $AgentId
        $afterUrl = $after.conversation_config.platform_settings.post_call_webhook.url
        $afterSecretSet = $null -ne $after.conversation_config.platform_settings.post_call_webhook.secret

        if ($afterUrl -eq $WEBHOOK_URL) {
            Write-Host "  [OK] URL set: $afterUrl"
            Write-Host "  [OK] Secret set: $afterSecretSet"
            return $true
        } else {
            Write-Host "  [FAIL] After URL is: '$afterUrl' (expected '$WEBHOOK_URL')"
            return $false
        }
    } catch {
        Write-Host "  [ERROR] $($_.Exception.Message)"
        return $false
    }
}

function Test-WebhookEndpoint {
    Write-Host "`n--- Testing Webhook Endpoint ---"
    try {
        $res = Invoke-WebRequest -Uri $WEBHOOK_URL -Method POST -Body '{}' -ContentType "application/json" -ErrorAction Stop
        Write-Host "  Status: $($res.StatusCode)"
        if ($res.StatusCode -eq 401) {
            Write-Host "  [OK] 401 Unauthorized = HMAC validation is ACTIVE (correct)"
        } else {
            Write-Host "  [WARN] Expected 401, got $($res.StatusCode). HMAC may not be deployed yet."
        }
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -eq 401) {
            Write-Host "  [OK] 401 Unauthorized = HMAC validation is ACTIVE (correct)"
        } elseif ($code -eq 404) {
            Write-Host "  [FAIL] 404 - Endpoint not found. Check Vercel deployment."
        } else {
            Write-Host "  Status: $code | Msg: $($_.Exception.Message)"
        }
    }
}

Write-Host "=== ElevenLabs Webhook Setup & QA ===`n"
Write-Host "Target: $WEBHOOK_URL"
Write-Host "Secret: [SET]"

# List all agents
Write-Host "`n--- Agents in Account ---"
$agentsList = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents?page_size=50" -Headers $headers -Method GET
foreach ($a in $agentsList.agents) {
    Write-Host "  - $($a.name) | $($a.agent_id) | 7d calls: $($a.last_7_day_call_count)"
}

# Configure webhook for Omar (único agente activo)
$omarOk = Set-AgentWebhook $AGENT_OMAR "Omar"

# Test endpoint
Test-WebhookEndpoint

Write-Host "`n=== RESULTS ==="
Write-Host "Omar webhook: $(if($omarOk){'OK'}else{'FAILED'})"
