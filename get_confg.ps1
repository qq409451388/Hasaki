# 使用管理员运行可以获取

$query = "SELECT CommandLine FROM Win32_Process WHERE Name = 'LeagueClientUx.exe'"
$result = Get-WmiObject -Query $query

if ($result.CommandLine) {
    $cl = $result.CommandLine
    
    # 提取参数
    $appPort = [regex]::Match($cl, "--app-port=(\d+)").Groups[1].Value
    $authToken = [regex]::Match($cl, "--remoting-auth-token=([\w-]+)").Groups[1].Value
    $riotPort = [regex]::Match($cl, "--riotclient-app-port=(\d+)").Groups[1].Value
    $riotToken = [regex]::Match($cl, "--riotclient-auth-token=([\w-]+)").Groups[1].Value
    
    # 输出
    @{
        "MainClient" = @{
            Port = $appPort
            Token = $authToken
            Url = "https://127.0.0.1:$appPort"
        }
        "RiotClient" = @{
            Port = $riotPort
            Token = $riotToken
            Url = "https://127.0.0.1:$riotPort"
        }
    } | ConvertTo-Json
} else {
    Write-Host "客户端未运行或无法获取信息"
}