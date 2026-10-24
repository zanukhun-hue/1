param(
  [string]$TokenFile = (Join-Path $env:USERPROFILE '.codex/secrets/null-object-ae-bot.token.dpapi'),
  [switch]$ConfigureWebhook,
  [string]$WebhookSecret = $env:TELEGRAM_WEBHOOK_SECRET
)
$ErrorActionPreference = 'Stop'
$presetToken = $env:TELEGRAM_BOT_TOKEN
if (-not $presetToken) {
  $presetSecure = Get-Content -LiteralPath $TokenFile -Raw | ConvertTo-SecureString
  $presetToken = [System.Net.NetworkCredential]::new('', $presetSecure).Password
}
function Invoke-PresetBotApi([string]$Method, $Body) {
  try {
    $result = Invoke-RestMethod -Method Post -Uri ('https://api.telegram.org/bot'+$presetToken+'/'+$Method) -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 15 -Compress)))
    if (-not $result.ok) { throw 'API returned failure' }
    return $result.result
  } catch { throw ('Telegram '+$Method+' failed; secret URL omitted') }
}
try {
  $bot = Invoke-PresetBotApi 'getMe' @{}
  if ($bot.username -ne 'null_object_ae_bot') { throw 'Token belongs to a different bot' }
  Push-Location (Split-Path $PSScriptRoot -Parent)
  try { $commands = node -p "JSON.stringify(require('./preset-products').COMMANDS)" | ConvertFrom-Json } finally { Pop-Location }
  foreach ($lang in @('', 'ru', 'en')) {
    foreach ($scope in @('default','all_private_chats')) {
      $null = Invoke-PresetBotApi 'setMyCommands' @{commands=@($commands);scope=@{type=$scope};language_code=$lang}
    }
  }
  $null = Invoke-PresetBotApi 'setMyName' @{name='NULL—OBJECT · Пресеты'}
  $null = Invoke-PresetBotApi 'setMyDescription' @{description='Авторские пресеты для After Effects. 9 тематических наборов по 100 ⭐. Выбор набора, оплата Telegram Stars, ZIP после покупки и повторная выдача в «Мои покупки».'}
  $null = Invoke-PresetBotApi 'setMyShortDescription' @{short_description='Пресеты для After Effects · 100 ⭐ за набор · ZIP после оплаты'}
  $null = Invoke-PresetBotApi 'setChatMenuButton' @{menu_button=@{type='commands'}}
  if ($ConfigureWebhook) {
    if (-not $WebhookSecret) { throw 'The existing TELEGRAM_WEBHOOK_SECRET from Render is required' }
    $null = Invoke-PresetBotApi 'setWebhook' @{url='https://null-object-ae.onrender.com/api/telegram/webhook';secret_token=$WebhookSecret;allowed_updates=@('message','callback_query','pre_checkout_query');drop_pending_updates=$false}
  }
  $verified = Invoke-PresetBotApi 'getMyCommands' @{scope=@{type='all_private_chats'};language_code='ru'}
  $hook = Invoke-PresetBotApi 'getWebhookInfo' @{}
  [pscustomobject]@{bot=$bot.username;commands=($verified.command -join ', ');webhook=$hook.url;allowed_updates=$hook.allowed_updates;pending_updates=$hook.pending_update_count} | ConvertTo-Json -Depth 5
} finally { Remove-Variable presetToken,presetSecure -ErrorAction SilentlyContinue }
