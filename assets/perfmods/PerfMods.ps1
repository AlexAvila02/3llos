<#
  PerfMods - Agrega tus mods de rendimiento a packs de CurseForge (Forge 1.20.1)

  Uso normal: doble clic en "Instalar mods de rendimiento.bat".
  Opciones (por consola):
    -Instancia "Nombre"   aplica a ese pack sin preguntar
    -Todas                aplica a todos los packs Forge 1.20.1
    -Quitar               borra los mods que este script agrego (pregunta el pack)
    -Simular              muestra lo que haria, sin copiar nada
    -Revisar              busca mods incompatibles o dependencias faltantes en un pack
#>
param(
  [string]$Instancia,
  [switch]$Todas,
  [switch]$Quitar,
  [switch]$Revisar,
  [switch]$Simular,
  [string]$CarpetaInstancias = (Join-Path $env:USERPROFILE 'curseforge\minecraft\Instances')
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$MC = '1.20.1'
$LOADER = 'forge'
$Aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$ListaPath = Join-Path $Aqui 'mods.txt'
$Cache = Join-Path $env:LOCALAPPDATA 'PerfMods\cache'
$RegistroNombre = 'perfmods-agregados.txt'
$UA = @{ 'User-Agent' = 'PerfMods/1.0 (script personal de instalacion de mods)' }

# Alternativas a Embeddium que Modrinth marca como "requeridas": nunca se agregan como dependencia
$NuncaComoDependencia = @('rubidium', 'sodium')
# Mods que dependen de Embeddium: se omiten si el pack usa OptiFine o Rubidium
$FamiliaRender = @('embeddium', 'oculus', 'rubidium-extra', 'textrues-embeddium-options', 'sodium-dynamic-lights', 'sodium-options-api')
# Variantes que hacen lo mismo y chocan entre si (tienen distinto ID, asi que no se detectan solas).
# slug de la lista -> IDs de mod que, si ya estan en el pack, hacen que se omita.
$Equivalentes = [ordered]@{
  'noisium'               = @('noisiumed')
  'radium'                = @('canary')
  'sodium-dynamic-lights' = @('dynamiclightsreforged', 'lambdynlights', 'ryoamiclights', 'dynamiclights')
}
# Los mismos grupos por ID de mod, para el modo Revisar
$GruposEquivalentes = @(
  @('noisium', 'noisiumed'),
  @('radium', 'canary'),
  @('sodiumdynamiclights', 'dynamiclightsreforged', 'lambdynlights', 'ryoamiclights', 'dynamiclights')
)

function Escribir([string]$Texto, [string]$Color = 'Gray') { Write-Host $Texto -ForegroundColor $Color }

function Invoke-Api([string]$Url) {
  for ($i = 1; $i -le 3; $i++) {
    try { return Invoke-RestMethod -Uri $Url -Headers $UA -TimeoutSec 30 }
    catch { if ($i -eq 3) { throw }; Start-Sleep -Seconds (2 * $i) }
  }
}

function ConvertTo-Lista($Valor) { return @(foreach ($x in $Valor) { $x }) }

# ---------- Lectura de jars ----------
function Read-ZipTexto($Zip, [string]$Nombre) {
  $entrada = $Zip.GetEntry($Nombre)
  if (-not $entrada) { return $null }
  $sr = New-Object System.IO.StreamReader($entrada.Open())
  try { return $sr.ReadToEnd() } finally { $sr.Close() }
}

# Lee META-INF/mods.toml: que mods trae el jar (id + version) y que dependencias/incompatibilidades declara
function Get-JarInfo([string]$Ruta) {
  $mods = New-Object System.Collections.ArrayList
  $deps = New-Object System.Collections.ArrayList
  $embebidos = New-Object System.Collections.ArrayList
  try {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($Ruta)
    try { Read-InfoZip $zip $mods $deps $embebidos 0 } finally { $zip.Dispose() }
  } catch { }
  return [pscustomobject]@{
    # Mods: los propios del jar. Embebidos: los que trae adentro (jarjar), que tambien cuentan como presentes en el pack
    Mods = @($mods | Where-Object { $_.Id })
    Embebidos = @($embebidos | Where-Object { $_.Id })
    # Las dependencias marcadas side="SERVER" Forge no las revisa en el cliente
    Deps = @($deps | Where-Object { $_.Id -and $_.Id -notin @('forge', 'minecraft', 'neoforge', 'javafml') -and $_.Lado -ne 'SERVER' })
  }
}

function Read-InfoZip($Zip, $Mods, $Deps, $Embebidos, [int]$Nivel) {
  # Mods embebidos (META-INF/jarjar): cuentan como presentes; sus dependencias no se revisan
  if ($Nivel -lt 2) {
    foreach ($ent in @($Zip.Entries | Where-Object { $_.FullName -like 'META-INF/jarjar/*.jar' })) {
      try {
        $ms = New-Object System.IO.MemoryStream
        $st = $ent.Open(); try { $st.CopyTo($ms) } finally { $st.Close() }
        $ms.Position = 0
        $interno = New-Object System.IO.Compression.ZipArchive($ms, [System.IO.Compression.ZipArchiveMode]::Read)
        try { Read-InfoZip $interno $Embebidos (New-Object System.Collections.ArrayList) $Embebidos ($Nivel + 1) } finally { $interno.Dispose(); $ms.Dispose() }
      } catch { }
    }
  }
  $txt = Read-ZipTexto $Zip 'META-INF/mods.toml'
  if (-not $txt) { return }
  $versionJar = $null
  $mf = Read-ZipTexto $Zip 'META-INF/MANIFEST.MF'
  if ($mf -and $mf -match '(?m)^Implementation-Version:\s*(\S+)') { $versionJar = $Matches[1] }
  $actual = $null; $seccion = ''; $enMultilinea = $false; $delim = ''
  foreach ($linea in ($txt -split "`n")) {
    $l = $linea.Trim()
    if ($enMultilinea) { if ($l.Contains($delim)) { $enMultilinea = $false }; continue }
    if ($l -match '^[\w\.]+\s*=\s*(''''''|""")(.*)$') {
      $delim = $Matches[1]; if (-not $Matches[2].Contains($delim)) { $enMultilinea = $true }; continue
    }
    if ($l -match '^\[\[\s*mods\s*\]\]') {
      $actual = [pscustomobject]@{ Id = $null; Version = $null }; [void]$Mods.Add($actual); $seccion = 'mods'; continue
    }
    if ($l -match '^\[\[\s*dependencies\.["'']?([^\]"'']+)["'']?\s*\]\]') {
      $actual = [pscustomobject]@{ Owner = $Matches[1].ToLower(); Id = $null; Obligatoria = $true; Tipo = ''; Rango = ''; Lado = 'BOTH' }
      [void]$Deps.Add($actual); $seccion = 'dep'; continue
    }
    if ($l -match '^\[') { $actual = $null; $seccion = ''; continue }
    if (-not $actual) { continue }
    if ($l -match '^(\w+)\s*=\s*(.+)$') {
      $k = $Matches[1]; $v = $Matches[2].Trim()
      if ($v -match '^"([^"]*)"') { $v = $Matches[1] }
      elseif ($v -match "^'([^']*)'") { $v = $Matches[1] }
      else { $v = ($v -split '#')[0].Trim() }
      if ($seccion -eq 'mods') {
        if ($k -eq 'modId') { $actual.Id = $v.ToLower() }
        elseif ($k -eq 'version') {
          if ($v -match '\$\{') { $v = $versionJar }
          $actual.Version = $v
        }
      } else {
        switch ($k) {
          'modId'        { $actual.Id = $v.ToLower() }
          'mandatory'    { $actual.Obligatoria = ($v -eq 'true') }
          'type'         { $actual.Tipo = $v.ToLower(); $actual.Obligatoria = ($v -eq 'required') }
          'versionRange' { $actual.Rango = $v }
          'side'         { $actual.Lado = $v.ToUpper() }
        }
      }
    }
  }
}

function Get-PartesVersion([string]$V) {
  $partes = @()
  foreach ($s in ("$V" -split '[\.\-\+_]')) { if ($s -match '^\d+$') { $partes += [int64]$s } else { break } }
  return , $partes
}

function Compare-Version([string]$A, [string]$B) {
  $pa = Get-PartesVersion $A; $pb = Get-PartesVersion $B
  $n = [math]::Max($pa.Count, $pb.Count)
  for ($k = 0; $k -lt $n; $k++) {
    $x = 0; if ($k -lt $pa.Count) { $x = $pa[$k] }
    $y = 0; if ($k -lt $pb.Count) { $y = $pb[$k] }
    if ($x -lt $y) { return -1 }
    if ($x -gt $y) { return 1 }
  }
  return 0
}

# Rango estilo Maven, como lo usa Forge: [1.0,) (1.0,2.0] [1.0] ... Si no se entiende, se da por bueno.
function Test-Rango([string]$Ver, [string]$Rango) {
  if (-not $Rango) { return $true }
  if ($Rango -match 'NOT-COMPATIBLE') { return $false }
  if (-not $Ver -or (Get-PartesVersion $Ver).Count -eq 0) { return $true }
  $r = $Rango.Trim()
  if ($r -eq '*') { return $true }
  if ($r -match '^\[([^,\]]+)\]$') { return ((Compare-Version $Ver $Matches[1]) -eq 0) }
  if ($r -match '^([\[\(])\s*([^,]*?)\s*,\s*([^,]*?)\s*([\]\)])$') {
    $abre = $Matches[1]; $min = $Matches[2]; $max = $Matches[3]; $cierra = $Matches[4]
    if ($min) { $c = Compare-Version $Ver $min; if ($c -lt 0 -or ($c -eq 0 -and $abre -eq '(')) { return $false } }
    if ($max) { $c = Compare-Version $Ver $max; if ($c -gt 0 -or ($c -eq 0 -and $cierra -eq ')')) { return $false } }
  }
  return $true
}

# Devuelve el motivo si el mod (Info) choca con lo que ya hay en el pack; $null si esta todo bien
function Get-Problema($Info, $Versiones, $DepsPresentes) {
  $mios = @($Info.Mods | ForEach-Object { $_.Id })
  foreach ($m in $Info.Mods) {
    foreach ($d in $DepsPresentes) {
      if ($d.Id -ne $m.Id -or ($mios -contains $d.Owner)) { continue }
      if ($d.Tipo -eq 'incompatible' -or -not (Test-Rango $m.Version $d.Rango)) {
        return "el pack trae $($d.Owner), que lo marca como incompatible"
      }
    }
  }
  foreach ($d in $Info.Deps) {
    if (($mios -contains $d.Id) -or -not $Versiones.ContainsKey($d.Id)) { continue }
    $vp = $Versiones[$d.Id]
    if ($d.Tipo -eq 'incompatible' -or $d.Rango -match 'NOT-COMPATIBLE') { return "es incompatible con $($d.Id), que viene en el pack" }
    if (-not (Test-Rango $vp $d.Rango)) { return "necesita $($d.Id) $($d.Rango) y el pack trae la version $vp" }
  }
  return $null
}

function Test-Jar([string]$Ruta) {
  try { $z = [System.IO.Compression.ZipFile]::OpenRead($Ruta); $z.Dispose(); return $true } catch { return $false }
}

function Get-PrefijoArchivo([string]$Nombre) {
  # "Clumps-forge-1.20.1-12.0.jar" -> "clumps"
  return ($Nombre.ToLower() -replace '\.jar(\.disabled)?$', '' -split '[-_+ ]')[0]
}

# ---------- Resolucion de versiones ----------
function Get-ModrinthPick([string]$Proyecto) {
  $lv = [uri]::EscapeDataString('["' + $LOADER + '"]')
  $gv = [uri]::EscapeDataString('["' + $MC + '"]')
  $vers = ConvertTo-Lista (Invoke-Api "https://api.modrinth.com/v2/project/$Proyecto/version?loaders=$lv&game_versions=$gv")
  if ($vers.Count -eq 0) { return $null }
  $mejor = $null
  foreach ($v in $vers) { if ($v.version_type -eq 'release') { $mejor = $v; break } }
  if (-not $mejor) { $mejor = $vers[0] }
  $archivo = $null
  foreach ($f in $mejor.files) { if ($f.primary) { $archivo = $f; break } }
  if (-not $archivo) { $archivo = (ConvertTo-Lista $mejor.files)[0] }
  $deps = @()
  foreach ($d in $mejor.dependencies) {
    if ($d.dependency_type -ne 'required') { continue }
    $idDep = $d.project_id
    if (-not $idDep -and $d.version_id) { $idDep = (Invoke-Api "https://api.modrinth.com/v2/version/$($d.version_id)").project_id }
    if ($idDep -and ($deps -notcontains $idDep)) { $deps += $idDep }
  }
  return [pscustomobject]@{
    Archivo = $archivo.filename; Url = $archivo.url; Sha1 = $archivo.hashes.sha1
    Version = $mejor.version_number; DepIds = $deps
  }
}

function Get-CurseForgePick([string]$Slug, [string]$IdRespaldo, [string]$NombreRespaldo) {
  try {
    $c = Invoke-Api "https://api.cfwidget.com/minecraft/mc-mods/$Slug"
    $cands = @(foreach ($f in $c.files) { if (($f.versions -contains $MC) -and ($f.versions -contains 'Forge')) { $f } })
    if ($cands.Count -gt 0) {
      $rel = @($cands | Where-Object { $_.type -eq 'release' })
      if ($rel.Count -gt 0) { $cands = $rel }
      $f = $cands | Sort-Object { [datetime]$_.uploaded_at } -Descending | Select-Object -First 1
      return [pscustomobject]@{ Archivo = $f.name; IdArchivo = [int64]$f.id; Version = $f.name }
    }
  } catch { }
  if ($IdRespaldo) { return [pscustomobject]@{ Archivo = $NombreRespaldo; IdArchivo = [int64]$IdRespaldo; Version = "$NombreRespaldo (respaldo fijo)" } }
  return $null
}

function Get-UrlCurseForge([int64]$Id, [string]$Archivo) {
  return "https://mediafilez.forgecdn.net/files/$([math]::Floor($Id / 1000))/$($Id % 1000)/$([uri]::EscapeDataString($Archivo))"
}

function Save-EnCache($Item) {
  $destino = Join-Path $Cache $Item.Archivo
  if (Test-Path -LiteralPath $destino) {
    $ok = (Test-Jar $destino) -and ((-not $Item.Sha1) -or ((Get-FileHash -LiteralPath $destino -Algorithm SHA1).Hash -eq $Item.Sha1.ToUpper()))
    if ($ok) { return $destino }
    Remove-Item -LiteralPath $destino -Force
  }
  $tmp = "$destino.part"
  Invoke-WebRequest -Uri $Item.Url -OutFile $tmp -Headers $UA -UseBasicParsing -TimeoutSec 180
  if ($Item.Sha1 -and ((Get-FileHash -LiteralPath $tmp -Algorithm SHA1).Hash -ne $Item.Sha1.ToUpper())) {
    Remove-Item -LiteralPath $tmp -Force; throw "el archivo descargado no coincide con el hash de Modrinth"
  }
  if (-not (Test-Jar $tmp)) { Remove-Item -LiteralPath $tmp -Force; throw "lo descargado no es un .jar valido" }
  Move-Item -LiteralPath $tmp -Destination $destino -Force
  return $destino
}

# ---------- Instancias ----------
function Get-Instancias {
  if (-not (Test-Path -LiteralPath $CarpetaInstancias)) { throw "No encuentro la carpeta de instancias de CurseForge: $CarpetaInstancias" }
  $res = foreach ($d in (Get-ChildItem -LiteralPath $CarpetaInstancias -Directory)) {
    $json = Join-Path $d.FullName 'minecraftinstance.json'
    if (-not (Test-Path -LiteralPath $json)) { continue }
    try { $info = Get-Content -LiteralPath $json -Raw -Encoding UTF8 | ConvertFrom-Json } catch { continue }
    if ($info.gameVersion -ne $MC -or -not ("$($info.baseModLoader.name)" -like "$LOADER-*")) { continue }
    [pscustomobject]@{ Nombre = $d.Name; Ruta = $d.FullName; Fecha = (Get-Item -LiteralPath $json).LastWriteTime }
  }
  return @($res | Sort-Object Fecha -Descending)
}

function Select-Instancias($Lista, [string]$Accion) {
  if ($Lista.Count -eq 0) { throw "No hay packs Forge $MC en $CarpetaInstancias" }
  if ($Instancia) {
    $sel = @($Lista | Where-Object { $_.Nombre -eq $Instancia })
    if ($sel.Count -eq 0) { throw "No encuentro el pack '$Instancia' (o no es Forge $MC)" }
    return $sel
  }
  if ($Todas) { return $Lista }
  Escribir ''
  Escribir "Packs Forge $MC encontrados (el primero es el mas reciente):" 'Cyan'
  for ($i = 0; $i -lt $Lista.Count; $i++) {
    $n = @(Get-ChildItem -LiteralPath (Join-Path $Lista[$i].Ruta 'mods') -Filter *.jar -ErrorAction SilentlyContinue).Count
    Escribir ("  {0}) {1}   ({2} mods)" -f ($i + 1), $Lista[$i].Nombre, $n) 'White'
  }
  Escribir ''
  $r = Read-Host "Pack para $Accion [Enter = 1 | numeros separados por coma | T = todos]"
  $r = "$r".Trim()
  if ($r -eq '') { return , $Lista[0] }
  if ($r -match '^[tT]') { return $Lista }
  $sel = foreach ($p in ($r -split '[,; ]+')) {
    $k = 0
    if ([int]::TryParse($p, [ref]$k) -and $k -ge 1 -and $k -le $Lista.Count) { $Lista[$k - 1] }
  }
  $sel = @($sel)
  if ($sel.Count -eq 0) { throw "Opcion no valida: '$r'" }
  return $sel
}

# ---------- Modo quitar ----------
if ($Quitar) {
  foreach ($inst in (Select-Instancias (Get-Instancias) 'quitar los mods agregados')) {
    $reg = Join-Path $inst.Ruta $RegistroNombre
    Escribir ''
    Escribir "== $($inst.Nombre) ==" 'Cyan'
    if (-not (Test-Path -LiteralPath $reg)) { Escribir '  Este script no agrego nada a este pack.' 'Yellow'; continue }
    $carpetaMods = Join-Path $inst.Ruta 'mods'
    foreach ($a in (Get-Content -LiteralPath $reg | Where-Object { $_.Trim() })) {
      foreach ($cand in @((Join-Path $carpetaMods $a), (Join-Path $carpetaMods "$a.disabled"))) {
        if (Test-Path -LiteralPath $cand) {
          if ($Simular) { Escribir "  [simulacion] borraria $a" 'DarkYellow' }
          else { Remove-Item -LiteralPath $cand -Force; Escribir "  - $a" 'Green' }
        }
      }
    }
    if (-not $Simular) { Remove-Item -LiteralPath $reg -Force }
  }
  return
}

# ---------- Modo revisar ----------
if ($Revisar) {
  foreach ($inst in (Select-Instancias (Get-Instancias) 'revisar')) {
    Escribir ''
    Escribir "== $($inst.Nombre) ==" 'Cyan'
    $reg = Join-Path $inst.Ruta $RegistroNombre
    $nuestros = @(); if (Test-Path -LiteralPath $reg) { $nuestros = @(Get-Content -LiteralPath $reg) }
    $jars = @(Get-ChildItem -LiteralPath (Join-Path $inst.Ruta 'mods') -File -Filter *.jar)
    $infos = @{}; $versiones = @{}; $dueno = @{}
    foreach ($j in $jars) {
      $inf = Get-JarInfo $j.FullName; $infos[$j.Name] = $inf
      foreach ($m in $inf.Embebidos) { if (-not $versiones.ContainsKey($m.Id)) { $versiones[$m.Id] = $m.Version; $dueno[$m.Id] = $j.Name } }
      foreach ($m in $inf.Mods) { $versiones[$m.Id] = $m.Version; $dueno[$m.Id] = $j.Name }
    }
    $problemas = 0
    foreach ($j in $jars) {
      foreach ($d in $infos[$j.Name].Deps) {
        $msg = $null
        if ($versiones.ContainsKey($d.Id)) {
          if ($d.Tipo -eq 'incompatible' -or -not (Test-Rango $versiones[$d.Id] $d.Rango)) {
            $msg = "$($j.Name) no acepta $($dueno[$d.Id]) (pide $($d.Id) $($d.Rango))"
          }
        } elseif ($d.Obligatoria -and $d.Tipo -ne 'incompatible') {
          $msg = "$($j.Name) necesita $($d.Id) $($d.Rango) y no esta en el pack"
        }
        if ($msg) {
          $problemas++
          $marca = ''; if (($nuestros -contains $j.Name) -or ($nuestros -contains $dueno[$d.Id])) { $marca = '  <- agregado por este script' }
          Escribir "  ! $msg$marca" 'Red'
        }
      }
    }
    foreach ($g in $GruposEquivalentes) {
      $juntos = @($g | Where-Object { $versiones.ContainsKey($_) })
      if ($juntos.Count -gt 1) {
        $problemas++
        $archivos = @($juntos | ForEach-Object { $dueno[$_] })
        $marca = ''; if (@($archivos | Where-Object { $nuestros -contains $_ }).Count -gt 0) { $marca = '  <- agregado por este script' }
        Escribir "  ! Variantes del mismo mod juntas (chocan): $($archivos -join ' + ')$marca" 'Red'
      }
    }
    if ($problemas -eq 0) { Escribir "  Sin problemas: $($jars.Count) mods revisados." 'Green' }
  }
  return
}

# ---------- 1. Leer la lista ----------
if (-not (Test-Path -LiteralPath $ListaPath)) { throw "Falta el archivo mods.txt junto al script ($ListaPath)" }
$entradas = New-Object System.Collections.ArrayList
$porSlug = @{}
foreach ($linea in (Get-Content -LiteralPath $ListaPath -Encoding UTF8)) {
  $l = $linea.Trim()
  if (-not $l -or $l.StartsWith('#')) { continue }
  $p = @($l -split '\|' | ForEach-Object { $_.Trim() })
  if ($p.Count -lt 2) { continue }
  $fuente = $p[0].ToLower(); $slug = $p[1].ToLower()
  if ($fuente -notin @('modrinth', 'curseforge')) { Escribir "Linea ignorada (fuente desconocida): $l" 'Yellow'; continue }
  if ($porSlug.ContainsKey($slug)) { continue }
  $nombre = $slug; if ($p.Count -ge 3 -and $p[2]) { $nombre = $p[2] }
  $e = [pscustomobject]@{
    Fuente = $fuente; Slug = $slug; Nombre = $nombre; EsDependencia = $false; RequeridoPor = (New-Object System.Collections.ArrayList)
    IdRespaldo = $(if ($p.Count -ge 4) { $p[3] } else { '' }); ArchivoRespaldo = $(if ($p.Count -ge 5) { $p[4] } else { '' })
    Archivo = $null; Url = $null; Sha1 = $null; Version = $null; DepIds = @(); RutaCache = $null; ModIds = @(); Info = $null; Error = $null
  }
  [void]$entradas.Add($e); $porSlug[$slug] = $e
}

# ---------- 2. Buscar la ultima version de cada mod ----------
Escribir "Buscando la ultima version de cada mod para Forge $MC..." 'Cyan'
$idASlug = @{}
$slugsMr = @($entradas | Where-Object { $_.Fuente -eq 'modrinth' } | ForEach-Object { $_.Slug })
if ($slugsMr.Count -gt 0) {
  $q = [uri]::EscapeDataString('["' + ($slugsMr -join '","') + '"]')
  foreach ($pr in (ConvertTo-Lista (Invoke-Api "https://api.modrinth.com/v2/projects?ids=$q"))) {
    $idASlug[$pr.id] = $pr.slug.ToLower()
    if ($porSlug.ContainsKey($pr.slug.ToLower())) { $porSlug[$pr.slug.ToLower()] | Add-Member -NotePropertyName Id -NotePropertyValue $pr.id -Force }
  }
}

$i = 0
while ($i -lt $entradas.Count) {
  $e = $entradas[$i]; $i++
  try {
    if ($e.Fuente -eq 'modrinth') {
      $pick = Get-ModrinthPick $e.Slug
      if (-not $pick) { $e.Error = "no tiene version para Forge $MC"; continue }
      $e.Archivo = $pick.Archivo; $e.Url = $pick.Url; $e.Sha1 = $pick.Sha1; $e.Version = $pick.Version; $e.DepIds = $pick.DepIds
      foreach ($idDep in $pick.DepIds) {
        if (-not $idASlug.ContainsKey($idDep)) {
          $pr = Invoke-Api "https://api.modrinth.com/v2/project/$idDep"
          $idASlug[$idDep] = $pr.slug.ToLower()
          if (-not $porSlug.ContainsKey($pr.slug.ToLower()) -and ($NuncaComoDependencia -notcontains $pr.slug.ToLower())) {
            $nueva = [pscustomobject]@{
              Fuente = 'modrinth'; Slug = $pr.slug.ToLower(); Nombre = $pr.title; EsDependencia = $true; RequeridoPor = (New-Object System.Collections.ArrayList)
              IdRespaldo = ''; ArchivoRespaldo = ''; Archivo = $null; Url = $null; Sha1 = $null; Version = $null; DepIds = @(); RutaCache = $null; ModIds = @(); Info = $null; Error = $null
            }
            [void]$entradas.Add($nueva); $porSlug[$nueva.Slug] = $nueva
          }
        }
        $sDep = $idASlug[$idDep]
        if ($porSlug.ContainsKey($sDep)) { [void]$porSlug[$sDep].RequeridoPor.Add($e.Slug) }
      }
    } else {
      $pick = Get-CurseForgePick $e.Slug $e.IdRespaldo $e.ArchivoRespaldo
      if (-not $pick) { $e.Error = "no encontre archivo para Forge $MC en CurseForge"; continue }
      $e.Archivo = $pick.Archivo; $e.Version = $pick.Version; $e.Url = Get-UrlCurseForge $pick.IdArchivo $pick.Archivo
    }
  } catch { $e.Error = "error al consultar: $($_.Exception.Message)" }
}

# ---------- 3. Descargar (solo lo que no este ya en cache) ----------
New-Item -ItemType Directory -Force -Path $Cache | Out-Null
Escribir 'Descargando lo que falte en la cache...' 'Cyan'
foreach ($e in $entradas) {
  if ($e.Error) { continue }
  try {
    $e.RutaCache = Save-EnCache $e
    $e.Info = Get-JarInfo $e.RutaCache
    $e.ModIds = @($e.Info.Mods | ForEach-Object { $_.Id })
  } catch { $e.Error = "fallo la descarga: $($_.Exception.Message)" }
}
foreach ($e in ($entradas | Where-Object { $_.Error })) { Escribir "  ! $($e.Nombre): $($e.Error)" 'Red' }

# ---------- 4. Aplicar a cada pack ----------
foreach ($inst in (Select-Instancias (Get-Instancias) 'agregar los mods')) {
  Escribir ''
  Escribir "== $($inst.Nombre) ==" 'Cyan'
  $carpetaMods = Join-Path $inst.Ruta 'mods'
  New-Item -ItemType Directory -Force -Path $carpetaMods | Out-Null

  # Que trae ya el pack: mods (id -> version), lo que declaran (dependencias / incompatibles) y nombres de archivo
  $versiones = @{}
  $depsPresentes = New-Object System.Collections.ArrayList
  $prefijos = New-Object 'System.Collections.Generic.HashSet[string]'
  $tieneOptifine = $false
  foreach ($j in (Get-ChildItem -LiteralPath $carpetaMods -File | Where-Object { $_.Name -match '\.jar(\.disabled)?$' })) {
    $inf = Get-JarInfo $j.FullName
    foreach ($m in $inf.Embebidos) { if (-not $versiones.ContainsKey($m.Id)) { $versiones[$m.Id] = $m.Version } }
    foreach ($m in $inf.Mods) { $versiones[$m.Id] = $m.Version }
    if ($j.Name -match '\.jar$') { foreach ($d in $inf.Deps) { [void]$depsPresentes.Add($d) } }
    [void]$prefijos.Add((Get-PrefijoArchivo $j.Name))
    if ($j.Name -match 'optifine') { $tieneOptifine = $true }
  }

  # Conflictos conocidos que no siempre estan declarados en los jars
  $omitir = @{}
  if ($tieneOptifine) { foreach ($s in $FamiliaRender) { $omitir[$s] = 'el pack usa OptiFine (choca con Embeddium)' } }
  elseif ($versiones.ContainsKey('rubidium') -and -not $versiones.ContainsKey('embeddium')) { foreach ($s in $FamiliaRender) { $omitir[$s] = 'el pack usa Rubidium (choca con Embeddium)' } }
  foreach ($slugEq in $Equivalentes.Keys) {
    foreach ($x in $Equivalentes[$slugEq]) {
      if ($versiones.ContainsKey($x)) { $omitir[$slugEq] = "el pack ya trae $x, que hace lo mismo y choca con este" }
    }
  }

  $estado = @{}
  $agregados = New-Object System.Collections.ArrayList
  foreach ($e in $entradas) {
    if ($e.Error) { $estado[$e.Slug] = 'error'; continue }
    if ($omitir.ContainsKey($e.Slug)) { $estado[$e.Slug] = 'omitido'; Escribir "  ~ $($e.Nombre): omitido, $($omitir[$e.Slug])" 'Yellow'; continue }
    if ($e.EsDependencia) {
      $necesaria = $false
      foreach ($r in $e.RequeridoPor) { if ($estado[$r] -eq 'instalar') { $necesaria = $true } }
      if (-not $necesaria) { $estado[$e.Slug] = 'no-necesaria'; continue }
    }
    $yaEsta = $false
    if ($e.ModIds.Count -gt 0) { foreach ($id in $e.ModIds) { if ($versiones.ContainsKey($id)) { $yaEsta = $true } } }
    else { $yaEsta = $prefijos.Contains((Get-PrefijoArchivo $e.Archivo)) }
    if ($yaEsta) { $estado[$e.Slug] = 'ya'; Escribir "  = $($e.Nombre): ya viene en el pack" 'DarkGray'; continue }

    $problema = Get-Problema $e.Info $versiones $depsPresentes
    if ($problema) {
      $estado[$e.Slug] = 'omitido'
      $msg = "  ~ $($e.Nombre): omitido, $problema"
      if ($e.RequeridoPor.Count -gt 0) { $msg += " (ojo: lo necesita $($e.RequeridoPor -join ', '))" }
      Escribir $msg 'Yellow'; continue
    }

    $estado[$e.Slug] = 'instalar'
    $etiqueta = $e.Nombre; if ($e.EsDependencia) { $etiqueta = "$($e.Nombre) (dependencia)" }
    if ($Simular) { Escribir "  + [simulacion] $etiqueta -> $($e.Archivo)" 'DarkGreen' }
    else {
      Copy-Item -LiteralPath $e.RutaCache -Destination (Join-Path $carpetaMods $e.Archivo) -Force
      [void]$agregados.Add($e.Archivo)
      Escribir "  + $etiqueta -> $($e.Archivo)" 'Green'
    }
    foreach ($m in $e.Info.Embebidos) { if (-not $versiones.ContainsKey($m.Id)) { $versiones[$m.Id] = $m.Version } }
    foreach ($m in $e.Info.Mods) { $versiones[$m.Id] = $m.Version }
    foreach ($d in $e.Info.Deps) { [void]$depsPresentes.Add($d) }
    [void]$prefijos.Add((Get-PrefijoArchivo $e.Archivo))
  }

  if ($agregados.Count -gt 0) { Add-Content -LiteralPath (Join-Path $inst.Ruta $RegistroNombre) -Value $agregados -Encoding UTF8 }
  $nInst = @($estado.Values | Where-Object { $_ -eq 'instalar' }).Count
  $nYa = @($estado.Values | Where-Object { $_ -eq 'ya' }).Count
  $verbo = 'agregados'; if ($Simular) { $verbo = 'se agregarian' }
  Escribir ("  Resumen: {0} {1}, {2} ya venian en el pack." -f $nInst, $verbo, $nYa) 'White'
}
Escribir ''
Escribir 'Listo. Abre el pack en CurseForge y dale a Play.' 'Cyan'
