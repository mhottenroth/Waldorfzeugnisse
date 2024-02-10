const {app, BrowserWindow, dialog, ipcMain, Menu, MenuItem} = require('electron')
const url = require('url')
const path = require('path')
const fs = require('fs')


function createWindow() { 
  window = new BrowserWindow(
    {
      // width: 800, // Default value. Not necessary to set this explicitly.
      // height: 600, // Default value. Not necessary to set this explicitly.
      icon: path.join(__dirname, './data/gui/images/favicon.png'),
      title: app.name + ", Version " + app.getVersion(),
      webPreferences: {
        preload: path.join(app.getAppPath(), 'preload.js'),
        nodeIntegration: true,
        contextIsolation: false
      }
    }
  )  
  window.loadFile('index.html')
  window.maximize()
  //window.openDevTools()

  window.on("ready-to-show",
    () => {
      loadOrCreateConfig()
      window.webContents.executeJavaScript(`document.getElementById("version").innerText = "V.` + app.getVersion() + `"`)
      window.webContents.executeJavaScript(`document.getElementById("programName").innerText = "` + app.name + `"`)
    }
  )
}


app.whenReady().then(
  () => {
    createWindow()
    const textAreaContextMenu = new Menu();
    textAreaContextMenu.append(
      new MenuItem(
        {
          label:'Paste',
          role:'paste'
        }
      )
    )
    textAreaContextMenu.append(
      new MenuItem(
        {
          label:'Copy',
          role:'copy'
        }
      )
    )

    window.webContents.on('context-menu',
      (e,params)=>{
        if (params.inputFieldType && params.inputFieldType == "plainText") {
          textAreaContextMenu.popup(window,params.x,params.y)
        }
      }
    )
  }
)


function loadOrCreateConfig(){
  // Check, if a config directory already exists.
  if (!fs.existsSync(app.getPath("userData"))) {
    fs.mkdirSync(app.getPath('userData'))
  }
  
  let configFilePath = path.join(app.getPath("userData"), "config.json")
  var sessionFilesPath = path.join(app.getAppPath().replace(/[^/]+$/, ""), "Sitzungen")
  var pdfOutputPath = path.join(app.getAppPath().replace(/[^/]+$/, ""), "Zeugnisse")
  
  fs.access(configFilePath,
    (err) => {
      console.log(configFilePath)
      if (err) {
        console.log('does not exist. Trying to create a default config file.')
        try {
          fs.writeFileSync(configFilePath, '{\n  "sessionFilesPath" : "' + sessionFilesPath + '",\n  "pdfOutputPath" : "' + pdfOutputPath + '"\n}', 'utf-8')
          try{
            fs.mkdirSync(sessionFilesPath)
          } catch(err) {
            console.log(sessionFilesPath + " already exists.")
          }
          try{
            fs.mkdirSync(pdfOutputPath)
          } catch(err){
            console.log(pdfOutputPath + " already exists.")
          }
          window.webContents.executeJavaScript(`document.getElementById("sessionFilesDirectory_input").value = "` + sessionFilesPath + `"`)
          window.webContents.executeJavaScript(`document.getElementById("pdfOutputDirectory_input").value = "` + pdfOutputPath + `"`)
          window.webContents.executeJavaScript(`updateSessionFilesList("", "` + sessionFilesPath + `")`)
        } catch(e) {
          console.log('Failed to save the file !')
        }
      } else {
        console.log('exists')
        let configContents = ""
        fs.readFile(configFilePath, 'utf-8',
          (err, data) => {
            if(err){
              console.log("An error ocurred reading the file! " + err.message);
              return;
            }
            let configContents = JSON.parse(data)
            console.log(data)
            sessionFilesPath_tmp = configContents.sessionFilesPath
            if (fs.existsSync(sessionFilesPath_tmp)){
              sessionFilesPath = sessionFilesPath_tmp
            }
            window.webContents.executeJavaScript(`document.getElementById("sessionFilesDirectory_input").value = "` + sessionFilesPath + `"`)
            pdfOutputPath_tmp = configContents.pdfOutputPath
            if (fs.existsSync(pdfOutputPath_tmp)){
              pdfOutputPath = pdfOutputPath_tmp
            }
            window.webContents.executeJavaScript(`document.getElementById("pdfOutputDirectory_input").value = "` + pdfOutputPath + `"`)
            window.webContents.executeJavaScript(`updateSessionFilesList("", "` + sessionFilesPath + `")`)
          }
        )
      }
    }
  )
}


