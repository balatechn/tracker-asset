$token = "16|KrAaw6Dh3pXfktWggFKmrB3ZI3BeFR2b8Nm1C2iR1b8b0b41"
$base  = "http://187.127.134.246:8000/api/v1"
$hdr   = @{ Authorization = "Bearer $token"; Accept = "application/json" }

function Coolify-POST($path, $body) {
    $r = Invoke-WebRequest -Uri "$base$path" -Method POST `
        -Headers $hdr -ContentType "application/json" -Body $body -UseBasicParsing
    Write-Host "[$($r.StatusCode)] POST $path"
    return $r.Content | ConvertFrom-Json
}
function Coolify-PATCH($path, $body) {
    $r = Invoke-WebRequest -Uri "$base$path" -Method PATCH `
        -Headers $hdr -ContentType "application/json" -Body $body -UseBasicParsing
    Write-Host "[$($r.StatusCode)] PATCH $path"
    return $r.Content | ConvertFrom-Json
}
function Coolify-PATCH-ENV($path, $body) {
    $r = Invoke-WebRequest -Uri "$base$path" -Method PATCH `
        -Headers $hdr -ContentType "application/json" -Body $body -UseBasicParsing
    Write-Host "[$($r.StatusCode)] ENV-BULK $path"
}
function Coolify-POST-ENV($appUuid, $key, $value) {
    $body = @{ key = $key; value = $value; is_preview = $false } | ConvertTo-Json -Compress
    $r = Invoke-WebRequest -Uri "$base/applications/$appUuid/envs" -Method POST `
        -Headers $hdr -ContentType "application/json" -Body $body -UseBasicParsing
    Write-Host "  [$($r.StatusCode)] ENV $key"
}
function Coolify-GET($path) {
    $r = Invoke-WebRequest -Uri "$base$path" -Method GET -Headers $hdr -UseBasicParsing
    return $r.Content | ConvertFrom-Json
}
function Coolify-Deploy($uuid) {
    $r = Invoke-WebRequest -Uri "$base/applications/$uuid/start" -Method GET `
        -Headers $hdr -UseBasicParsing
    Write-Host "[$($r.StatusCode)] Deploy $uuid"
}

# ─────────────────────────────────────────────
# Known UUIDs from previous API calls
# ─────────────────────────────────────────────
$project_uuid     = "jxtbtcjm5hf70vo11x2plyhp"
$env_uuid         = "pp06fe15bxk7nw9e72sxzwu5"
$server_uuid      = "amfvd7ig8xpj28zj25v5vl6t"
$pg_internal_url  = "postgres://ngi_user:NGI%40SecurePass2024@v1bbf1yyz3puh0zoi2ani0h4:5432/ngi_tracker"
$redis_internal   = "redis://default:rATn8ZqvoS4LWnG5LKbkO0TMT26VK1NaW3iVyRq55LciUFXdwIqAh3fohS3zREsy@g10p1udcpm386qvohm1yhlpf:6379/0"
$jwt_secret       = "NGI-JWT-Super-Secret-2024-XyZ!@#"

Write-Host "`n=== Step 1: Create BACKEND application ==="
$backendBody = @{
    name = "ngi-backend"
    server_uuid = $server_uuid
    project_uuid = $project_uuid
    environment_uuid = $env_uuid
    git_repository = "https://github.com/balatechn/tracker-asset"
    git_branch = "master"
    build_pack = "dockerfile"
    base_directory = "/backend"
    dockerfile_location = "/Dockerfile"
    ports_exposes = "5000"
    instant_deploy = $false
} | ConvertTo-Json -Compress
$backend = Coolify-POST "/applications/public" $backendBody
Write-Host "Backend UUID: $($backend.uuid)"

Write-Host "`n=== Step 2: Set BACKEND env vars ==="
Coolify-POST-ENV $backend.uuid "NODE_ENV" "production"
Coolify-POST-ENV $backend.uuid "PORT" "5000"
Coolify-POST-ENV $backend.uuid "DATABASE_URL" $pg_internal_url
Coolify-POST-ENV $backend.uuid "REDIS_URL" $redis_internal
Coolify-POST-ENV $backend.uuid "JWT_SECRET" $jwt_secret
Coolify-POST-ENV $backend.uuid "FRONTEND_URL" "http://ngi-tracker.187.127.134.246.sslip.io"

Write-Host "`n=== Step 3: Create FRONTEND application ==="
$frontendFqdn = "http://ngi-tracker.187.127.134.246.sslip.io"
$backendFqdn  = "http://ngi-backend.187.127.134.246.sslip.io"

$frontendBody = @{
    name = "ngi-frontend"
    server_uuid = $server_uuid
    project_uuid = $project_uuid
    environment_uuid = $env_uuid
    git_repository = "https://github.com/balatechn/tracker-asset"
    git_branch = "master"
    build_pack = "dockerfile"
    base_directory = "/frontend"
    dockerfile_location = "/Dockerfile"
    ports_exposes = "3000"
    domains = $frontendFqdn
    instant_deploy = $false
} | ConvertTo-Json -Compress
$frontend = Coolify-POST "/applications/public" $frontendBody
Write-Host "Frontend UUID: $($frontend.uuid)"

Write-Host "`n=== Step 4: Set FRONTEND env vars ==="
Coolify-POST-ENV $frontend.uuid "NEXT_PUBLIC_API_URL" "$backendFqdn/api"
Coolify-POST-ENV $frontend.uuid "NODE_ENV" "production"

Write-Host "`n=== Step 5: Set BACKEND fqdn (after frontend UUID known) ==="
$patchBody = @{ domains = $backendFqdn } | ConvertTo-Json -Compress
Coolify-PATCH "/applications/$($backend.uuid)" $patchBody

Write-Host "`n=== Step 6: Deploy PostgreSQL ==="
$r = Invoke-WebRequest -Uri "$base/databases/v1bbf1yyz3puh0zoi2ani0h4/start" -Method GET -Headers $hdr -UseBasicParsing
Write-Host "[$($r.StatusCode)] Deploy postgres"

Write-Host "`n=== Step 7: Deploy Redis ==="
$r = Invoke-WebRequest -Uri "$base/databases/g10p1udcpm386qvohm1yhlpf/start" -Method GET -Headers $hdr -UseBasicParsing
Write-Host "[$($r.StatusCode)] Deploy redis"

Write-Host "`n=== Step 8: Deploy Backend ==="
Coolify-Deploy $backend.uuid

Write-Host "`n=== Step 9: Deploy Frontend ==="
Coolify-Deploy $frontend.uuid

Write-Host "`n=== DONE ==="
Write-Host "Frontend URL: $frontendFqdn"
Write-Host "Backend  URL: $backendFqdn"
Write-Host "Backend UUID: $($backend.uuid)"
Write-Host "Frontend UUID: $($frontend.uuid)"
