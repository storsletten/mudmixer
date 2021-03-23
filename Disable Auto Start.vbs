Dim FileSysObj
Dim ShellObj
Dim ShortcutFile
Set FileSysObj = CreateObject("Scripting.FileSystemObject")
Set ShellObj = CreateObject("WScript.Shell")
ShortcutFile = ShellObj.SpecialFolders("Startup") & + "\MUDMixer.lnk"

If FileSysObj.FileExists(ShortcutFile) Then
 FileSysObj.DeleteFile ShortcutFile
 MsgBox "Disabled auto start for MUDMixer.", 64, "MUDMixer"
Else
 MsgBox "Auto start for MUDMixer is already disabled.", 64, "MUDMixer"
End If