function updateConfigFile(){
  let sessionFilesPath
  window.webContents.executeJavaScript(`document.getElementById("sessionFilesDirectory_input").value`).then(
    (result1) => {
      sessionFilesPath = result1
      let pdfOutputPath
      window.webContents.executeJavaScript(`document.getElementById("pdfOutputDirectory_input").value`).then(
        (result2) => {
          pdfOutputPath = result2
          let configFilePath = path.join(app.getPath("userData"), "config.json")
          fs.writeFileSync(configFilePath, '{\n  "sessionFilesPath" : "' + sessionFilesPath + '",\n  "pdfOutputPath" : "' + pdfOutputPath + '"\n}', 'utf-8')
        }
      )
    }
  )  
}


ipcMain.on('select-dirs',
  async (event, arg) => {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory']
    })
    let currentDir = window.webContents.executeJavaScript(`document.getElementById("sessionFilesDirectory_input").value`)
    if (result.filePaths.length > 0){
      window.webContents.executeJavaScript(`var a = document.getElementById("sessionFilesDirectory_input"); var a_old = a.value; a.value = "` + result.filePaths[0] + `"; updateSessionFilesList(a_old, a.value)`)
      updateConfigFile()
    }
  }
)


ipcMain.on('select-pdf-dir',
  async (event, arg) => {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory']
    })
    let currentDir = window.webContents.executeJavaScript(`document.getElementById("pdfOutputDirectory_input").value`)
    if (result.filePaths.length > 0){
      window.webContents.executeJavaScript(`var a = document.getElementById("pdfOutputDirectory_input"); var a_old = a.value; a.value = "` + result.filePaths[0] + `"`)
      updateConfigFile()
    }
  }
)


const child_process = require("child_process")
const os = require("os")

ipcMain.on('generate-pdf',
  async (event, arg) => {
    let logContents = 'document.getElementById("pdfGenerationLog").value'
    await window.webContents.executeJavaScript(logContents + `= ""`)

    let sessionsDir
    await window.webContents.executeJavaScript(`document.getElementById("sessionFilesDirectory_input").value`).then(
      (result) => {
        sessionsDir = result
      }
    )

    let workingDirectory = path.join(app.getPath("temp"), app.name)
    
    // A starting message for the user, noting the creation of directories.
    await window.webContents.executeJavaScript(logContents + ` += "Erzeuge symbolische Verknüpfungen unter ` + app.getPath("temp") + ` …"`)

    // Link a temorary working directory to the app’s backend data directory.
    try{
      fs.symlinkSync(path.join(app.getAppPath(), "data", "backend"), workingDirectory, "dir")    
    } catch (err) {
      fs.rmSync(workingDirectory)
      fs.symlinkSync(path.join(app.getAppPath(), "data", "backend"), workingDirectory, "dir")
      window.webContents.executeJavaScript(logContents + ` += "\\n    • Verzeichnis ` + workingDirectory + ` existiert bereits. Wird übersprungen."`)
    }

    // Link a temporary directory "temp" within the working directory to the user’s sessions directory.
    try{
      fs.symlinkSync(sessionsDir, path.join(workingDirectory, "temp"), "dir")
    } catch(err) {
      fs.rmSync(path.join(workingDirectory, "temp"))
      fs.symlinkSync(sessionsDir, path.join(workingDirectory, "temp"), "dir")
      window.webContents.executeJavaScript(logContents + ` += "\\n    • Verzeichnis ` + path.join(workingDirectory, "temp") + ` existiert bereits. Wird übersprungen."`)
    }
    
    // Get the user’s PDF output directory.
    let pdfOutputDirectory
    await window.webContents.executeJavaScript(`document.getElementById("pdfOutputDirectory_input").value`).then(
      (result) => {
        pdfOutputDirectory = result
      }
    )

    // Create the user’s PDF output directory.
    try{
      fs.mkdirSync(pdfOutputDirectory, {recursive: true})
      window.webContents.executeJavaScript(logContents + ` += "\\n    • Verzeichnis ` + pdfOutputDirectory + ` erstellt."`)
    } catch(err) {
      window.webContents.executeJavaScript(logContents + ` += "\\n    • Verzeichnis ` + pdfOutputDirectory + ` existiert bereits. Wird übersprungen."`)
    }

    let sessionFiles
    await window.webContents.executeJavaScript(`SESSIONFILES`).then(
      (result) => {
        sessionFiles = result
      }
    )
  
    for (i = 0; i < sessionFiles.length; i++){
      if (sessionFiles[i][0]){
        window.webContents.executeJavaScript(logContents + ` += "\\nVerarbeite Sitzung ` + sessionFiles[i][1] + ` …"`)
        window.webContents.executeJavaScript(logContents + ` += "\\n    • Erzeuge TeX-Dateien für ` + sessionFiles[i][1] + ` …"`)
        // Differentiate here to catch Windows OS.
        child_process.spawnSync(path.join(workingDirectory, "ulua", "lua"), [path.join(workingDirectory, "schoolCert.lua"), path.join(workingDirectory, "temp", sessionFiles[i][1])])
        
        var texFiles
        var _, _, texFiles = fs.readdirSync(path.join(workingDirectory, "temp"))
        
        for (f = 0; f < texFiles.length; f++){
          if (texFiles[f].match(/\.tex$/)){
            await window.webContents.executeJavaScript(logContents + ` += "\\n        • Erzeuge PDF-Datei für ` + texFiles[f].replace(/\.tex$/, "") + ` …"`)
            // Differentiate the path depending on the OS.
            let binaryPath
            switch (os.platform()){
              case "linux":
                binaryPath = path.join("x86_64-linux", "xelatex")
                break
              case "darwin":
                binaryPath = path.join("x86_64-darwin", "xelatex")
                break
              case "win32":
                binaryPath = path.join("win32", "xelatex.exe")
              default:
                binaryPath = ""
            }
            if (binaryPath != ""){
              let texToPDFProcess = child_process.spawnSync(path.join(workingDirectory, "TeX", "bin", binaryPath), ["--output-directory=" + pdfOutputDirectory, path.join(workingDirectory, "temp", texFiles[f])], {encoding: 'utf8'})
              if (texToPDFProcess.stderr){
                await window.webContents.executeJavaScript(logContents + ` += "\\n          Fehler! Für Details bitte Logdatei im PDF-Zielverzeichnis einsehen."`)
              } else {
                child_process.spawnSync(path.join(workingDirectory, "TeX", "bin", binaryPath), ["--output-directory=" + pdfOutputDirectory, path.join(workingDirectory, "temp", texFiles[f])], {encoding: 'utf8'})
                let certName = texFiles[f].replace(/\.tex$/, "")
                await window.webContents.executeJavaScript(logContents + ` += "\\n           Zeugnis für ` + certName + ` wurde erfolgreich erstellt."`)

                let deleteTeX
                await window.webContents.executeJavaScript(`document.getElementById("deleteTeX").checked`).then(
                  (result) => {
                    deleteTeX = result
                  }
                )
                if (deleteTeX){
                  fs.rmSync(path.join(workingDirectory, "temp", certName + ".tex"))
                } else {
                  fs.renameSync(path.join(workingDirectory, "temp", certName + ".tex"), path.join(pdfOutputDirectory, certName + ".tex"))
                }
                fs.rmSync(path.join(pdfOutputDirectory, certName + ".log"))
                fs.rmSync(path.join(pdfOutputDirectory, certName + ".aux"))
              }
            }
          }
        }
        await window.webContents.executeJavaScript(logContents + ` += "\\n\\nZeugniserstellung abgeschlossen."`)
      } else {
        window.webContents.executeJavaScript(logContents + ` += "\\nSitzung ` + sessionFiles[i][1] + ` wird nicht verarbeitet."`)
      }
    }
  }
)
